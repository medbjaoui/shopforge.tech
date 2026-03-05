import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  // ─── INGEST EVENTS (batch) ────────────────────────────────────────────────

  async ingestEvents(
    tenantId: string,
    events: Array<{
      event: string;
      visitorId?: string;
      customerId?: string;
      properties?: Record<string, any>;
      page?: string;
      referrer?: string;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      deviceType?: string;
      sessionId?: string;
      timestamp?: string;
    }>,
  ) {
    const data = events.map((e) => ({
      tenantId,
      event: e.event,
      visitorId: e.visitorId ?? null,
      customerId: e.customerId ?? null,
      properties: e.properties ?? Prisma.JsonNull,
      page: e.page ?? null,
      referrer: e.referrer ?? null,
      utmSource: e.utmSource ?? null,
      utmMedium: e.utmMedium ?? null,
      utmCampaign: e.utmCampaign ?? null,
      deviceType: e.deviceType ?? null,
      sessionId: e.sessionId ?? null,
      createdAt: e.timestamp ? new Date(e.timestamp) : new Date(),
    }));

    await this.prisma.analyticsEvent.createMany({ data });
    return { ingested: data.length };
  }

  // ─── FUNNEL (per tenant, period) ──────────────────────────────────────────

  async getTenantFunnel(tenantId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const events = await this.prisma.analyticsEvent.groupBy({
      by: ['event'],
      where: { tenantId, createdAt: { gte: since } },
      _count: { id: true },
    });

    const counts: Record<string, number> = {};
    for (const e of events) counts[e.event] = e._count.id;

    // Unique visitors
    const visitors = await this.prisma.analyticsEvent.findMany({
      where: { tenantId, createdAt: { gte: since }, visitorId: { not: null } },
      distinct: ['visitorId'],
      select: { visitorId: true },
    });

    return {
      visitors: visitors.length,
      pageViews: counts['page_view'] ?? 0,
      productViews: counts['product_view'] ?? 0,
      addToCarts: counts['add_to_cart'] ?? 0,
      checkoutStarts: counts['checkout_start'] ?? 0,
      purchases: counts['purchase'] ?? 0,
    };
  }

  // ─── TRAFFIC SOURCES (per tenant) ─────────────────────────────────────────

  async getTenantSources(tenantId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const results = await this.prisma.analyticsEvent.groupBy({
      by: ['utmSource'],
      where: {
        tenantId,
        event: 'page_view',
        createdAt: { gte: since },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const total = results.reduce((s, r) => s + r._count.id, 0);
    return results.map((r) => ({
      source: r.utmSource || 'direct',
      count: r._count.id,
      percent: total > 0 ? Math.round((r._count.id / total) * 100) : 0,
    }));
  }

  // ─── DAILY FUNNEL AGGREGATION (cron) ──────────────────────────────────────

  async aggregateDailyFunnels(date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // Get all tenants that had events that day
    const tenantIds = await this.prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: dayStart, lt: dayEnd } },
      distinct: ['tenantId'],
      select: { tenantId: true },
    });

    for (const { tenantId } of tenantIds) {
      const where = { tenantId, createdAt: { gte: dayStart, lt: dayEnd } };

      const [eventCounts, uniqueVisitors, revenueAgg] = await Promise.all([
        this.prisma.analyticsEvent.groupBy({
          by: ['event'],
          where,
          _count: { id: true },
        }),
        this.prisma.analyticsEvent.findMany({
          where: { ...where, visitorId: { not: null } },
          distinct: ['visitorId'],
          select: { visitorId: true },
        }),
        this.prisma.order.aggregate({
          where: { tenantId, createdAt: { gte: dayStart, lt: dayEnd }, status: { notIn: ['CANCELLED'] } },
          _sum: { totalAmount: true },
        }),
      ]);

      const counts: Record<string, number> = {};
      for (const e of eventCounts) counts[e.event] = e._count.id;

      await this.prisma.dailyFunnel.upsert({
        where: { tenantId_date: { tenantId, date: dayStart } },
        create: {
          tenantId,
          date: dayStart,
          visitors: uniqueVisitors.length,
          productViews: counts['product_view'] ?? 0,
          addToCarts: counts['add_to_cart'] ?? 0,
          checkoutStarts: counts['checkout_start'] ?? 0,
          purchases: counts['purchase'] ?? 0,
          revenue: revenueAgg._sum.totalAmount ?? 0,
        },
        update: {
          visitors: uniqueVisitors.length,
          productViews: counts['product_view'] ?? 0,
          addToCarts: counts['add_to_cart'] ?? 0,
          checkoutStarts: counts['checkout_start'] ?? 0,
          purchases: counts['purchase'] ?? 0,
          revenue: revenueAgg._sum.totalAmount ?? 0,
        },
      });
    }

    this.logger.log(`Aggregated daily funnels for ${tenantIds.length} tenants`);
  }

  // ─── TENANT METRICS DAILY AGGREGATION (cron) ─────────────────────────────

  async aggregateTenantMetrics(date: Date) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const tenants = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true },
    });

    for (const { id: tenantId } of tenants) {
      const [orders, products, logins] = await Promise.all([
        this.prisma.order.aggregate({
          where: { tenantId, createdAt: { gte: dayStart, lt: dayEnd } },
          _count: { id: true },
          _sum: { totalAmount: true },
        }),
        this.prisma.product.count({
          where: { tenantId, createdAt: { gte: dayStart, lt: dayEnd } },
        }),
        this.prisma.user.count({
          where: { tenantId, lastLoginAt: { gte: dayStart, lt: dayEnd } },
        }),
      ]);

      const ordersCount = orders._count.id;
      const revenue = orders._sum.totalAmount ?? 0;
      const isActive = logins > 0 || ordersCount > 0 || products > 0;

      if (!isActive && ordersCount === 0 && products === 0) continue; // skip dead days

      await this.prisma.tenantMetricsDaily.upsert({
        where: { tenantId_date: { tenantId, date: dayStart } },
        create: {
          tenantId,
          date: dayStart,
          logins,
          ordersReceived: ordersCount,
          revenue,
          productsCreated: products,
          isActive,
        },
        update: {
          logins,
          ordersReceived: ordersCount,
          revenue,
          productsCreated: products,
          isActive,
        },
      });
    }

    this.logger.log(`Aggregated tenant metrics for ${tenants.length} tenants`);
  }

  // ─── ADMIN: CHURN ─────────────────────────────────────────────────────────

  async getChurnStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(now.getDate() - 60);

    // Tenants actifs début de mois (créés avant 30j et pas churned)
    const totalActive = await this.prisma.tenant.count({
      where: { isActive: true, createdAt: { lt: thirtyDaysAgo } },
    });

    // Tenants sans activité depuis 30j (pas de login, pas de commande)
    const churned = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        createdAt: { lt: thirtyDaysAgo },
        OR: [
          { lastActivityAt: { lt: thirtyDaysAgo } },
          { lastActivityAt: null },
        ],
      },
      select: {
        id: true, name: true, slug: true, plan: true,
        lastActivityAt: true, createdAt: true,
        _count: { select: { orders: true, products: true } },
      },
      orderBy: { lastActivityAt: 'asc' },
    });

    // Previous period churn for comparison
    const prevChurned = await this.prisma.tenant.count({
      where: {
        isActive: true,
        createdAt: { lt: sixtyDaysAgo },
        churnedAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    });

    const churnRate = totalActive > 0
      ? Math.round((churned.length / totalActive) * 1000) / 10
      : 0;

    // Plan distribution of churned
    const planBreakdown: Record<string, number> = {};
    for (const t of churned) {
      planBreakdown[t.plan] = (planBreakdown[t.plan] ?? 0) + 1;
    }

    return {
      totalActive,
      churned: churned.length,
      churnRate,
      prevChurned,
      planBreakdown,
      churnedTenants: churned.slice(0, 20),
    };
  }

  // ─── ADMIN: COHORT RETENTION ──────────────────────────────────────────────

  async getCohortRetention(months = 6) {
    const cohorts: Array<{
      month: string;
      registered: number;
      retention: number[]; // percentage per subsequent month
    }> = [];

    const now = new Date();
    for (let i = months - 1; i >= 0; i--) {
      const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const label = `${cohortStart.getFullYear()}-${String(cohortStart.getMonth() + 1).padStart(2, '0')}`;

      // Tenants registered in this cohort month
      const tenants = await this.prisma.tenant.findMany({
        where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
        select: { id: true },
      });

      const registered = tenants.length;
      if (registered === 0) {
        cohorts.push({ month: label, registered: 0, retention: [] });
        continue;
      }

      const tenantIds = tenants.map((t) => t.id);
      const retention: number[] = [];

      // Check retention for each subsequent month
      for (let m = 0; m <= i; m++) {
        const checkStart = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + m, 1);
        const checkEnd = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + m + 1, 1);

        // A tenant is "retained" if they had any order received in that month
        const activeCount = await this.prisma.order.groupBy({
          by: ['tenantId'],
          where: {
            tenantId: { in: tenantIds },
            createdAt: { gte: checkStart, lt: checkEnd },
          },
        });

        retention.push(Math.round((activeCount.length / registered) * 100));
      }

      cohorts.push({ month: label, registered, retention });
    }

    return cohorts;
  }

  // ─── ADMIN: LTV ───────────────────────────────────────────────────────────

  async getLtvStats() {
    // Average commission per tenant (lifetime)
    const commissions = await this.prisma.commissionRecord.groupBy({
      by: ['tenantId'],
      _sum: { commissionAmount: true },
      _count: { id: true },
    });

    const totalTenants = commissions.length || 1;
    const totalCommission = commissions.reduce(
      (s, c) => s + Number(c._sum.commissionAmount ?? 0), 0,
    );
    const avgLtv = totalCommission / totalTenants;

    // LTV by plan
    const tenantPlans = await this.prisma.tenant.findMany({
      where: { id: { in: commissions.map((c) => c.tenantId) } },
      select: { id: true, plan: true },
    });
    const planMap = new Map(tenantPlans.map((t) => [t.id, t.plan]));

    const byPlan: Record<string, { tenants: number; totalLtv: number; avgLtv: number }> = {};
    for (const c of commissions) {
      const plan = planMap.get(c.tenantId) ?? 'FREE';
      if (!byPlan[plan]) byPlan[plan] = { tenants: 0, totalLtv: 0, avgLtv: 0 };
      byPlan[plan].tenants++;
      byPlan[plan].totalLtv += Number(c._sum.commissionAmount ?? 0);
    }
    for (const p of Object.values(byPlan)) {
      p.avgLtv = Math.round((p.totalLtv / p.tenants) * 100) / 100;
    }

    // Average tenant lifespan (days)
    const tenantAges = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { createdAt: true },
    });
    const now = Date.now();
    const avgLifespanDays = tenantAges.length > 0
      ? Math.round(tenantAges.reduce((s, t) => s + (now - t.createdAt.getTime()), 0) / tenantAges.length / 86400000)
      : 0;

    return {
      avgLtv: Math.round(avgLtv * 100) / 100,
      totalRevenue: Math.round(totalCommission * 100) / 100,
      tenantsWithRevenue: commissions.length,
      avgLifespanDays,
      byPlan,
    };
  }

  // ─── ADMIN: ACTIVATION FUNNEL ─────────────────────────────────────────────

  async getActivationStats(days = 90) {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const total = await this.prisma.tenant.count({
      where: { createdAt: { gte: since } },
    });

    // Has at least 1 product
    const withProduct = await this.prisma.tenant.count({
      where: {
        createdAt: { gte: since },
        products: { some: {} },
      },
    });

    // Has at least 1 order received
    const withOrder = await this.prisma.tenant.count({
      where: {
        createdAt: { gte: since },
        orders: { some: {} },
      },
    });

    // Fully activated (has product AND has order)
    const activated = await this.prisma.tenant.count({
      where: {
        createdAt: { gte: since },
        products: { some: {} },
        orders: { some: {} },
      },
    });

    // Still active after 30 days (activated + has order in last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const retained = await this.prisma.tenant.count({
      where: {
        createdAt: { gte: since },
        products: { some: {} },
        orders: { some: { createdAt: { gte: thirtyDaysAgo } } },
      },
    });

    return {
      period: days,
      registered: total,
      withProduct,
      withOrder,
      activated,
      retained,
      rates: {
        productRate: total > 0 ? Math.round((withProduct / total) * 100) : 0,
        orderRate: total > 0 ? Math.round((withOrder / total) * 100) : 0,
        activationRate: total > 0 ? Math.round((activated / total) * 100) : 0,
        retentionRate: activated > 0 ? Math.round((retained / activated) * 100) : 0,
      },
    };
  }

  // ─── ADMIN: FULL ANALYTICS SUMMARY ────────────────────────────────────────

  async getAdminAnalyticsSummary() {
    const [churn, ltv, activation, cohorts] = await Promise.all([
      this.getChurnStats(),
      this.getLtvStats(),
      this.getActivationStats(),
      this.getCohortRetention(6),
    ]);

    return { churn, ltv, activation, cohorts };
  }

  // ─── MERCHANT: DAILY FUNNEL DATA ──────────────────────────────────────────

  async getMerchantFunnelHistory(tenantId: string, days = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    return this.prisma.dailyFunnel.findMany({
      where: { tenantId, date: { gte: since } },
      orderBy: { date: 'asc' },
    });
  }

  // ─── CLEANUP OLD EVENTS ──────────────────────────────────────────────────

  async cleanupOldEvents(retentionDays = 90) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.prisma.analyticsEvent.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });

    this.logger.log(`Cleaned up ${result.count} old analytics events`);
    return result;
  }

  // ─── DETECT CHURN (cron) ──────────────────────────────────────────────────

  async detectAndMarkChurn() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const churned = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        churnedAt: null,
        createdAt: { lt: thirtyDaysAgo },
        OR: [
          { lastActivityAt: { lt: thirtyDaysAgo } },
          { lastActivityAt: null },
        ],
      },
      select: { id: true },
    });

    if (churned.length > 0) {
      await this.prisma.tenant.updateMany({
        where: { id: { in: churned.map((t) => t.id) } },
        data: { churnedAt: new Date() },
      });
    }

    // Un-churn: tenants who came back
    const reactivated = await this.prisma.tenant.findMany({
      where: {
        isActive: true,
        churnedAt: { not: null },
        lastActivityAt: { gte: thirtyDaysAgo },
      },
      select: { id: true },
    });

    if (reactivated.length > 0) {
      await this.prisma.tenant.updateMany({
        where: { id: { in: reactivated.map((t) => t.id) } },
        data: { churnedAt: null },
      });
    }

    this.logger.log(`Churn detection: ${churned.length} churned, ${reactivated.length} reactivated`);
  }
}
