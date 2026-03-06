import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { PlanType } from '@prisma/client';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { getDynamicPlanLimits } from '../../common/billing/plan-limits';
import { CloudflareService } from '../cloudflare/cloudflare.service';

@Injectable()
export class AdminService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private platformConfig: PlatformConfigService,
    private cloudflareService: CloudflareService,
  ) {}

  // Seed automatique du super admin depuis les variables d'environnement
  async onModuleInit() {
    const email = this.config.get<string>('SUPER_ADMIN_EMAIL');
    const password = this.config.get<string>('SUPER_ADMIN_PASSWORD');
    if (!email || !password) return;

    const existing = await this.prisma.superAdmin.findUnique({ where: { email } });
    if (existing) return;

    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.superAdmin.create({ data: { email, passwordHash } });
    console.log(`[SuperAdmin] Compte créé : ${email}`);
  }

  // ─── AUTH ─────────────────────────────────────────────────────────────────

  async login(dto: AdminLoginDto) {
    const admin = await this.prisma.superAdmin.findUnique({ where: { email: dto.email } });
    if (!admin) throw new UnauthorizedException('Identifiants invalides');

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) throw new UnauthorizedException('Identifiants invalides');

    const secret = this.config.get<string>('JWT_ADMIN_SECRET') ?? this.config.get<string>('JWT_SECRET');
    const accessToken = this.jwtService.sign(
      { sub: admin.id, isAdmin: true },
      { secret, expiresIn: '8h' },
    );

    return {
      accessToken,
      admin: { id: admin.id, email: admin.email },
    };
  }

  async changeAdminPassword(adminId: string, oldPassword: string, newPassword: string) {
    const admin = await this.prisma.superAdmin.findUnique({ where: { id: adminId } });
    if (!admin) throw new NotFoundException('Admin introuvable');

    const valid = await bcrypt.compare(oldPassword, admin.passwordHash);
    if (!valid) throw new BadRequestException('Ancien mot de passe incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.superAdmin.update({ where: { id: adminId }, data: { passwordHash } });

    return { message: 'Mot de passe admin modifié avec succès' };
  }

  // ─── STATS GLOBALES ───────────────────────────────────────────────────────

  async getStats(days?: number) {
    const dateFilter = days
      ? { createdAt: { gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } }
      : {};

    const [totalTenants, activeTenants, totalProducts, totalOrders, revenueAgg, planBreakdown, platformRevenueAgg] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.count({ where: { isActive: true } }),
        this.prisma.product.count(),
        this.prisma.order.count({ where: dateFilter }),
        this.prisma.order.aggregate({ where: dateFilter, _sum: { totalAmount: true } }),
        this.prisma.tenant.groupBy({ by: ['plan'], _count: true }),
        this.prisma.platformRevenue.aggregate({ where: dateFilter, _sum: { amount: true } }),
      ]);

    // Top 5 boutiques par CA
    const topTenants = await this.prisma.tenant.findMany({
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        _count: { select: { orders: true, products: true } },
      },
    });
    const topTenantsWithRevenue = await Promise.all(
      topTenants.map(async (t) => {
        const agg = await this.prisma.order.aggregate({
          where: { tenantId: t.id },
          _sum: { totalAmount: true },
        });
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          plan: t.plan,
          orders: t._count.orders,
          products: t._count.products,
          revenue: Number(agg._sum.totalAmount ?? 0),
        };
      }),
    );
    topTenantsWithRevenue.sort((a, b) => b.revenue - a.revenue);

    return {
      totalTenants,
      activeTenants,
      totalProducts,
      totalOrders,
      totalRevenue: revenueAgg._sum.totalAmount ?? 0, // Merchant revenue (all orders)
      platformRevenue: platformRevenueAgg._sum.amount ?? 0, // Platform revenue (commissions + subscriptions)
      planBreakdown: planBreakdown.reduce(
        (acc, r) => ({ ...acc, [r.plan]: r._count }),
        {} as Record<string, number>,
      ),
      topTenants: topTenantsWithRevenue,
    };
  }

  // ─── ALERTES ACTIVES ───────────────────────────────────────────────────────

  async getAlerts() {
    const minimumBalance = this.platformConfig.getNumber('wallet_minimum_balance', 10);
    const threshold48h = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const [lowWallets, suspendedTenants, pendingOrders48h, lowWalletTenants] = await Promise.all([
      this.prisma.tenantWallet.count({
        where: { balance: { lt: minimumBalance } },
      }),
      this.prisma.tenant.count({ where: { isActive: false } }),
      this.prisma.order.count({
        where: { status: 'PENDING', createdAt: { lt: threshold48h } },
      }),
      this.prisma.tenantWallet.findMany({
        where: { balance: { lt: minimumBalance } },
        take: 5,
        select: {
          balance: true,
          minimumBalance: true,
          tenant: { select: { id: true, name: true, slug: true } },
        },
        orderBy: { balance: 'asc' },
      }),
    ]);

    return {
      lowWallets,
      suspendedTenants,
      pendingOrders48h,
      total: lowWallets + pendingOrders48h,
      lowWalletTenants: lowWalletTenants.map((w) => ({
        id: w.tenant.id,
        name: w.tenant.name,
        slug: w.tenant.slug,
        balance: Number(w.balance),
        minimumBalance: Number(w.minimumBalance),
      })),
    };
  }

  // ─── BILLING / MRR ─────────────────────────────────────────────────────────

  async getBillingStats() {
    const planLimits = getDynamicPlanLimits(this.platformConfig);

    // Tenants par plan (actifs seulement)
    const planBreakdown = await this.prisma.tenant.groupBy({
      by: ['plan'],
      where: { isActive: true },
      _count: true,
    });
    const planMap: Record<string, number> = {};
    planBreakdown.forEach((r) => { planMap[r.plan] = r._count; });

    // MRR = somme(tenants actifs par plan × prix plan)
    let mrr = 0;
    for (const plan of ['FREE', 'STARTER', 'PRO'] as const) {
      const count = planMap[plan] ?? 0;
      const price = planLimits[plan].priceMonthly;
      mrr += count * price;
    }

    // ARR = MRR × 12
    const arr = mrr * 12;

    // Total tenants et tenants payants
    const totalActive = Object.values(planMap).reduce((s, c) => s + c, 0);
    const totalPaying = (planMap['STARTER'] ?? 0) + (planMap['PRO'] ?? 0);

    // ARPU (Average Revenue Per User)
    const arpu = totalActive > 0 ? mrr / totalActive : 0;
    const arppu = totalPaying > 0 ? mrr / totalPaying : 0; // per paying user

    // GMV ce mois
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfLastMonth = new Date(startOfMonth);
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1);

    const [gmvThisMonth, gmvLastMonth, ordersThisMonth, ordersLastMonth, totalGmv] = await Promise.all([
      this.prisma.order.aggregate({
        where: { createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth }, status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
      this.prisma.order.aggregate({
        where: { status: { not: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
    ]);

    const gmvMonth = Number(gmvThisMonth._sum.totalAmount ?? 0);
    const gmvPrevMonth = Number(gmvLastMonth._sum.totalAmount ?? 0);
    const gmvGrowth = gmvPrevMonth > 0 ? ((gmvMonth - gmvPrevMonth) / gmvPrevMonth) * 100 : 0;

    // Panier moyen
    const avgOrderValue = ordersThisMonth > 0 ? gmvMonth / ordersThisMonth : 0;

    // Tenants crees ce mois vs mois dernier
    const [newTenantsThisMonth, newTenantsLastMonth] = await Promise.all([
      this.prisma.tenant.count({ where: { createdAt: { gte: startOfMonth } } }),
      this.prisma.tenant.count({ where: { createdAt: { gte: startOfLastMonth, lt: startOfMonth } } }),
    ]);
    const tenantGrowth = newTenantsLastMonth > 0
      ? ((newTenantsThisMonth - newTenantsLastMonth) / newTenantsLastMonth) * 100 : 0;

    // GMV par mois (6 derniers mois)
    const monthlyGmv: { month: string; gmv: number; orders: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date();
      start.setMonth(start.getMonth() - i, 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      const [agg, count] = await Promise.all([
        this.prisma.order.aggregate({
          where: { createdAt: { gte: start, lt: end }, status: { not: 'CANCELLED' } },
          _sum: { totalAmount: true },
        }),
        this.prisma.order.count({ where: { createdAt: { gte: start, lt: end } } }),
      ]);
      monthlyGmv.push({
        month: start.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' }),
        gmv: Number(agg._sum.totalAmount ?? 0),
        orders: count,
      });
    }

    // Top tenants par revenus ce mois
    const tenantsThisMonth = await this.prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, plan: true },
    });
    const topTenantsRevenue = await Promise.all(
      tenantsThisMonth.map(async (t) => {
        const agg = await this.prisma.order.aggregate({
          where: { tenantId: t.id, createdAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } },
          _sum: { totalAmount: true },
          _count: true,
        });
        return {
          ...t,
          revenueMonth: Number(agg._sum.totalAmount ?? 0),
          ordersMonth: agg._count,
          planPrice: planLimits[t.plan as keyof typeof planLimits]?.priceMonthly ?? 0,
        };
      }),
    );
    topTenantsRevenue.sort((a, b) => b.revenueMonth - a.revenueMonth);

    return {
      mrr,
      arr,
      totalActive,
      totalPaying,
      arpu: Math.round(arpu * 100) / 100,
      arppu: Math.round(arppu * 100) / 100,
      plans: {
        FREE: { count: planMap['FREE'] ?? 0, price: planLimits.FREE.priceMonthly, label: planLimits.FREE.label },
        STARTER: { count: planMap['STARTER'] ?? 0, price: planLimits.STARTER.priceMonthly, label: planLimits.STARTER.label },
        PRO: { count: planMap['PRO'] ?? 0, price: planLimits.PRO.priceMonthly, label: planLimits.PRO.label },
      },
      gmv: {
        thisMonth: Math.round(gmvMonth * 100) / 100,
        lastMonth: Math.round(gmvPrevMonth * 100) / 100,
        growth: Math.round(gmvGrowth * 10) / 10,
        total: Number(totalGmv._sum.totalAmount ?? 0),
        avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      },
      orders: {
        thisMonth: ordersThisMonth,
        lastMonth: ordersLastMonth,
      },
      tenants: {
        newThisMonth: newTenantsThisMonth,
        newLastMonth: newTenantsLastMonth,
        growth: Math.round(tenantGrowth * 10) / 10,
      },
      monthlyGmv,
      topTenants: topTenantsRevenue.slice(0, 10),
    };
  }

  // ─── PERFORMANCE PAR BOUTIQUE ─────────────────────────────────────────────

  async getTenantsPerformance() {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
        createdAt: true,
        _count: { select: { products: true, orders: true } },
      },
    });

    const tenantsWithRevenue = await Promise.all(
      tenants.map(async (t) => {
        const [revenueAgg, monthOrders, deliveredCount] = await Promise.all([
          this.prisma.order.aggregate({
            where: { tenantId: t.id },
            _sum: { totalAmount: true },
          }),
          this.prisma.order.count({
            where: {
              tenantId: t.id,
              createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
            },
          }),
          this.prisma.order.count({
            where: { tenantId: t.id, status: 'DELIVERED' },
          }),
        ]);
        const totalRevenue = Number(revenueAgg._sum.totalAmount ?? 0);
        const avgOrder = t._count.orders > 0 ? totalRevenue / t._count.orders : 0;
        return {
          id: t.id,
          name: t.name,
          slug: t.slug,
          plan: t.plan,
          isActive: t.isActive,
          createdAt: t.createdAt,
          products: t._count.products,
          totalOrders: t._count.orders,
          ordersThisMonth: monthOrders,
          deliveredOrders: deliveredCount,
          totalRevenue,
          avgOrderValue: Math.round(avgOrder * 100) / 100,
        };
      }),
    );

    return tenantsWithRevenue;
  }

  // ─── TENANTS ──────────────────────────────────────────────────────────────

  async getAllTenants() {
    return this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        slug: true,
        plan: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { users: true, products: true, orders: true },
        },
      },
    });
  }

  async getTenantById(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: { select: { users: true, products: true, orders: true } },
        users: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            customerName: true,
            customerEmail: true,
            createdAt: true,
          },
        },
      },
    });
    if (!tenant) throw new NotFoundException('Tenant introuvable');

    // Calculer le revenu total du tenant
    const revenueAgg = await this.prisma.order.aggregate({
      where: { tenantId: id },
      _sum: { totalAmount: true },
    });

    return { ...tenant, totalRevenue: revenueAgg._sum.totalAmount ?? 0 };
  }

  async toggleTenant(id: string) {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id } });
    return this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
    });
  }

  async updateTenantPlan(id: string, plan: PlanType) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Tenant introuvable');
    return this.prisma.tenant.update({ where: { id }, data: { plan } });
  }

  async updateTenantDomain(id: string, domain: string | null) {
    if (domain) {
      const domainRegex = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i;
      if (!domainRegex.test(domain)) throw new BadRequestException('Format de domaine invalide');
      if (domain.endsWith('shopforge.tech')) throw new BadRequestException('Domaine réservé');
      const existing = await this.prisma.tenant.findFirst({ where: { domain, NOT: { id } } });
      if (existing) throw new BadRequestException('Ce domaine est déjà utilisé par une autre boutique');
    }

    const old = await this.prisma.tenant.findUnique({ where: { id }, select: { domain: true } });
    if (old?.domain) await this.cloudflareService.removeHostname(old.domain).catch(() => {});
    if (domain) await this.cloudflareService.addHostname(domain).catch(() => {});

    return this.prisma.tenant.update({
      where: { id },
      data: { domain: domain || null },
      select: { id: true, domain: true, slug: true },
    });
  }

  // ─── TRANSPORTEURS (CARRIERS) ─────────────────────────────────────────────

  async getAllCarriers() {
    return this.prisma.carrier.findMany({ orderBy: { name: 'asc' } });
  }

  async createCarrier(data: {
    name: string;
    slug: string;
    logoUrl?: string;
    apiBaseUrl?: string;
    apiType?: string;
    description?: string;
  }) {
    return this.prisma.carrier.create({ data });
  }

  async updateCarrier(
    id: string,
    data: {
      name?: string;
      logoUrl?: string;
      apiBaseUrl?: string;
      apiType?: string;
      description?: string;
    },
  ) {
    return this.prisma.carrier.update({ where: { id }, data });
  }

  async toggleCarrier(id: string) {
    const carrier = await this.prisma.carrier.findUniqueOrThrow({ where: { id } });
    return this.prisma.carrier.update({
      where: { id },
      data: { isActive: !carrier.isActive },
    });
  }

  // ─── COMMANDES GLOBALES ───────────────────────────────────────────────────

  async getAllOrders(page = 1, limit = 30) {
    const skip = (page - 1) * limit;
    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          customerName: true,
          customerEmail: true,
          createdAt: true,
          tenant: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.order.count(),
    ]);

    return { orders, total, page, totalPages: Math.ceil(total / limit) };
  }
}
