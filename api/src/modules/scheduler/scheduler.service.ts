import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { PlatformRevenueService } from '../platform-revenue/platform-revenue.service';
import { WalletService } from '../wallet/wallet.service';
import { getDynamicPlanLimits, isUnlimited, PLAN_LIMITS } from '../../common/billing/plan-limits';
import { PlanType, WalletTxType } from '@prisma/client';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private config: PlatformConfigService,
    private analyticsService: AnalyticsService,
    private platformRevenue: PlatformRevenueService,
    private walletService: WalletService,
  ) {}

  /**
   * Job 1 — Résumé hebdomadaire marchands (Lundi 8h)
   */
  @Cron('0 8 * * 1', { name: 'weekly-merchant-reports' })
  async sendWeeklyReports(): Promise<void> {
    this.logger.log('Cron: sendWeeklyReports start');

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    const prevWeekStart = new Date(weekStart);
    prevWeekStart.setDate(weekStart.getDate() - 7);

    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, slug: true,
        users: { where: { role: 'OWNER' }, select: { email: true, firstName: true }, take: 1 },
        contactEmail: true,
      },
    });

    for (const tenant of tenants) {
      try {
        const orders = await this.prisma.order.findMany({
          where: {
            tenantId: tenant.id,
            status: 'DELIVERED',
            updatedAt: { gte: weekStart },
          },
          select: {
            totalAmount: true,
            items: { select: { productId: true, quantity: true, product: { select: { name: true } } } },
          },
        });

        if (orders.length === 0) continue;

        const revenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);

        // Produit star
        const productSales: Record<string, { name: string; qty: number }> = {};
        for (const o of orders) {
          for (const item of o.items) {
            const key = item.productId;
            if (!productSales[key]) productSales[key] = { name: item.product?.name ?? 'Produit', qty: 0 };
            productSales[key].qty += item.quantity;
          }
        }
        const topProduct = Object.values(productSales).sort((a, b) => b.qty - a.qty)[0]?.name;

        // Semaine précédente
        const prevOrders = await this.prisma.order.count({
          where: { tenantId: tenant.id, status: 'DELIVERED', updatedAt: { gte: prevWeekStart, lt: weekStart } },
        });

        const ownerEmail = tenant.contactEmail ?? tenant.users[0]?.email;
        const ownerFirstName = tenant.users[0]?.firstName ?? 'Marchand';

        if (ownerEmail) {
          await this.emailService.sendWeeklyReport(ownerEmail, ownerFirstName, tenant.name, {
            orders: orders.length,
            revenue,
            topProduct,
            prevOrders,
          });
        }
      } catch (err) {
        this.logger.error(`Weekly report failed for tenant ${tenant.slug}: ${err}`);
      }
    }

    this.logger.log('Cron: sendWeeklyReports done');
  }

  /**
   * Job 2 — Alerte limite plan à 80% (quotidien 9h)
   */
  @Cron('0 9 * * *', { name: 'plan-limit-alerts' })
  async checkPlanLimits(): Promise<void> {
    this.logger.log('Cron: checkPlanLimits start');

    const limits = getDynamicPlanLimits(this.config);
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    // Alerte max 1x par semaine par tenant/type
    const alertCooldownMs = 7 * 24 * 60 * 60 * 1000;
    const alertKey = (tenantId: string, type: string) => `plan_alert_${tenantId}_${type}`;

    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true, plan: { in: ['FREE', 'STARTER'] } },
      select: {
        id: true, name: true, plan: true,
        users: { where: { role: 'OWNER' }, select: { email: true, firstName: true }, take: 1 },
        contactEmail: true,
      },
    });

    for (const tenant of tenants) {
      try {
        const planLimits = limits[tenant.plan];
        const ownerEmail = tenant.contactEmail ?? tenant.users[0]?.email;
        if (!ownerEmail) continue;
        const firstName = tenant.users[0]?.firstName ?? 'Marchand';

        // Check products
        if (!isUnlimited(planLimits.maxProducts)) {
          const productCount = await this.prisma.product.count({ where: { tenantId: tenant.id } });
          if (productCount >= planLimits.maxProducts * 0.8) {
            const lastAlertKey = alertKey(tenant.id, 'products');
            const lastAlert = await this.prisma.platformConfig.findUnique({ where: { key: lastAlertKey } });
            const lastAlertAt = lastAlert ? new Date(lastAlert.value) : null;
            if (!lastAlertAt || Date.now() - lastAlertAt.getTime() > alertCooldownMs) {
              await this.emailService.sendPlanLimitWarning(ownerEmail, firstName, 'products', productCount, planLimits.maxProducts);
              await this.prisma.platformConfig.upsert({
                where: { key: lastAlertKey },
                update: { value: new Date().toISOString() },
                create: { key: lastAlertKey, value: new Date().toISOString(), group: 'internal' },
              });
            }
          }
        }

        // Check orders this month
        if (!isUnlimited(planLimits.maxOrdersPerMonth)) {
          const orderCount = await this.prisma.order.count({
            where: { tenantId: tenant.id, createdAt: { gte: monthStart } },
          });
          if (orderCount >= planLimits.maxOrdersPerMonth * 0.8) {
            const lastAlertKey = alertKey(tenant.id, 'orders');
            const lastAlert = await this.prisma.platformConfig.findUnique({ where: { key: lastAlertKey } });
            const lastAlertAt = lastAlert ? new Date(lastAlert.value) : null;
            if (!lastAlertAt || Date.now() - lastAlertAt.getTime() > alertCooldownMs) {
              await this.emailService.sendPlanLimitWarning(ownerEmail, firstName, 'orders', orderCount, planLimits.maxOrdersPerMonth);
              await this.prisma.platformConfig.upsert({
                where: { key: lastAlertKey },
                update: { value: new Date().toISOString() },
                create: { key: lastAlertKey, value: new Date().toISOString(), group: 'internal' },
              });
            }
          }
        }
      } catch (err) {
        this.logger.error(`Plan limit check failed for tenant ${tenant.id}: ${err}`);
      }
    }

    this.logger.log('Cron: checkPlanLimits done');
  }

  /**
   * Job 3 — Relance commandes PENDING > 48h (toutes les 6h)
   */
  @Cron('0 */6 * * *', { name: 'pending-orders-alert' })
  async alertPendingOrders(): Promise<void> {
    this.logger.log('Cron: alertPendingOrders start');

    const threshold = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Commandes PENDING > 48h non encore alertées
    const pendingOrders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lte: threshold },
        lastAlertedAt: null,
      },
      select: {
        id: true, orderNumber: true, customerName: true, totalAmount: true, tenantId: true,
      },
    });

    if (pendingOrders.length === 0) {
      this.logger.log('Cron: alertPendingOrders — aucune commande en attente');
      return;
    }

    // Grouper par tenant
    const byTenant: Record<string, typeof pendingOrders> = {};
    for (const order of pendingOrders) {
      if (!byTenant[order.tenantId]) byTenant[order.tenantId] = [];
      byTenant[order.tenantId].push(order);
    }

    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: Object.keys(byTenant) } },
      select: {
        id: true, name: true, contactEmail: true,
        users: { where: { role: 'OWNER' }, select: { email: true, firstName: true }, take: 1 },
      },
    });

    for (const tenant of tenants) {
      try {
        const orders = byTenant[tenant.id];
        const ownerEmail = tenant.contactEmail ?? tenant.users[0]?.email;
        if (!ownerEmail) continue;
        const firstName = tenant.users[0]?.firstName ?? 'Marchand';

        await this.emailService.sendPendingOrdersAlert(
          ownerEmail,
          firstName,
          tenant.name,
          orders.map((o) => ({ ...o, totalAmount: Number(o.totalAmount) })),
        );

        // Marquer les commandes comme alertées
        await this.prisma.order.updateMany({
          where: { id: { in: orders.map((o) => o.id) } },
          data: { lastAlertedAt: new Date() },
        });
      } catch (err) {
        this.logger.error(`Pending orders alert failed for tenant ${tenant.id}: ${err}`);
      }
    }

    this.logger.log(`Cron: alertPendingOrders done — ${pendingOrders.length} commandes alertées`);
  }

  /**
   * Job 4 — Réengagement J+7 (quotidien 10h)
   * Envoie un email aux marchands qui n'ont pas visité leur dashboard depuis 7 à 14 jours
   */
  @Cron('0 10 * * *', { name: 'reengagement-j7' })
  async sendReengagementEmails(): Promise<void> {
    this.logger.log('Cron: sendReengagementEmails start');

    const now = new Date();
    const d7 = new Date(now); d7.setDate(now.getDate() - 7);
    const d14 = new Date(now); d14.setDate(now.getDate() - 14);
    const d7stats = new Date(now); d7stats.setDate(now.getDate() - 7);
    d7stats.setHours(0, 0, 0, 0);

    // Tenants dont l'OWNER ne s'est pas connecté depuis 7-14 jours
    const tenants = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        users: {
          some: {
            role: 'OWNER',
            isActive: true,
            lastLoginAt: { lte: d7, gte: d14 },
          },
        },
      },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        users: {
          where: { role: 'OWNER', isActive: true },
          select: { email: true, firstName: true },
          take: 1,
        },
      },
    });

    for (const tenant of tenants) {
      try {
        const cooldownKey = `reengagement_sent_${tenant.id}`;
        const lastSent = this.config.get(cooldownKey);
        if (lastSent && Date.now() - new Date(lastSent).getTime() < 14 * 24 * 3600 * 1000) {
          continue; // Cooldown 14 jours
        }

        const ownerEmail = tenant.contactEmail ?? tenant.users[0]?.email;
        if (!ownerEmail) continue;

        // Stats 7 derniers jours
        const [orderCount, revenueAgg, topItem] = await Promise.all([
          this.prisma.order.count({
            where: { tenantId: tenant.id, createdAt: { gte: d7stats }, status: { not: 'CANCELLED' } },
          }),
          this.prisma.order.aggregate({
            where: { tenantId: tenant.id, createdAt: { gte: d7stats }, status: 'DELIVERED' },
            _sum: { totalAmount: true },
          }),
          this.prisma.orderItem.findFirst({
            where: { order: { tenantId: tenant.id, createdAt: { gte: d7stats }, status: { not: 'CANCELLED' } } },
            orderBy: { quantity: 'desc' },
            select: { product: { select: { name: true } } },
          }),
        ]);

        await this.emailService.sendReengagementEmail(ownerEmail, tenant.name, {
          orderCount,
          revenue: Number(revenueAgg._sum.totalAmount ?? 0),
          topProduct: topItem?.product?.name ?? null,
        });

        // Enregistrer l'envoi dans PlatformConfig (pattern clé temporaire)
        await this.prisma.platformConfig.upsert({
          where: { key: cooldownKey },
          update: { value: now.toISOString() },
          create: { key: cooldownKey, value: now.toISOString(), group: 'scheduler', label: 'Réengagement envoyé' },
        });
      } catch (err) {
        this.logger.error(`Reengagement failed for tenant ${tenant.id}: ${err}`);
      }
    }

    this.logger.log(`Cron: sendReengagementEmails done — ${tenants.length} tenant(s) éligibles`);
  }

  /**
   * Job 5 — Agrégation analytics quotidienne (tous les jours à 2h du matin)
   * Agrège les events de la veille en DailyFunnel + TenantMetricsDaily
   */
  @Cron('0 2 * * *', { name: 'analytics-daily-aggregation' })
  async aggregateAnalytics(): Promise<void> {
    this.logger.log('Cron: aggregateAnalytics start');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    try {
      await Promise.all([
        this.analyticsService.aggregateDailyFunnels(yesterday),
        this.analyticsService.aggregateTenantMetrics(yesterday),
      ]);
    } catch (err) {
      this.logger.error(`Analytics aggregation failed: ${err}`);
    }

    this.logger.log('Cron: aggregateAnalytics done');
  }

  /**
   * Job 6 — Détection churn + nettoyage events (quotidien 3h)
   */
  @Cron('0 3 * * *', { name: 'analytics-churn-cleanup' })
  async churnAndCleanup(): Promise<void> {
    this.logger.log('Cron: churnAndCleanup start');

    try {
      await this.analyticsService.detectAndMarkChurn();
      await this.analyticsService.cleanupOldEvents(90);
    } catch (err) {
      this.logger.error(`Churn/cleanup failed: ${err}`);
    }

    this.logger.log('Cron: churnAndCleanup done');
  }

  /**
   * Job 7 — Facturation mensuelle des plans (1er de chaque mois à 1h)
   * Facture les plans STARTER (29 TND) et PRO (79 TND)
   */
  @Cron('0 1 1 * *', { name: 'monthly-plan-billing' })
  async chargeMonthlyPlanFees(): Promise<void> {
    this.logger.log('Cron: chargeMonthlyPlanFees start');

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Récupérer tous les tenants actifs avec plan payant
    const tenants = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        plan: { in: [PlanType.STARTER, PlanType.PRO] },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        users: {
          where: { role: 'OWNER' },
          select: { email: true, firstName: true },
          take: 1,
        },
        contactEmail: true,
      },
    });

    let successCount = 0;
    let failedCount = 0;

    for (const tenant of tenants) {
      try {
        const planPrice = PLAN_LIMITS[tenant.plan].priceMonthly;

        if (planPrice <= 0) {
          this.logger.warn(`Plan ${tenant.plan} has no monthly fee`);
          continue;
        }

        // Vérifier si déjà facturé ce mois
        const existingCharge = await this.platformRevenue['prisma'].platformRevenue.findFirst({
          where: {
            tenantId: tenant.id,
            type: 'SUBSCRIPTION',
            period,
          },
        });

        if (existingCharge) {
          this.logger.log(`Tenant ${tenant.slug} already charged for ${period}`);
          continue;
        }

        // Récupérer le wallet
        const wallet = await this.walletService.getOrCreateWallet(tenant.id);
        const balance = Number(wallet.balance);

        // Vérifier solde suffisant
        if (balance < planPrice) {
          this.logger.warn(`Tenant ${tenant.slug} insufficient balance: ${balance} TND < ${planPrice} TND`);

          // Envoyer email d'alerte
          const ownerEmail = tenant.contactEmail ?? tenant.users[0]?.email;
          if (ownerEmail) {
            await this.emailService['transporter']?.sendMail({
              to: ownerEmail,
              subject: `⚠️ Solde insuffisant pour votre abonnement ShopForge`,
              html: `
                <h2>Solde wallet insuffisant</h2>
                <p>Bonjour ${tenant.users[0]?.firstName ?? 'Marchand'},</p>
                <p>Votre solde wallet (<strong>${balance.toFixed(3)} TND</strong>) est insuffisant pour payer votre abonnement ${tenant.plan} (<strong>${planPrice} TND/mois</strong>).</p>
                <p>Veuillez recharger votre wallet pour éviter la suspension de votre compte.</p>
                <p><strong>Contact :</strong> contact@shopforge.tech</p>
              `,
            }).catch(() => {});
          }

          failedCount++;
          continue;
        }

        // Déduire du wallet
        const before = balance;
        const after = balance - planPrice;

        await this.prisma.$transaction([
          this.prisma.tenantWallet.update({
            where: { id: wallet.id },
            data: { balance: { decrement: planPrice } },
          }),
          this.prisma.walletTransaction.create({
            data: {
              walletId: wallet.id,
              type: WalletTxType.ADJUSTMENT,
              amount: planPrice,
              balanceBefore: before,
              balanceAfter: after,
              description: `Abonnement ${tenant.plan} — ${period}`,
              reference: period,
            },
          }),
        ]);

        // Enregistrer revenu plateforme
        await this.platformRevenue.recordSubscription(
          tenant.id,
          planPrice,
          tenant.plan,
          period,
        );

        this.logger.log(`Tenant ${tenant.slug} charged ${planPrice} TND for ${period}`);
        successCount++;

      } catch (err) {
        this.logger.error(`Failed to charge tenant ${tenant.slug}: ${err}`);
        failedCount++;
      }
    }

    this.logger.log(`Cron: chargeMonthlyPlanFees done — ${successCount} success, ${failedCount} failed`);
  }
}
