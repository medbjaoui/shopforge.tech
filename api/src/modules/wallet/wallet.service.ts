import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { getDynamicCommissionRate } from '../../common/billing/plan-limits';
import { PlanType, WalletTxType, CommissionStatus } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(
    private prisma: PrismaService,
    private platformConfig: PlatformConfigService,
  ) {}

  /** Crée le wallet si inexistant, retourne le wallet existant sinon */
  async getOrCreateWallet(tenantId: string) {
    const existing = await this.prisma.tenantWallet.findUnique({ where: { tenantId } });
    if (existing) return existing;
    return this.prisma.tenantWallet.create({ data: { tenantId } });
  }

  /** Retourne le wallet + les 20 dernières transactions */
  async getWallet(tenantId: string) {
    const wallet = await this.getOrCreateWallet(tenantId);
    const transactions = await this.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const commissions = await this.prisma.commissionRecord.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    return {
      balance: Number(wallet.balance),
      totalTopup: Number(wallet.totalTopup),
      totalCommission: Number(wallet.totalCommission),
      minimumBalance: Number(wallet.minimumBalance),
      transactions,
      recentCommissions: commissions,
    };
  }

  /** Transactions paginées */
  async getTransactions(tenantId: string, page = 1, limit = 20) {
    const wallet = await this.getOrCreateWallet(tenantId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { walletId: wallet.id } }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /** Admin : crédite le wallet d'un tenant */
  async topup(tenantId: string, amount: number, note?: string) {
    if (amount <= 0) throw new BadRequestException('Le montant doit être positif');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant introuvable');

    const wallet = await this.getOrCreateWallet(tenantId);
    const before = Number(wallet.balance);
    const after = before + amount;

    await this.prisma.$transaction([
      this.prisma.tenantWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
          totalTopup: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxType.TOPUP,
          amount,
          balanceBefore: before,
          balanceAfter: after,
          description: note ?? `Rechargement wallet — ${new Date().toLocaleDateString('fr-TN')}`,
        },
      }),
    ]);

    return { success: true, newBalance: after };
  }

  /** Déduit la commission sur une commande DELIVERED */
  async deductCommission(tenantId: string, orderId: string, orderAmount: number, plan: PlanType) {
    const rate = getDynamicCommissionRate(plan, this.platformConfig);
    const commissionAmount = Math.round(orderAmount * rate * 1000) / 1000; // 3 décimales

    if (commissionAmount <= 0) return; // plan sans commission (ex: SCALE futur)

    // Vérifier si déjà calculée
    const existing = await this.prisma.commissionRecord.findUnique({ where: { orderId } });
    if (existing) return;

    const wallet = await this.getOrCreateWallet(tenantId);
    const before = Number(wallet.balance);
    const after = before - commissionAmount;

    await this.prisma.$transaction([
      this.prisma.tenantWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { decrement: commissionAmount },
          totalCommission: { increment: commissionAmount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxType.COMMISSION,
          amount: commissionAmount,
          balanceBefore: before,
          balanceAfter: after,
          description: `Commission ${(rate * 100).toFixed(1)}% — Commande #${orderId.slice(-8).toUpperCase()}`,
          reference: orderId,
        },
      }),
      this.prisma.commissionRecord.create({
        data: {
          tenantId,
          walletId: wallet.id,
          orderId,
          orderAmount,
          commissionRate: rate,
          commissionAmount,
          status: CommissionStatus.COLLECTED,
        },
      }),
    ]);
  }

  /** Rembourse la commission si commande retournée */
  async refundCommission(tenantId: string, orderId: string) {
    const record = await this.prisma.commissionRecord.findUnique({ where: { orderId } });
    if (!record || record.status !== CommissionStatus.COLLECTED) return;

    const wallet = await this.getOrCreateWallet(tenantId);
    const before = Number(wallet.balance);
    const refundAmount = Number(record.commissionAmount);
    const after = before + refundAmount;

    await this.prisma.$transaction([
      this.prisma.tenantWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: refundAmount },
          totalCommission: { decrement: refundAmount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxType.REFUND,
          amount: refundAmount,
          balanceBefore: before,
          balanceAfter: after,
          description: `Remboursement commission — Commande #${orderId.slice(-8).toUpperCase()}`,
          reference: orderId,
        },
      }),
      this.prisma.commissionRecord.update({
        where: { orderId },
        data: { status: CommissionStatus.REFUNDED },
      }),
    ]);
  }

  /** Vérifie si le wallet a suffisamment de solde pour accepter des commandes */
  async canAcceptOrders(tenantId: string): Promise<boolean> {
    const blockEnabled = this.platformConfig.getBool('wallet_block_on_low_balance', true);
    if (!blockEnabled) return true;

    const wallet = await this.prisma.tenantWallet.findUnique({ where: { tenantId } });
    if (!wallet) return true; // Premier wallet → pas encore de solde requis

    const minimum = this.platformConfig.getNumber('wallet_minimum_balance', 10);
    return Number(wallet.balance) >= minimum;
  }

  // ─── Admin ──────────────────────────────────────────────────────────────────

  /** Résumé de tous les wallets pour le super admin */
  async getAllWallets(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [wallets, total] = await Promise.all([
      this.prisma.tenantWallet.findMany({
        include: { tenant: { select: { name: true, slug: true, plan: true } } },
        orderBy: { balance: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.tenantWallet.count(),
    ]);

    const totalCommissions = await this.prisma.tenantWallet.aggregate({
      _sum: { totalCommission: true },
    });

    return {
      data: wallets.map((w) => ({
        tenantId: w.tenantId,
        tenantName: w.tenant.name,
        tenantSlug: w.tenant.slug,
        plan: w.tenant.plan,
        balance: Number(w.balance),
        totalTopup: Number(w.totalTopup),
        totalCommission: Number(w.totalCommission),
        minimumBalance: Number(w.minimumBalance),
        isLow: Number(w.balance) < Number(w.minimumBalance),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      platformTotalCommissions: Number(totalCommissions._sum.totalCommission ?? 0),
    };
  }

  // ─── Solde bienvenu ──────────────────────────────────────────────────────────

  /** Crédite le solde de bienvenu lors de l'inscription d'un nouveau tenant */
  async initWelcomeCredit(tenantId: string) {
    const welcomeAmount = this.platformConfig.getNumber('wallet_welcome_balance', 15);
    const minimumBalance = this.platformConfig.getNumber('wallet_minimum_balance', 10);
    // Garantir que le solde initial est toujours au-dessus du minimum + 5 TND de marge
    // Évite le blocage immédiat dès l'inscription
    const creditAmount = Math.max(welcomeAmount, minimumBalance + 5);
    if (creditAmount <= 0) return;

    const wallet = await this.getOrCreateWallet(tenantId);
    const before = Number(wallet.balance);
    const after = before + creditAmount;

    await this.prisma.$transaction([
      this.prisma.tenantWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: creditAmount },
          totalTopup: { increment: creditAmount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxType.WELCOME,
          amount: creditAmount,
          balanceBefore: before,
          balanceAfter: after,
          description: `Solde de bienvenu ShopForge — ${creditAmount} TND offerts`,
        },
      }),
    ]);
  }

  // ─── Codes promo ─────────────────────────────────────────────────────────────

  /** Utilise un code promo pour créditer le wallet du marchand */
  async redeemCode(tenantId: string, code: string) {
    const creditCode = await this.prisma.creditCode.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!creditCode) throw new NotFoundException('Code invalide ou inexistant');
    if (!creditCode.isActive) throw new BadRequestException('Ce code est désactivé');
    if (creditCode.expiresAt && new Date(creditCode.expiresAt) < new Date())
      throw new BadRequestException('Ce code a expiré');
    if (creditCode.maxUses > 0 && creditCode.usedCount >= creditCode.maxUses)
      throw new BadRequestException("Ce code a atteint sa limite d'utilisations");

    // Vérifier si ce tenant a déjà utilisé ce code
    const alreadyUsed = await this.prisma.creditCodeUsage.findUnique({
      where: { creditCodeId_tenantId: { creditCodeId: creditCode.id, tenantId } },
    });
    if (alreadyUsed) throw new BadRequestException('Vous avez déjà utilisé ce code');

    const wallet = await this.getOrCreateWallet(tenantId);
    const before = Number(wallet.balance);
    const amount = Number(creditCode.amount);
    const after = before + amount;

    await this.prisma.$transaction([
      this.prisma.creditCode.update({
        where: { id: creditCode.id },
        data: { usedCount: { increment: 1 } },
      }),
      this.prisma.creditCodeUsage.create({
        data: { creditCodeId: creditCode.id, tenantId, amount },
      }),
      this.prisma.tenantWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: amount },
          totalTopup: { increment: amount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: WalletTxType.REDEEM,
          amount,
          balanceBefore: before,
          balanceAfter: after,
          description: creditCode.note
            ? `Code promo : ${creditCode.code} — ${creditCode.note}`
            : `Code promo utilisé : ${creditCode.code}`,
          reference: creditCode.id,
        },
      }),
    ]);

    return { success: true, amount, newBalance: after };
  }

  /** Admin — crée un code promo avec un montant */
  async createCreditCode(amount: number, note?: string, customCode?: string, maxUses = 1, expiresAt?: string) {
    if (amount <= 0) throw new BadRequestException('Le montant doit être positif');
    const code = customCode
      ? customCode.trim().toUpperCase()
      : this.generateCode();
    return this.prisma.creditCode.create({
      data: {
        code,
        amount,
        note,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
  }

  /** Admin — liste les codes promo */
  async getCreditCodes(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.creditCode.findMany({
        include: {
          usages: {
            include: { tenant: { select: { name: true, slug: true } } },
            orderBy: { usedAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.creditCode.count(),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /** Admin — désactive un code promo */
  async deactivateCreditCode(id: string) {
    const code = await this.prisma.creditCode.findUnique({ where: { id } });
    if (!code) throw new NotFoundException('Code introuvable');
    return this.prisma.creditCode.update({ where: { id }, data: { isActive: false } });
  }

  private generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
}
