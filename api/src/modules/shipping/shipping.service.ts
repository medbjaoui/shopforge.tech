import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ShipmentStatus, OrderStatus } from '@prisma/client';
import { CarrierAdapter, CreateShipmentData } from './adapters/carrier.adapter';
import { AramexAdapter } from './adapters/aramex.adapter';
import { DhlAdapter } from './adapters/dhl.adapter';
import { LaPosteTnAdapter } from './adapters/laposte-tn.adapter';
import { GenericAdapter } from './adapters/generic.adapter';
import { AbmDeliveryAdapter } from './adapters/abm-delivery.adapter';
import { FirstDeliveryAdapter } from './adapters/first-delivery.adapter';

@Injectable()
export class ShippingService {
  constructor(private prisma: PrismaService) {}

  // ─── ADAPTER FACTORY ──────────────────────────────────────────────────────

  private buildAdapter(apiType: string, apiBaseUrl?: string | null): CarrierAdapter {
    switch (apiType) {
      case 'aramex':
        return new AramexAdapter(apiBaseUrl ?? undefined);
      case 'dhl':
        return new DhlAdapter(apiBaseUrl ?? undefined);
      case 'laposte-tn':
        return new LaPosteTnAdapter(apiBaseUrl ?? undefined);
      case 'abm-delivery':
        return new AbmDeliveryAdapter(apiBaseUrl ?? undefined);
      case 'first-delivery':
        return new FirstDeliveryAdapter(apiBaseUrl ?? undefined);
      default:
        return new GenericAdapter(apiBaseUrl ?? undefined);
    }
  }

  // ─── CARRIERS DISPONIBLES (côté boutique) ─────────────────────────────────

