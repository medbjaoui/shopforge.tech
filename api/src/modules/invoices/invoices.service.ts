import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import {
  computeHT,
  computeTVA,
  roundTo3,
  formatInvoiceNumber,
  getDynamicTvaRate,
  getDynamicTimbreFiscal,
  getDynamicInvoicePrefix,
} from '../../common/fiscal/invoice-utils';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private config: PlatformConfigService,
  ) {}

  // ─── Génération ────────────────────────────────────────────────────────────

  async generateInvoiceForOrder(orderId: string) {
    // Vérifier si facture existe déjà
    const existing = await this.prisma.invoice.findUnique({
      where: { orderId },
    });
    if (existing) return existing;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true, variant: true } },
        tenant: true,
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    // Matricule fiscal obligatoire
    if (!order.tenant.matriculeFiscal) {
      throw new BadRequestException(
        `La boutique "${order.tenant.name}" n'a pas de matricule fiscal. La facture ne peut pas être générée.`,
      );
    }

    // Valeurs fiscales dynamiques
    const tvaRate = getDynamicTvaRate(this.config);
    const timbreFiscal = getDynamicTimbreFiscal(this.config);
    const invPrefix = getDynamicInvoicePrefix(this.config);

    // Numéro séquentiel pour l'année en cours
    const year = new Date().getFullYear();
    const prefix = `${invPrefix}-${year}-`;
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
    });
    const lastSeq = lastInvoice
      ? parseInt(lastInvoice.invoiceNumber.replace(prefix, ''), 10)
      : 0;
    const invoiceNumber = formatInvoiceNumber(year, lastSeq + 1, invPrefix);

    // Calcul HT/TVA par ligne
    const invoiceItems = order.items.map((item) => {
      const unitTTC = Number(item.unitPrice);
      const unitHT = computeHT(unitTTC, tvaRate);
      const lineHT = roundTo3(unitHT * item.quantity);
      const lineTTC = Math.round(unitTTC * item.quantity * 100) / 100;
      const lineTVA = computeTVA(lineTTC, lineHT);
      const description = item.variant
        ? `${item.product.name} (${item.variant.name})`
        : item.product.name;

      return {
        description,
        quantity: item.quantity,
        unitPriceHT: unitHT,
        unitPriceTTC: unitTTC,
        totalHT: lineHT,
        totalTVA: lineTVA,
        totalTTC: lineTTC,
        tvaRate,
      };
    });

    // Frais de livraison
    const shippingTTC = Number(order.shippingFee);
    const shippingHT = computeHT(shippingTTC, tvaRate);
    const shippingTVA = computeTVA(shippingTTC, shippingHT);

    // Totaux
    const itemsHT = invoiceItems.reduce((s, i) => s + i.totalHT, 0);
    const itemsTVA = invoiceItems.reduce((s, i) => s + i.totalTVA, 0);
    const totalHT = roundTo3(itemsHT + shippingHT);
    const totalTVA = roundTo3(itemsTVA + shippingTVA);
    const totalTTC = Number(order.totalAmount);
    const finalTotal = Math.round((totalTTC + timbreFiscal) * 100) / 100;

    return this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          status: 'ISSUED',
          totalHT,
          totalTVA,
          totalTTC,
          timbreFiscal: timbreFiscal,
          shippingFeeHT: shippingHT,
          shippingFeeTVA: shippingTVA,
          discountAmount: Number(order.discountAmount),
          finalTotal,
          tvaRate,
          sellerName: order.tenant.name,
          sellerAddress: order.tenant.address,
          sellerPhone: order.tenant.phone,
          sellerEmail: order.tenant.contactEmail,
          sellerMF: order.tenant.matriculeFiscal!,
          sellerRNE: order.tenant.rne,
          buyerName: order.customerName,
          buyerEmail: order.customerEmail ?? '',
          buyerPhone: order.customerPhone,
          buyerAddress: order.shippingAddress ?? undefined,
          paymentMethod: order.paymentMethod,
          orderId: order.id,
          tenantId: order.tenantId,
          items: { create: invoiceItems },
        },
        include: { items: true },
      });
      return invoice;
    });
  }

  // ─── Lecture ────────────────────────────────────────────────────────────────

  async getAllInvoices(
    page = 1,
    limit = 30,
    tenantId?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { buyerName: { contains: search, mode: 'insensitive' } },
        { sellerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        skip,
        take: limit,
        where,
        orderBy: { issuedAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalTTC: true,
          finalTotal: true,
          timbreFiscal: true,
          totalTVA: true,
          sellerName: true,
          buyerName: true,
          buyerEmail: true,
          paymentMethod: true,
          issuedAt: true,
          tenant: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { invoices, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getInvoiceById(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
          },
        },
        tenant: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    return invoice;
  }

  async getInvoiceByIdForTenant(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });
    if (!invoice) throw new NotFoundException('Facture introuvable');
    return invoice;
  }

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getTenantInvoiceStats(tenantId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalInvoices, monthInvoices, totalAgg, monthAgg] =
      await Promise.all([
        this.prisma.invoice.count({ where: { tenantId, status: 'ISSUED' } }),
        this.prisma.invoice.count({
          where: { tenantId, status: 'ISSUED', issuedAt: { gte: startOfMonth } },
        }),
        this.prisma.invoice.aggregate({
          where: { tenantId, status: 'ISSUED' },
          _sum: { finalTotal: true, totalTVA: true },
        }),
        this.prisma.invoice.aggregate({
          where: { tenantId, status: 'ISSUED', issuedAt: { gte: startOfMonth } },
          _sum: { finalTotal: true, totalTVA: true },
        }),
      ]);

    return {
      totalInvoices,
      monthInvoices,
      totalRevenue: totalAgg._sum.finalTotal ?? 0,
      totalTVA: totalAgg._sum.totalTVA ?? 0,
      monthRevenue: monthAgg._sum.finalTotal ?? 0,
      monthTVA: monthAgg._sum.totalTVA ?? 0,
    };
  }

  async getInvoiceStats() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalInvoices, monthInvoices, totalAgg, monthAgg] =
      await Promise.all([
        this.prisma.invoice.count({ where: { status: 'ISSUED' } }),
        this.prisma.invoice.count({
          where: { status: 'ISSUED', issuedAt: { gte: startOfMonth } },
        }),
        this.prisma.invoice.aggregate({
          where: { status: 'ISSUED' },
          _sum: { finalTotal: true, totalTVA: true },
        }),
        this.prisma.invoice.aggregate({
          where: { status: 'ISSUED', issuedAt: { gte: startOfMonth } },
          _sum: { finalTotal: true, totalTVA: true },
        }),
      ]);

    return {
      totalInvoices,
      monthInvoices,
      totalRevenue: totalAgg._sum.finalTotal ?? 0,
      totalTVA: totalAgg._sum.totalTVA ?? 0,
      monthRevenue: monthAgg._sum.finalTotal ?? 0,
      monthTVA: monthAgg._sum.totalTVA ?? 0,
    };
  }
}
