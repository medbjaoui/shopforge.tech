import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, CustomerSource } from '@prisma/client';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';

function normalizePhone(phone: string): string {
  let p = phone.replace(/[\s\-().]/g, '');
  if (p.startsWith('00216')) p = '+216' + p.slice(5);
  if (!p.startsWith('+') && p.length === 8) p = '+216' + p;
  return p;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || 'Client',
    lastName: parts.slice(1).join(' ') || '',
  };
}

const CUSTOMER_INCLUDE = {
  tags: { include: { tag: true } },
  addresses: { orderBy: { isDefault: 'desc' as const } },
  _count: { select: { orders: true } },
};

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  // ── Auto-création depuis une commande ─────────────────────────────────────

  async findOrCreateFromOrder(
    tenantId: string,
    orderData: {
      customerName: string;
      customerPhone: string;
      customerEmail?: string | null;
      totalAmount: number;
      shippingAddress?: any;
    },
  ): Promise<string> {
    const phone = normalizePhone(orderData.customerPhone);
    const { firstName, lastName } = splitName(orderData.customerName);

    const existing = await this.prisma.customer.findUnique({
      where: { phone_tenantId: { phone, tenantId } },
    });

    if (existing) {
      // Incrémenter les stats
      const updated = await this.prisma.customer.update({
        where: { id: existing.id },
        data: {
          orderCount: { increment: 1 },
          totalSpent: { increment: orderData.totalAmount },
          lastOrderAt: new Date(),
          ...(orderData.customerEmail && !existing.email
            ? { email: orderData.customerEmail }
            : {}),
        },
      });

      // Auto-créer adresse si nouvelle
      if (orderData.shippingAddress) {
        await this.maybeCreateAddressFromOrder(updated.id, orderData.shippingAddress);
      }

      return updated.id;
    }

    // Nouveau client
    const customer = await this.prisma.customer.create({
      data: {
        tenantId,
        firstName,
        lastName,
        phone,
        email: orderData.customerEmail ?? undefined,
        source: CustomerSource.CHECKOUT,
        orderCount: 1,
        totalSpent: orderData.totalAmount,
        lastOrderAt: new Date(),
      },
    });

    if (orderData.shippingAddress) {
      await this.maybeCreateAddressFromOrder(customer.id, orderData.shippingAddress);
    }

    return customer.id;
  }

  private async maybeCreateAddressFromOrder(customerId: string, addr: any) {
    if (!addr || !addr.address) return;
    const line1 = addr.address;
    const city = addr.city || '';
    const governorate = addr.governorate || '';
    if (!line1 || !city) return;

    // Vérifier si cette adresse existe déjà
    const existing = await this.prisma.customerAddress.findFirst({
      where: { customerId, line1, city },
    });
    if (existing) return;

    const hasDefault = await this.prisma.customerAddress.findFirst({
      where: { customerId, isDefault: true },
    });

    await this.prisma.customerAddress.create({
      data: {
        customerId,
        line1,
        city,
        governorate: governorate || 'Tunis',
        postalCode: addr.postalCode || undefined,
        isDefault: !hasDefault,
      },
    });
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(tenantId: string, query: CustomerQueryDto) {
    const page = parseInt(query.page ?? '1') || 1;
    const limit = parseInt(query.limit ?? '20') || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      tenantId,
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.tagId ? { tags: { some: { tagId: query.tagId } } } : {}),
      ...(query.segment ? this.getSegmentFilter(query.segment) : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: CUSTOMER_INCLUDE,
        orderBy: { lastOrderAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.customer.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        ...CUSTOMER_INCLUDE,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true, orderNumber: true, status: true,
            totalAmount: true, createdAt: true,
          },
        },
      },
    });
    if (!customer) throw new NotFoundException('Client introuvable');
    return customer;
  }

  async create(tenantId: string, dto: CreateCustomerDto) {
    const phone = normalizePhone(dto.phone);
    const existing = await this.prisma.customer.findUnique({
      where: { phone_tenantId: { phone, tenantId } },
    });
    if (existing) throw new ConflictException('Un client avec ce numéro existe déjà');

    return this.prisma.customer.create({
      data: {
        ...dto,
        phone,
        source: dto.source ?? CustomerSource.MANUAL,
        tenantId,
      },
      include: CUSTOMER_INCLUDE,
    });
  }

  async update(id: string, tenantId: string, dto: UpdateCustomerDto) {
    await this.ensureOwnership(id, tenantId);
    const data: any = { ...dto };
    if (dto.phone) data.phone = normalizePhone(dto.phone);
    return this.prisma.customer.update({
      where: { id },
      data,
      include: CUSTOMER_INCLUDE,
    });
  }

  async updateNotes(id: string, tenantId: string, notes: string) {
    await this.ensureOwnership(id, tenantId);
    return this.prisma.customer.update({
      where: { id },
      data: { notes },
    });
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  async addAddress(customerId: string, tenantId: string, dto: CreateAddressDto) {
    await this.ensureOwnership(customerId, tenantId);
    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.customerAddress.create({
      data: { ...dto, customerId },
    });
  }

  async updateAddress(addressId: string, customerId: string, tenantId: string, dto: Partial<CreateAddressDto>) {
    await this.ensureOwnership(customerId, tenantId);
    if (dto.isDefault) {
      await this.prisma.customerAddress.updateMany({
        where: { customerId, isDefault: true },
        data: { isDefault: false },
      });
    }
    return this.prisma.customerAddress.update({
      where: { id: addressId },
      data: dto,
    });
  }

  async removeAddress(addressId: string, customerId: string, tenantId: string) {
    await this.ensureOwnership(customerId, tenantId);
    return this.prisma.customerAddress.delete({ where: { id: addressId } });
  }

  // ── Tags ──────────────────────────────────────────────────────────────────

  async findAllTags(tenantId: string) {
    return this.prisma.customerTag.findMany({
      where: { tenantId },
      include: { _count: { select: { customers: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createTag(tenantId: string, name: string, color?: string) {
    return this.prisma.customerTag.create({
      data: { tenantId, name, ...(color ? { color } : {}) },
    });
  }

  async deleteTag(tagId: string, tenantId: string) {
    const tag = await this.prisma.customerTag.findFirst({ where: { id: tagId, tenantId } });
    if (!tag) throw new NotFoundException('Tag introuvable');
    return this.prisma.customerTag.delete({ where: { id: tagId } });
  }

  async addTagToCustomer(customerId: string, tagId: string, tenantId: string) {
    await this.ensureOwnership(customerId, tenantId);
    return this.prisma.customerTagLink.create({
      data: { customerId, tagId },
    });
  }

  async removeTagFromCustomer(customerId: string, tagId: string, tenantId: string) {
    await this.ensureOwnership(customerId, tenantId);
    return this.prisma.customerTagLink.delete({
      where: { customerId_tagId: { customerId, tagId } },
    });
  }

  // ── Segments (calculés dynamiquement) ─────────────────────────────────────

  async getSegmentCounts(tenantId: string) {
    const now = new Date();
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
    const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
    const d120 = new Date(now); d120.setDate(d120.getDate() - 120);

    const [total, newCount, active, atRisk, inactive] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId, createdAt: { gte: d30 } } }),
      this.prisma.customer.count({ where: { tenantId, lastOrderAt: { gte: d60 } } }),
      this.prisma.customer.count({
        where: { tenantId, lastOrderAt: { lt: d60, gte: d120 } },
      }),
      this.prisma.customer.count({
        where: {
          tenantId,
          OR: [
            { lastOrderAt: { lt: d120 } },
            { lastOrderAt: null },
          ],
        },
      }),
    ]);

    // VIP : orderCount > 10 OU top spenders
    const vip = await this.prisma.customer.count({
      where: { tenantId, orderCount: { gt: 10 } },
    });

    return { ALL: total, NEW: newCount, ACTIVE: active, VIP: vip, AT_RISK: atRisk, INACTIVE: inactive };
  }

  private getSegmentFilter(segment: string): Prisma.CustomerWhereInput {
    const now = new Date();
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
    const d60 = new Date(now); d60.setDate(d60.getDate() - 60);
    const d120 = new Date(now); d120.setDate(d120.getDate() - 120);

    switch (segment) {
      case 'NEW': return { createdAt: { gte: d30 } };
      case 'ACTIVE': return { lastOrderAt: { gte: d60 } };
      case 'VIP': return { orderCount: { gt: 10 } };
      case 'AT_RISK': return { lastOrderAt: { lt: d60, gte: d120 } };
      case 'INACTIVE': return { OR: [{ lastOrderAt: { lt: d120 } }, { lastOrderAt: null }] };
      default: return {};
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  async getStats(tenantId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const d60 = new Date(now); d60.setDate(d60.getDate() - 60);

    const [totalCustomers, newThisMonth, activeCustomers, avgResult] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId } }),
      this.prisma.customer.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      this.prisma.customer.count({ where: { tenantId, lastOrderAt: { gte: d60 } } }),
      this.prisma.customer.aggregate({
        where: { tenantId, orderCount: { gt: 0 } },
        _avg: { totalSpent: true },
      }),
    ]);

    return {
      totalCustomers,
      newThisMonth,
      activeCustomers,
      averageOrderValue: Number(avgResult._avg.totalSpent ?? 0),
    };
  }

  // ── Customer orders ───────────────────────────────────────────────────────

  async getCustomerOrders(customerId: string, tenantId: string, page = 1, limit = 10) {
    await this.ensureOwnership(customerId, tenantId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { customerId },
        select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where: { customerId } }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── CSV Export ─────────────────────────────────────────────────────────────

  async exportCsv(tenantId: string): Promise<string> {
    const customers = await this.prisma.customer.findMany({
      where: { tenantId },
      include: { tags: { include: { tag: true } }, addresses: { where: { isDefault: true }, take: 1 } },
      orderBy: { totalSpent: 'desc' },
    });

    const header = 'Prénom;Nom;Téléphone;Email;Entreprise;MF;Commandes;Total dépensé;Dernière commande;Tags;Ville;Gouvernorat';
    const rows = customers.map((c) =>
      [
        c.firstName, c.lastName, c.phone, c.email ?? '',
        c.company ?? '', c.matriculeFiscal ?? '',
        c.orderCount, Number(c.totalSpent).toFixed(2),
        c.lastOrderAt ? c.lastOrderAt.toISOString().slice(0, 10) : '',
        c.tags.map((t) => t.tag.name).join(', '),
        c.addresses[0]?.city ?? '', c.addresses[0]?.governorate ?? '',
      ].join(';'),
    );
    return [header, ...rows].join('\n');
  }

  // ── Migration données existantes ──────────────────────────────────────────

  async migrateExistingOrders(): Promise<{ migrated: number; linked: number }> {
    const orders = await this.prisma.order.findMany({
      where: { customerId: null },
      select: {
        id: true, tenantId: true, customerName: true,
        customerPhone: true, customerEmail: true,
        totalAmount: true, status: true, createdAt: true,
        shippingAddress: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const groups = new Map<string, typeof orders>();
    for (const o of orders) {
      const phone = normalizePhone(o.customerPhone);
      const key = `${phone}::${o.tenantId}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(o);
    }

    let migrated = 0;
    let linked = 0;

    for (const [, groupOrders] of groups) {
      const first = groupOrders[0];
      const phone = normalizePhone(first.customerPhone);
      const { firstName, lastName } = splitName(first.customerName);
      const totalSpent = groupOrders
        .filter((o) => o.status !== 'CANCELLED')
        .reduce((sum, o) => sum + Number(o.totalAmount), 0);
      const lastOrder = groupOrders[groupOrders.length - 1];

      const customer = await this.prisma.customer.upsert({
        where: { phone_tenantId: { phone, tenantId: first.tenantId } },
        create: {
          tenantId: first.tenantId,
          firstName,
          lastName,
          phone,
          email: first.customerEmail ?? undefined,
          source: CustomerSource.CHECKOUT,
          totalSpent,
          orderCount: groupOrders.length,
          lastOrderAt: lastOrder.createdAt,
        },
        update: {},
      });

      await this.prisma.order.updateMany({
        where: { id: { in: groupOrders.map((o) => o.id) } },
        data: { customerId: customer.id },
      });

      // Extraire adresse du premier order avec shippingAddress
      const orderWithAddr = groupOrders.find((o) => o.shippingAddress);
      if (orderWithAddr) {
        await this.maybeCreateAddressFromOrder(customer.id, orderWithAddr.shippingAddress);
      }

      migrated++;
      linked += groupOrders.length;
    }

    return { migrated, linked };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async ensureOwnership(customerId: string, tenantId: string) {
    const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId } });
    if (!c) throw new NotFoundException('Client introuvable');
  }
}