  async getAvailableCarriers() {
    return this.prisma.carrier.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        description: true,
        apiType: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  // ─── TRANSPORTEURS DE LA BOUTIQUE ─────────────────────────────────────────

  async getTenantCarriers(tenantId: string) {
    return this.prisma.tenantCarrier.findMany({
      where: { tenantId },
      include: {
        carrier: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
            apiType: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async configureCarrier(
    tenantId: string,
    carrierId: string,
    apiKey?: string,
    isDefault?: boolean,
  ) {
    // Vérifier que le carrier existe et est actif
    const carrier = await this.prisma.carrier.findUnique({ where: { id: carrierId } });
    if (!carrier || !carrier.isActive) throw new NotFoundException('Transporteur introuvable');

    // Si on définit ce carrier comme défaut, retirer le défaut des autres
    if (isDefault) {
      await this.prisma.tenantCarrier.updateMany({
        where: { tenantId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.tenantCarrier.upsert({
      where: { tenantId_carrierId: { tenantId, carrierId } },
      create: { tenantId, carrierId, apiKey, isDefault: isDefault ?? false },
      update: { apiKey, isDefault: isDefault ?? false, isActive: true },
    });
  }

  async removeCarrier(tenantId: string, carrierId: string) {
    const existing = await this.prisma.tenantCarrier.findUnique({
      where: { tenantId_carrierId: { tenantId, carrierId } },
    });
    if (!existing) throw new NotFoundException('Configuration transporteur introuvable');

    return this.prisma.tenantCarrier.delete({
      where: { tenantId_carrierId: { tenantId, carrierId } },
    });
  }

  async setDefaultCarrier(tenantId: string, carrierId: string) {
    await this.prisma.tenantCarrier.updateMany({
      where: { tenantId },
      data: { isDefault: false },
    });
    return this.prisma.tenantCarrier.update({
      where: { tenantId_carrierId: { tenantId, carrierId } },
      data: { isDefault: true },
    });
  }

  // ─── EXPÉDITIONS ──────────────────────────────────────────────────────────

  async getShipmentByOrderId(orderId: string, tenantId: string) {
    return this.prisma.shipment.findFirst({
      where: { orderId, tenantId },
      include: {
        carrier: { select: { name: true, slug: true, logoUrl: true, apiType: true } },
      },
    });
  }

  // Appelé automatiquement quand une commande passe en SHIPPED
  async createShipmentForOrder(orderId: string, tenantId: string): Promise<void> {
    // Éviter les doublons
    const existing = await this.prisma.shipment.findUnique({ where: { orderId } });
    if (existing) return;

    // Charger la commande + articles
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { items: { include: { product: true } } },
    });
    if (!order) return;

    // Trouver le carrier par défaut du tenant (isDefault en premier, sinon le plus ancien actif)
    const tenantCarrier = await this.prisma.tenantCarrier.findFirst({
      where: { tenantId, isActive: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      include: { carrier: true },
    });
    if (!tenantCarrier) return; // Pas de carrier configuré — pas d'expédition créée

    // Charger les infos expéditeur (boutique)
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    const t = tenant as any;

    // Description produits
    const productDescription = order.items
      .map((i) => {
        const p = i.product as any;
        return `${p.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}`;
      })
      .join(', ') || order.orderNumber;

    // Adresse destinataire depuis shippingAddress (JSON)
    const addr = order.shippingAddress as Record<string, string> | null;
    const customerAddress = addr ? Object.values(addr).filter(Boolean).join(', ') : '';
    const customerCity = addr?.city ?? addr?.ville ?? '';
    const customerGovernorate = addr?.gouvernorat ?? addr?.governorate ?? customerCity;
    const customerPostalCode = addr?.postalCode ?? addr?.codePostal ?? '';

    const createData: CreateShipmentData = {
      orderNumber: order.orderNumber,
      productDescription,
      itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
      codAmount: Number(order.totalAmount),
      senderName: tenant?.name ?? '',
      senderPhone: t?.phone ?? '',
      senderEmail: t?.contactEmail ?? t?.email ?? '',
      senderAddress: t?.address ?? '',
      senderCity: '',
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail ?? '',
      customerAddress,
      customerCity,
      customerGovernorate,
      customerPostalCode,
    };

    const adapter = this.buildAdapter(
      tenantCarrier.carrier.apiType,
      tenantCarrier.carrier.apiBaseUrl,
    );

    let barCode = order.orderNumber;
    try {
      const result = await adapter.create(createData, tenantCarrier.apiKey ?? undefined);
      barCode = result.barCode;
    } catch {
      // Fallback au numéro de commande si l'API échoue
    }

    const trackingUrl = adapter.buildTrackingUrl(barCode);

    await this.prisma.shipment.create({
      data: {
        orderId,
        tenantId,
        carrierId: tenantCarrier.carrierId,
        trackingNumber: barCode,
        trackingUrl,
        status: ShipmentStatus.PENDING,
      },
    });
  }

  async getShipments(tenantId: string) {
    return this.prisma.shipment.findMany({
      where: { tenantId },
      include: {
        carrier: { select: { name: true, slug: true, logoUrl: true } },
        order: { select: { orderNumber: true, customerName: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createShipment(
    tenantId: string,
    orderId: string,
    carrierId: string,
    trackingNumber?: string,
    notes?: string,
  ) {
    // Vérifier que la commande appartient au tenant
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
    });
    if (!order) throw new NotFoundException('Commande introuvable');

    // Vérifier qu'il n'y a pas déjà une expédition
    const existing = await this.prisma.shipment.findUnique({ where: { orderId } });
    if (existing) throw new ConflictException('Une expédition existe déjà pour cette commande');

    // Vérifier que le carrier est configuré pour ce tenant
    const tenantCarrier = await this.prisma.tenantCarrier.findUnique({
      where: { tenantId_carrierId: { tenantId, carrierId } },
      include: { carrier: true },
    });
    if (!tenantCarrier) throw new BadRequestException('Transporteur non configuré pour cette boutique');

    // Construire l'URL de tracking
    const adapter = this.buildAdapter(
      tenantCarrier.carrier.apiType,
      tenantCarrier.carrier.apiBaseUrl,
    );
    const trackingUrl = trackingNumber ? adapter.buildTrackingUrl(trackingNumber) : undefined;

    // Créer l'expédition + passer la commande en SHIPPED
    const [shipment] = await this.prisma.$transaction([
      this.prisma.shipment.create({
        data: {
          orderId,
          tenantId,
          carrierId,
          trackingNumber,
          trackingUrl,
          notes,
          status: ShipmentStatus.PENDING,
        },
        include: {
          carrier: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.SHIPPED },
      }),
    ]);

    return shipment;
  }

  async syncShipment(shipmentId: string, tenantId: string) {
    const shipment = await this.prisma.shipment.findFirst({
      where: { id: shipmentId, tenantId },
      include: { carrier: true },
    });
    if (!shipment) throw new NotFoundException('Expédition introuvable');
    if (!shipment.trackingNumber) throw new BadRequestException('Aucun numéro de suivi associé');

    // Récupérer la clé API du tenant pour ce carrier
    const tenantCarrier = await this.prisma.tenantCarrier.findUnique({
      where: { tenantId_carrierId: { tenantId, carrierId: shipment.carrierId } },
    });

    const adapter = this.buildAdapter(shipment.carrier.apiType, shipment.carrier.apiBaseUrl);
    const result = await adapter.track(shipment.trackingNumber, tenantCarrier?.apiKey ?? undefined);

    // Mettre à jour l'expédition
    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: result.status,
        rawStatus: result.rawStatus,
        trackingUrl: result.trackingUrl ?? shipment.trackingUrl,
        lastSyncedAt: new Date(),
      },
    });

    // Si livré, passer la commande en DELIVERED
    if (result.status === ShipmentStatus.DELIVERED) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: OrderStatus.DELIVERED },
      });
    }

    return { ...updated, events: result.events ?? [] };
  }

  // ─── WEBHOOK ──────────────────────────────────────────────────────────────

  async handleWebhook(carrierSlug: string, payload: Record<string, unknown>) {
    const carrier = await this.prisma.carrier.findUnique({ where: { slug: carrierSlug } });
    if (!carrier) return { ignored: true };

    // Chercher l'expédition par tracking number (le payload doit contenir un tracking number)
    const trackingNumber =
      (payload.trackingNumber as string) ||
      (payload.tracking_number as string) ||
      (payload.numero as string);

    if (!trackingNumber) return { ignored: true };

    const shipment = await this.prisma.shipment.findFirst({
      where: { trackingNumber, carrierId: carrier.id },
    });
    if (!shipment) return { ignored: true };

    // Récupérer le statut brut depuis le payload
    const rawStatus =
      (payload.status as string) ||
      (payload.statut as string) ||
      (payload.state as string) ||
      'UNKNOWN';

    const adapter = this.buildAdapter(carrier.apiType, carrier.apiBaseUrl);
    const result = await adapter.track(trackingNumber, undefined);

    await this.prisma.shipment.update({
      where: { id: shipment.id },
      data: {
        status: result.status,
        rawStatus,
        lastSyncedAt: new Date(),
      },
    });

    if (result.status === ShipmentStatus.DELIVERED) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: { status: OrderStatus.DELIVERED },
      });
    }

    return { processed: true, shipmentId: shipment.id };
  }
}
