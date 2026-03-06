import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus, PaymentMethod } from '@prisma/client';
import { isUnlimited, getDynamicPlanLimits } from '../../common/billing/plan-limits';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { CouponsService } from '../coupons/coupons.service';
import { ShippingService } from '../shipping/shipping.service';
import { InvoicesService } from '../invoices/invoices.service';
import { InventoryService } from '../inventory/inventory.service';
import { CustomersService } from '../customers/customers.service';
import { EmailService } from '../email/email.service';
import { WalletService } from '../wallet/wallet.service';
import { TelegramService } from '../telegram/telegram.service';
import { MetaService } from '../meta/meta.service';
import { LoyaltyService } from '../loyalty/loyalty.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private couponsService: CouponsService,
    private shippingService: ShippingService,
    private invoicesService: InvoicesService,
    private inventoryService: InventoryService,
    private customersService: CustomersService,
    private platformConfig: PlatformConfigService,
    private emailService: EmailService,
    private walletService: WalletService,
    private telegramService: TelegramService,
    private metaService: MetaService,
    private loyaltyService: LoyaltyService,
  ) {}

  async findAll(tenantId: string, status?: string, search?: string, page = 1, limit = 20) {
    const where = {
      tenantId,
      ...(status && status !== 'ALL' ? { status: status as OrderStatus } : {}),
      ...(search
        ? {
            OR: [
              { orderNumber: { contains: search, mode: 'insensitive' as const } },
              { customerName: { contains: search, mode: 'insensitive' as const } },
              { customerEmail: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: { items: { include: { product: true, variant: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getStats(tenantId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfPrevMonth = new Date(startOfMonth);
    startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      monthOrders,
      todayOrders,
      pendingOrders,
      totalRevenue,
      monthRevenue,
      todayRevenue,
      previousMonthOrders,
      previousMonthRevenue,
    ] = await Promise.all([
      this.prisma.order.count({ where: { tenantId } }),
      this.prisma.order.count({ where: { tenantId, createdAt: { gte: startOfMonth } } }),
      this.prisma.order.count({ where: { tenantId, createdAt: { gte: startOfToday } } }),
      this.prisma.order.count({ where: { tenantId, status: 'PENDING' } }),
      this.prisma.order.aggregate({
        where: { tenantId, NOT: { status: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: startOfMonth }, NOT: { status: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: startOfToday }, NOT: { status: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: { tenantId, createdAt: { gte: startOfPrevMonth, lt: startOfMonth } },
      }),
      this.prisma.order.aggregate({
        where: { tenantId, createdAt: { gte: startOfPrevMonth, lt: startOfMonth }, NOT: { status: 'CANCELLED' } },
        _sum: { totalAmount: true },
      }),
    ]);

    return {
      totalOrders,
      monthOrders,
      todayOrders,
      pendingOrders,
      totalRevenue: Number(totalRevenue._sum.totalAmount ?? 0),
      monthRevenue: Number(monthRevenue._sum.totalAmount ?? 0),
      todayRevenue: Number(todayRevenue._sum.totalAmount ?? 0),
      previousMonthOrders,
      previousMonthRevenue: Number(previousMonthRevenue._sum.totalAmount ?? 0),
    };
  }

  async findOne(id: string, tenantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        items: { include: { product: true, variant: true } },
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }

  async create(tenantId: string, dto: CreateOrderDto) {
    // Vérifier la limite mensuelle de commandes du plan
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: {
        id: true, plan: true, isActive: true, slug: true,
        telegramChatId: true, notificationChannel: true,
        metaPixelId: true, metaAccessToken: true, metaIntegrationEnabled: true,
      },
    });
    const limits = getDynamicPlanLimits(this.platformConfig)[tenant.plan];

    if (!isUnlimited(limits.maxOrdersPerMonth)) {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const ordersThisMonth = await this.prisma.order.count({
        where: { tenantId, createdAt: { gte: startOfMonth } },
      });
      if (ordersThisMonth >= limits.maxOrdersPerMonth) {
        throw new ForbiddenException(
          `Limite atteinte : le plan ${limits.label} permet ${limits.maxOrdersPerMonth} commandes/mois.`,
        );
      }
    }

    const productIds = [...new Set(dto.items.map((i) => i.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, tenantId, isActive: true },
      include: { variants: true },
    });

    if (products.length !== productIds.length) {
      throw new BadRequestException('Un ou plusieurs produits sont invalides');
    }

    // Résoudre prix + variantes
    const resolvedItems = dto.items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      let unitPrice = Number(product.price);
      let variantId: string | null = null;

      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          throw new BadRequestException(`Variante ${item.variantId} invalide`);
        }
        if (variant.price !== null) unitPrice = Number(variant.price);
        variantId = variant.id;
      }

      return { productId: item.productId, variantId, quantity: item.quantity, unitPrice };
    });

    // Vérification du stock disponible
    for (const item of resolvedItems) {
      const product = products.find((p) => p.id === item.productId)!;
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId)!;
        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour "${product.name}" (${variant.name}). Disponible : ${variant.stock}`,
          );
        }
      } else {
        if (product.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour "${product.name}". Disponible : ${product.stock}`,
          );
        }
      }
    }

    const subtotal = resolvedItems.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    // Frais de livraison
    const tenantFull = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const rawShipping = Number(tenantFull.shippingFee ?? 0);
    const freeThreshold = Number(tenantFull.freeShippingThreshold ?? 0);
    const shippingFee = freeThreshold > 0 && subtotal >= freeThreshold ? 0 : rawShipping;

    // Coupon
    let discountAmount = 0;
    let couponCode: string | null = null;
    if (dto.couponCode?.trim()) {
      try {
        const result = await this.couponsService.validate(dto.couponCode, tenantId, subtotal);
        discountAmount = result.discount;
        couponCode = result.code;
      } catch {
        throw new BadRequestException('Code promo invalide');
      }
    }

    const totalAmount = Math.max(0, subtotal + shippingFee - discountAmount);
    const orderNumber = `ORD-${Date.now()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          totalAmount,
          shippingFee,
          discountAmount,
          couponCode,
          paymentMethod: dto.paymentMethod ?? PaymentMethod.COD,
          customerName: dto.customerName,
          customerEmail: dto.customerEmail ?? null,
          customerPhone: dto.customerPhone,
          shippingAddress: dto.shippingAddress,
          notes: dto.notes,
          tenantId,
          items: {
            create: resolvedItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: {
          items: { include: { product: true, variant: true } },
        },
      });

      // Décrémenter le stock + enregistrer mouvements SALE
      await this.inventoryService.recordSaleInTransaction(tx, tenantId, resolvedItems, orderNumber);

      return newOrder;
    });

    if (couponCode) {
      await this.couponsService.applyAndIncrement(couponCode, tenantId);
    }

    // Auto-créer/lier le client CRM
    try {
      const customerId = await this.customersService.findOrCreateFromOrder(tenantId, {
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerEmail: dto.customerEmail,
        totalAmount,
        shippingAddress: dto.shippingAddress,
      });
      await this.prisma.order.update({
        where: { id: order.id },
        data: { customerId },
      });
    } catch {
      // Non bloquant — le CRM ne doit pas empêcher la commande
    }

    // Notifications — email client toujours envoyé (LECE art. 25), canal marchand configurable
    this.emailService.sendOrderConfirmation(order, tenantId).catch(() => {});

    const channel = tenant.notificationChannel ?? 'EMAIL';
    if (channel !== 'TELEGRAM') {
      this.emailService.sendMerchantNotification(order, tenantId).catch(() => {});
    }
    if ((channel === 'TELEGRAM' || channel === 'BOTH') && tenant.telegramChatId) {
      this.telegramService.sendOrderAlert(tenant.telegramChatId, {
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        customerPhone: order.customerPhone ?? undefined,
        totalAmount: Number(order.totalAmount),
        paymentMethod: order.paymentMethod,
        items: (order as any).items ?? [],
        shippingAddress: typeof order.shippingAddress === 'string' ? order.shippingAddress : JSON.stringify(order.shippingAddress),
      }).catch(() => {});
    }

    // Meta Conversions API — server-side Purchase event (deduplication via order.id)
    this.metaService.trackPurchase({
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: Number(order.totalAmount),
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      items: (order as any).items ?? [],
      tenant: {
        metaPixelId: tenant.metaPixelId ?? null,
        metaAccessToken: tenant.metaAccessToken ?? null,
        metaIntegrationEnabled: tenant.metaIntegrationEnabled,
        slug: tenant.slug,
      },
    }).catch(() => {});

    // Analytics — mark activation (1st order + has products) + update lastActivityAt
    this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { activatedAt: true, referredById: true } })
      .then(async (t) => {
        const update: any = { lastActivityAt: new Date() };
        const isFirstActivation = !t?.activatedAt;
        if (isFirstActivation) {
          const hasProduct = await this.prisma.product.count({ where: { tenantId } });
          if (hasProduct > 0) update.activatedAt = new Date();
        }
        await this.prisma.tenant.update({ where: { id: tenantId }, data: update });

        // Parrainage — payer la récompense au parrain à la 1ère activation
        if (isFirstActivation && t?.referredById) {
          const reward = await this.prisma.referralReward.findUnique({
            where: { referredId: tenantId },
          });
          if (reward && reward.status === 'PENDING') {
            await this.prisma.referralReward.update({
              where: { referredId: tenantId },
              data: { status: 'PAID', paidAt: new Date() },
            });
            await this.walletService.topup(
              t.referredById,
              Number(reward.amount),
              `Récompense parrainage — filleul activé`,
            );
          }
        }
      }).catch(() => {});

    return order;
  }

  // D1 — Machine d'état commandes (transitions valides uniquement)
  private static readonly VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    PENDING:            [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
    CONFIRMED:          [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
    PROCESSING:         [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
    SHIPPED:            [OrderStatus.DELIVERED, OrderStatus.RETURN_REQUESTED, OrderStatus.CANCELLED],
    DELIVERED:          [OrderStatus.EXCHANGE_REQUESTED],  // état quasi-terminal — seul l'échange est possible
    RETURN_REQUESTED:   [OrderStatus.RETURNED, OrderStatus.SHIPPED],  // retour confirmé ou rejeté → retour à SHIPPED
    RETURNED:           [OrderStatus.REFUNDED],
    EXCHANGE_REQUESTED: [OrderStatus.EXCHANGED, OrderStatus.DELIVERED], // échange confirmé ou annulé
    CANCELLED:          [],
    REFUNDED:           [],
    EXCHANGED:          [],
  };

  async updateStatus(id: string, tenantId: string, status: OrderStatus, bypassValidation = false) {
    // Vérifier le solde wallet avant tout traitement marchand
    const canProcess = await this.walletService.canAcceptOrders(tenantId);
    if (!canProcess) {
      const minimum = this.platformConfig.getNumber('wallet_minimum_balance', 10);
      throw new ForbiddenException(
        `Solde wallet insuffisant (minimum ${minimum} TND). Rechargez votre compte pour traiter les commandes.`,
      );
    }

    const current = await this.findOne(id, tenantId);

    // D1 — Valider la transition
    if (!bypassValidation) {
      const validNext = OrdersService.VALID_TRANSITIONS[current.status];
      if (!validNext || !validNext.includes(status)) {
        const allowed = validNext?.join(', ') || 'aucune (état final)';
        throw new BadRequestException(
          `Transition invalide : ${current.status} → ${status}. Transitions autorisées : ${allowed}`,
        );
      }
    }

    // Vérifier le verrou transporteur
    const shipment = await this.prisma.shipment.findUnique({ where: { orderId: id } });
    const lockedStatuses = ['PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    if (shipment && lockedStatuses.includes(shipment.status)) {
      const canCancel =
        status === OrderStatus.CANCELLED &&
        ['FAILED', 'RETURNED'].includes(shipment.status);
      if (!canCancel) {
        throw new ForbiddenException(
          'Statut verrouillé : le transporteur a pris en charge ce colis.',
        );
      }
    }

    // Données supplémentaires selon le statut
    const extra: Record<string, any> = {};
    if (status === OrderStatus.RETURN_REQUESTED) {
      extra.returnRequestedAt = new Date();
    }
    if (status === OrderStatus.EXCHANGE_REQUESTED) {
      extra.exchangeRequestedAt = new Date();
    }
    if (status === OrderStatus.EXCHANGED) {
      extra.exchangedAt = new Date();
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status, ...extra },
    });

    // Ré-incrémenter le stock si annulation, retour confirmé ou échange confirmé
    const stockRestoreStatuses: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.RETURNED, OrderStatus.REFUNDED, OrderStatus.EXCHANGED];
    const hadStock = !stockRestoreStatuses.includes(current.status as OrderStatus);
    if (stockRestoreStatuses.includes(status) && hadStock) {
      await this.inventoryService.recordReturn(
        tenantId,
        current.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        current.orderNumber,
      );
    }

    // Créer automatiquement l'expédition chez le transporteur
    if (status === OrderStatus.SHIPPED) {
      try {
        await this.shippingService.createShipmentForOrder(id, tenantId);
      } catch {
        // Non bloquant — l'expédition peut être créée manuellement depuis l'onglet Livraison
      }
    }

    // Auto-générer la facture quand la commande est confirmée
    if (status === OrderStatus.CONFIRMED) {
      try {
        await this.invoicesService.generateInvoiceForOrder(id);
      } catch (err) {
        // Non bloquant — la facture peut être générée manuellement depuis l'admin
        console.warn(`[Invoice] Auto-generation failed for order ${id}:`, err?.message);
      }
    }

    // Déduire la commission plateforme sur livraison COD
    if (status === OrderStatus.DELIVERED) {
      const order = await this.prisma.order.findUnique({
        where: { id },
        include: { tenant: { select: { plan: true } } },
      });
      if (order) {
        this.walletService
          .deductCommission(tenantId, id, Number(order.totalAmount), order.tenant.plan)
          .catch((err) => console.warn(`[Wallet] Commission deduction failed for order ${id}:`, err?.message));

        // Attribuer des points de fidélité au client
        if (order.customerId) {
          this.loyaltyService
            .awardPointsForOrder(tenantId, id, Number(order.totalAmount), order.customerId)
            .catch((err) => console.warn(`[Loyalty] Points award failed for order ${id}:`, err?.message));

          // Points de bienvenue si 1ère commande
          this.loyaltyService
            .awardWelcomePoints(tenantId, order.customerId)
            .catch((err) => console.warn(`[Loyalty] Welcome points failed for customer ${order.customerId}:`, err?.message));
        }
      }
    }

    // Rembourser la commission uniquement si retour ou remboursement
    // (pas sur échange — livraison confirmée = commission acquise définitivement)
    if (status === OrderStatus.RETURNED || status === OrderStatus.REFUNDED) {
      this.walletService
        .refundCommission(tenantId, id)
        .catch((err) => console.warn(`[Wallet] Commission refund failed for order ${id}:`, err?.message));
    }

    return updated;
  }

  async requestReturn(id: string, tenantId: string, reason: string) {
    const order = await this.findOne(id, tenantId);
    const allowedStatuses: OrderStatus[] = [OrderStatus.SHIPPED, OrderStatus.DELIVERED];
    if (!allowedStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException('Le retour est possible uniquement depuis les états : Expédié ou Livré.');
    }
    // Vérifier le délai de 7 jours si la commande est déjà livrée (droit tunisien)
    if (order.status === OrderStatus.DELIVERED) {
      const deliveredDaysAgo = (Date.now() - new Date(order.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (deliveredDaysAgo > 7) {
        throw new BadRequestException('Le délai de rétractation de 7 jours est dépassé.');
      }
    }
    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.RETURN_REQUESTED,
        returnReason: reason,
        returnRequestedAt: new Date(),
      },
    });
  }

  async requestExchange(id: string, tenantId: string, reason: string) {
    const order = await this.findOne(id, tenantId);
    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException('L\'échange est possible uniquement sur une commande livrée.');
    }
    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.EXCHANGE_REQUESTED,
        exchangeReason: reason,
        exchangeRequestedAt: new Date(),
      },
    });
  }

  async processRefund(id: string, tenantId: string, amount: number) {
    const order = await this.findOne(id, tenantId);
    const validStatuses: OrderStatus[] = [OrderStatus.RETURN_REQUESTED, OrderStatus.RETURNED];
    if (!validStatuses.includes(order.status as OrderStatus)) {
      throw new BadRequestException('La commande doit être en retour pour être remboursée.');
    }
    if (amount <= 0 || amount > Number(order.totalAmount)) {
      throw new BadRequestException(`Montant invalide. Maximum : ${order.totalAmount} TND.`);
    }
    // Ré-incrémenter stock si pas encore fait (RETURN_REQUESTED → REFUNDED) + mouvements RETURN
    if (order.status === OrderStatus.RETURN_REQUESTED) {
      await this.inventoryService.recordReturn(
        tenantId,
        order.items.map((i) => ({ productId: i.productId, variantId: i.variantId, quantity: i.quantity })),
        order.orderNumber,
      );
    }
    return this.prisma.order.update({
      where: { id },
      data: {
        status: OrderStatus.REFUNDED,
        refundAmount: amount,
        refundedAt: new Date(),
      },
    });
  }

  async trackByOrderNumber(orderNumber: string, tenantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { orderNumber, tenantId },
      select: {
        orderNumber: true,
        status: true,
        createdAt: true,
        totalAmount: true,
        customerName: true,
        notes: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            product: { select: { name: true, slug: true } },
            variant: { select: { name: true } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException('Commande introuvable');
    return order;
  }

  async getCustomers(tenantId: string, page = 1, limit = 20) {
    const orders = await this.prisma.order.findMany({
      where: { tenantId },
      select: {
        customerName: true,
        customerEmail: true,
        customerPhone: true,
        totalAmount: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const map = new Map<string, {
      name: string; email: string | null; phone: string;
      orderCount: number; totalSpent: number; lastOrderAt: Date;
    }>();

    for (const o of orders) {
      const key = (o.customerEmail ?? o.customerPhone).toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: o.customerName,
          email: o.customerEmail,
          phone: o.customerPhone,
          orderCount: 0,
          totalSpent: 0,
          lastOrderAt: o.createdAt,
        });
      }
      const c = map.get(key)!;
      c.orderCount++;
      if (o.status !== 'CANCELLED') c.totalSpent += Number(o.totalAmount);
      if (o.createdAt > c.lastOrderAt) c.lastOrderAt = o.createdAt;
    }

    const all = Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
    const total = all.length;
    const skip = (page - 1) * limit;
    return { data: all.slice(skip, skip + limit), total, page, totalPages: Math.ceil(total / limit) };
  }

  async getAnalytics(tenantId: string, days = 30) {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const orders = await this.prisma.order.findMany({
      where: { tenantId, createdAt: { gte: startDate }, NOT: { status: 'CANCELLED' } },
      select: { createdAt: true, totalAmount: true },
    });

    // Daily revenue
    const dailyMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      dailyMap.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of orders) {
      const key = o.createdAt.toISOString().slice(0, 10);
      if (dailyMap.has(key)) {
        dailyMap.set(key, (dailyMap.get(key) ?? 0) + Number(o.totalAmount));
      }
    }
    const dailyRevenue = Array.from(dailyMap.entries()).map(([date, revenue]) => ({ date, revenue }));

    // Top products
    const itemsData = await this.prisma.orderItem.findMany({
      where: { order: { tenantId, NOT: { status: 'CANCELLED' } } },
      select: {
        quantity: true,
        unitPrice: true,
        product: { select: { id: true, name: true } },
      },
    });

    const productMap = new Map<string, { name: string; revenue: number; quantity: number }>();
    for (const item of itemsData) {
      const key = item.product.id;
      if (!productMap.has(key)) {
        productMap.set(key, { name: item.product.name, revenue: 0, quantity: 0 });
      }
      const p = productMap.get(key)!;
      p.revenue += Number(item.unitPrice) * item.quantity;
      p.quantity += item.quantity;
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Status distribution
    const statusGroups = await this.prisma.order.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });
    const statusDistribution = statusGroups.map((s) => ({ status: s.status, count: s._count }));

    return { dailyRevenue, topProducts, statusDistribution };
  }

  // ── Bulk Actions ─────────────────────────────────────────────────────────────

  async bulkUpdateStatus(tenantId: string, ids: string[], status: OrderStatus) {
    return this.prisma.order.updateMany({
      where: { id: { in: ids }, tenantId },
      data: { status },
    });
  }

  // ── CSV Export ──────────────────────────────────────────────────────────────

  async exportOrdersCsv(tenantId: string): Promise<string> {
    const orders = await this.prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
    const header = 'Numéro;Statut;Client;Email;Téléphone;Montant;Frais livraison;Remise;Paiement;Date';
    const rows = orders.map((o) =>
      [o.orderNumber, o.status, o.customerName, o.customerEmail, o.customerPhone ?? '',
       Number(o.totalAmount).toFixed(2), Number(o.shippingFee).toFixed(2), Number(o.discountAmount).toFixed(2),
       o.paymentMethod, o.createdAt.toISOString().slice(0, 10)].join(';'),
    );
    return [header, ...rows].join('\n');
  }

  async exportCustomersCsv(tenantId: string): Promise<string> {
    const { data: customers } = await this.getCustomers(tenantId, 1, 999999);
    const header = 'Nom;Email;Téléphone;Commandes;Total dépensé;Dernière commande';
    const rows = customers.map((c: any) =>
      [c.name, c.email, c.phone ?? '', c.orderCount, c.totalSpent.toFixed(2),
       new Date(c.lastOrderAt).toISOString().slice(0, 10)].join(';'),
    );
    return [header, ...rows].join('\n');
  }
}
