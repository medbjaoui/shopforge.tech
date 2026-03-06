import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CreateAuditLogDto {
  tenantId?: string;
  userId?: string;
  adminId?: string;
  action: string; // "order.status_change", "product.create", "tenant.plan_upgrade"
  entity: string; // "Order", "Product", "Tenant"
  entityId?: string;
  before?: any;
  after?: any;
  ip?: string;
}

export interface AuditLogFilters {
  tenantId?: string;
  userId?: string;
  adminId?: string;
  action?: string;
  entity?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Créer un log d'audit
   */
  async create(data: CreateAuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        tenantId: data.tenantId || null,
        userId: data.userId || null,
        adminId: data.adminId || null,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId || null,
        before: data.before || null,
        after: data.after || null,
        ip: data.ip || null,
      },
    });
  }

  /**
   * Lister les logs avec filtres (pour SuperAdmin)
   */
  async findAll(filters: AuditLogFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.tenantId) where.tenantId = filters.tenantId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.adminId) where.adminId = filters.adminId;
    if (filters.action) where.action = { contains: filters.action, mode: 'insensitive' };
    if (filters.entity) where.entity = filters.entity;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Lister les logs pour un tenant spécifique
   */
  async findByTenant(tenantId: string, page = 1, limit = 50) {
    return this.findAll({ tenantId, page, limit });
  }

  /**
   * Statistiques globales (pour dashboard SuperAdmin)
   */
  async getStats(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalLogs, actionBreakdown, entityBreakdown, mostActiveTenants, mostActiveUsers] = await Promise.all([
      this.prisma.auditLog.count({
        where: { createdAt: { gte: startDate } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['action'],
        where: { createdAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { action: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['entity'],
        where: { createdAt: { gte: startDate } },
        _count: true,
        orderBy: { _count: { entity: 'desc' } },
      }),
      this.prisma.auditLog.groupBy({
        by: ['tenantId'],
        where: {
          createdAt: { gte: startDate },
          tenantId: { not: null },
        },
        _count: true,
        orderBy: { _count: { tenantId: 'desc' } },
        take: 10,
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startDate },
          userId: { not: null },
        },
        _count: true,
        orderBy: { _count: { userId: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      totalLogs,
      actionBreakdown,
      entityBreakdown,
      mostActiveTenants,
      mostActiveUsers,
    };
  }
}
