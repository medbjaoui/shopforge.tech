import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanType, PlatformRevenueType } from '@prisma/client';

@Injectable()
export class PlatformRevenueService {
  private readonly logger = new Logger(PlatformRevenueService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Enregistre une commission comme revenu plateforme
   * Appelé automatiquement quand une commande est DELIVERED
   */
  async recordCommission(
    tenantId: string,
    orderId: string,
    amount: number,
    plan: PlanType,
  ) {
    // Vérifier si déjà enregistré
    const existing = await this.prisma.platformRevenue.findUnique({
      where: { orderId },
    });
    if (existing) {
      this.logger.warn(`Commission déjà enregistrée pour order ${orderId}`);
      return existing;
    }

    return this.prisma.platformRevenue.create({
      data: {
        type: PlatformRevenueType.COMMISSION,
        tenantId,
        orderId,
        amount,
        note: `Commission ${plan} - ${(amount * 100).toFixed(1)}%`,
      },
    });
  }

  /**
   * Enregistre le paiement d'un abonnement mensuel
   * Appelé par le cron job le 1er de chaque mois
   */
  async recordSubscription(
    tenantId: string,
    amount: number,
    plan: PlanType,
    period: string, // Format: 'YYYY-MM'
  ) {
    // Vérifier si déjà facturé pour cette période
    const existing = await this.prisma.platformRevenue.findFirst({
      where: {
        tenantId,
        type: PlatformRevenueType.SUBSCRIPTION,
        period,
      },
    });

    if (existing) {
      this.logger.warn(`Abonnement déjà facturé pour ${tenantId} - ${period}`);
      return existing;
    }

    return this.prisma.platformRevenue.create({
      data: {
        type: PlatformRevenueType.SUBSCRIPTION,
        tenantId,
        amount,
        plan,
        period,
        note: `Abonnement ${plan} - ${period}`,
      },
    });
  }

  /**
   * Annule un revenu de commission (si commande remboursée)
   */
  async refundCommission(orderId: string) {
    const revenue = await this.prisma.platformRevenue.findUnique({
      where: { orderId },
    });

    if (!revenue) {
      this.logger.warn(`Aucun revenu trouvé pour order ${orderId}`);
      return null;
    }

    // Supprimer l'enregistrement de revenu
    await this.prisma.platformRevenue.delete({
      where: { orderId },
    });

    this.logger.log(`Commission remboursée pour order ${orderId}: -${revenue.amount} TND`);
    return revenue;
  }

  /**
   * Obtenir le CA total de la plateforme
   */
  async getTotalRevenue() {
    const result = await this.prisma.platformRevenue.aggregate({
      _sum: { amount: true },
      _count: { id: true },
    });

    return {
      totalRevenue: Number(result._sum.amount ?? 0),
      totalTransactions: result._count.id,
    };
  }

  /**
   * Obtenir le CA par type (commissions vs subscriptions)
   */
  async getRevenueByType() {
    const results = await this.prisma.platformRevenue.groupBy({
      by: ['type'],
      _sum: { amount: true },
      _count: { id: true },
    });

    return results.map((r) => ({
      type: r.type,
      totalRevenue: Number(r._sum.amount ?? 0),
      count: r._count.id,
    }));
  }

  /**
   * Obtenir le MRR (Monthly Recurring Revenue)
   * Calculé sur le mois en cours
   */
  async getMRR() {
    const now = new Date();
    const currentPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const result = await this.prisma.platformRevenue.aggregate({
      where: {
        type: PlatformRevenueType.SUBSCRIPTION,
        period: currentPeriod,
      },
      _sum: { amount: true },
      _count: { id: true },
    });

    return {
      mrr: Number(result._sum.amount ?? 0),
      activeSubscriptions: result._count.id,
      period: currentPeriod,
    };
  }

  /**
   * Obtenir le CA mensuel (commissions + subscriptions)
   */
  async getMonthlyRevenue(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const [commissions, subscriptions] = await Promise.all([
      this.prisma.platformRevenue.aggregate({
        where: {
          type: PlatformRevenueType.COMMISSION,
          createdAt: { gte: startDate, lt: endDate },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.platformRevenue.aggregate({
        where: {
          type: PlatformRevenueType.SUBSCRIPTION,
          period: `${year}-${String(month).padStart(2, '0')}`,
        },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      commissions: Number(commissions._sum.amount ?? 0),
      commissionsCount: commissions._count.id,
      subscriptions: Number(subscriptions._sum.amount ?? 0),
      subscriptionsCount: subscriptions._count.id,
      totalRevenue: Number(commissions._sum.amount ?? 0) + Number(subscriptions._sum.amount ?? 0),
    };
  }

  /**
   * Obtenir l'évolution du CA sur N mois
   */
  async getRevenueHistory(months = 12) {
    const history: Array<{
      period: string;
      commissions: number;
      commissionsCount: number;
      subscriptions: number;
      subscriptionsCount: number;
      totalRevenue: number;
    }> = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;

      const data = await this.getMonthlyRevenue(year, month);
      history.push(data);
    }

    return history;
  }

  /**
   * Dashboard admin - Résumé complet
   */
  async getAdminSummary() {
    const [total, byType, mrr, thisMonth] = await Promise.all([
      this.getTotalRevenue(),
      this.getRevenueByType(),
      this.getMRR(),
      this.getMonthlyRevenue(new Date().getFullYear(), new Date().getMonth() + 1),
    ]);

    // Calculer l'ARR (Annual Recurring Revenue) = MRR × 12
    const arr = mrr.mrr * 12;

    return {
      totalRevenue: total.totalRevenue,
      totalTransactions: total.totalTransactions,
      revenueByType: byType,
      mrr: mrr.mrr,
      arr,
      activeSubscriptions: mrr.activeSubscriptions,
      thisMonth,
    };
  }
}
