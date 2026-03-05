import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { isUnlimited, getDynamicPlanLimits } from '../../common/billing/plan-limits';
import { isValidMF } from '../../common/fiscal/invoice-utils';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TenantsService {
  constructor(
    private prisma: PrismaService,
    private config: PlatformConfigService,
  ) {}

  // Public : appelé par le SSR de la vitrine
  async getPublic(slug: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug, isActive: true },
      select: {
        id: true, name: true, slug: true,
        description: true, logo: true, phone: true, whatsapp: true, address: true,
        contactEmail: true, shippingFee: true, freeShippingThreshold: true,
        returnPolicy: true, codEnabled: true, bankTransferEnabled: true, bankTransferDetails: true,
        clickToPayEnabled: true, floussiEnabled: true,
        theme: true, isPublished: true,
        // Informations legales
        matriculeFiscal: true, rne: true, legalName: true, legalAddress: true,
        // Customisation avancée
        bannerImage: true, instagram: true, facebook: true, tiktok: true,
        announcementText: true, announcementEnabled: true,
        announcementBgColor: true, announcementTextColor: true,
        heroTitle: true, heroSubtitle: true, heroCta: true,
        favicon: true, font: true,
        // Meta integration
        metaPixelId: true, metaIntegrationEnabled: true, whatsappWidgetEnabled: true,
        // Langue
        storeLanguage: true,
      },
    });
    if (!tenant) throw new NotFoundException('Store introuvable');
    return {
      ...tenant,
      aiChatbotEnabled: this.config.getBool('ai_enabled') && this.config.getBool('ai_feature_chatbot', true),
    };
  }

  async getMe(tenantId: string) {
    return this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true, name: true, slug: true, plan: true, isActive: true,
        description: true, logo: true, phone: true, whatsapp: true, address: true,
        contactEmail: true, shippingFee: true, freeShippingThreshold: true,
        returnPolicy: true, codEnabled: true, bankTransferEnabled: true, bankTransferDetails: true,
        clickToPayEnabled: true, floussiEnabled: true,
        theme: true, onboardingCompleted: true, isPublished: true,
        matriculeFiscal: true, rne: true, legalName: true, legalAddress: true,
        // Customisation avancée
        bannerImage: true, instagram: true, facebook: true, tiktok: true,
        announcementText: true, announcementEnabled: true,
        announcementBgColor: true, announcementTextColor: true,
        heroTitle: true, heroSubtitle: true, heroCta: true,
        favicon: true, font: true,
        // Notifications
        notificationChannel: true,
        telegramChatId: true,
        // Meta integration
        metaPixelId: true, metaAccessToken: true,
        metaIntegrationEnabled: true, whatsappWidgetEnabled: true,
        // Langue + parrainage
        storeLanguage: true,
        referralCode: true,
        createdAt: true,
        _count: { select: { products: true, orders: true, users: true } },
      },
    });
  }

  async findByDomain(domain: string): Promise<{ slug: string } | null> {
    return this.prisma.tenant.findFirst({
      where: { domain: domain.toLowerCase().trim(), isActive: true, isPublished: true },
      select: { slug: true },
    });
  }

  async getUsage(tenantId: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const allLimits = getDynamicPlanLimits(this.config);
    const limits = allLimits[tenant.plan];

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [productCount, ordersThisMonth, aiUsageCount] = await Promise.all([
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.order.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      this.prisma.aiUsage.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
    ]);

    const aiEnabled = this.config.getBool('ai_enabled');
    const aiLimit = this.config.getNumber(`ai_${tenant.plan.toLowerCase()}_monthly_limit`, 0);

    return {
      plan: tenant.plan,
      planLabel: limits.label,
      priceMonthly: limits.priceMonthly,
      usage: {
        products: {
          used: productCount,
          limit: limits.maxProducts,
          unlimited: isUnlimited(limits.maxProducts),
        },
        ordersThisMonth: {
          used: ordersThisMonth,
          limit: limits.maxOrdersPerMonth,
          unlimited: isUnlimited(limits.maxOrdersPerMonth),
        },
      },
      ai: {
        enabled: aiEnabled,
        monthlyUsed: aiUsageCount,
        monthlyLimit: aiLimit,
      },
      availablePlans: Object.entries(allLimits).map(([key, val]) => ({
        key,
        label: val.label,
        priceMonthly: val.priceMonthly,
        maxProducts: val.maxProducts,
        maxOrdersPerMonth: val.maxOrdersPerMonth,
        isCurrent: key === tenant.plan,
      })),
    };
  }

  async getMyReferral(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { referralCode: true, slug: true },
    });
    if (!tenant) throw new Error('Tenant introuvable');

    const [referrals, pendingRewards, paidRewards] = await Promise.all([
      this.prisma.tenant.findMany({
        where: { referredById: tenantId },
        select: { id: true, name: true, slug: true, plan: true, createdAt: true, activatedAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referralReward.count({ where: { referrerId: tenantId, status: 'PENDING' } }),
      this.prisma.referralReward.findMany({
        where: { referrerId: tenantId, status: 'PAID' },
        select: { amount: true, paidAt: true },
      }),
    ]);

    const totalEarned = paidRewards.reduce((acc, r) => acc + Number(r.amount), 0);
    const rewardAmount = 10; // TND

    return {
      referralCode: tenant.referralCode,
      referralLink: `https://shopforge.tech/register?ref=${tenant.referralCode}`,
      rewardAmount,
      referrals: referrals.map((r) => ({
        ...r,
        isActivated: !!r.activatedAt,
      })),
      stats: {
        total: referrals.length,
        activated: referrals.filter((r) => r.activatedAt).length,
        pending: pendingRewards,
        paid: paidRewards.length,
        totalEarned,
      },
    };
  }

  async update(tenantId: string, data: {
    name?: string; description?: string; logo?: string;
    phone?: string; whatsapp?: string; address?: string; contactEmail?: string;
    shippingFee?: number; freeShippingThreshold?: number; returnPolicy?: string;
    codEnabled?: boolean; bankTransferEnabled?: boolean; bankTransferDetails?: string;
    clickToPayEnabled?: boolean; floussiEnabled?: boolean;
    theme?: string;
    matriculeFiscal?: string;
    rne?: string;
    legalName?: string;
    legalAddress?: string;
    // Customisation avancée
    bannerImage?: string; instagram?: string; facebook?: string; tiktok?: string;
    announcementText?: string; announcementEnabled?: boolean;
    announcementBgColor?: string; announcementTextColor?: string;
    heroTitle?: string; heroSubtitle?: string; heroCta?: string;
    favicon?: string; font?: string;
    // Notifications
    notificationChannel?: string;
    // Langue boutique
    storeLanguage?: string;
  }) {
    if (data.matriculeFiscal && !isValidMF(data.matriculeFiscal)) {
      throw new BadRequestException(
        'Format matricule fiscal invalide. Exemple : 1234567/A/B/C/000',
      );
    }
    return this.prisma.tenant.update({ where: { id: tenantId }, data });
  }

  async generateTelegramLinkCode(tenantId: string): Promise<{ code: string; expiresAt: Date }> {
    const code = randomBytes(3).toString('hex').toUpperCase(); // ex: A3F7C2
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000);
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { telegramLinkCode: code, telegramLinkExpiry: expiresAt },
    });
    return { code, expiresAt };
  }

  async connectTelegramFromWebhook(code: string, chatId: string): Promise<string | null> {
    const tenant = await this.prisma.tenant.findFirst({
      where: { telegramLinkCode: code, telegramLinkExpiry: { gt: new Date() } },
      select: { id: true, name: true },
    });
    if (!tenant) return null;
    await this.prisma.tenant.update({
      where: { id: tenant.id },
      data: { telegramChatId: chatId, telegramLinkCode: null, telegramLinkExpiry: null },
    });
    return tenant.name;
  }

  async disconnectTelegram(tenantId: string): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { telegramChatId: null, notificationChannel: 'EMAIL', telegramLinkCode: null, telegramLinkExpiry: null },
    });
  }

  async completeOnboarding(tenantId: string, data: {
    name?: string; description?: string; logo?: string; theme?: string; plan?: string;
  }) {
    const updateData: Record<string, any> = {
      onboardingCompleted: true,
      // isPublished reste false — auto-publié quand le 1er produit est ajouté
    };
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.logo !== undefined) updateData.logo = data.logo;
    if (data.theme) updateData.theme = data.theme;
    if (data.plan && ['FREE', 'STARTER', 'PRO'].includes(data.plan)) updateData.plan = data.plan;

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateData,
      select: {
        id: true, name: true, slug: true,
        theme: true, plan: true, onboardingCompleted: true, isPublished: true,
      },
    });
  }
}
