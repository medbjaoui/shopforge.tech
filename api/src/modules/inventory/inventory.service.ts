import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StockMovementType, Prisma } from '@prisma/client';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Cœur : enregistre un mouvement de stock dans une transaction atomique.
   * Met à jour le stock du produit/variante ET crée l'entrée StockMovement.
   */
  async recordMovement(
    tenantId: string,
    data: {
      productId: string;
      variantId?: string;
      type: StockMovementType;
      quantity: number; // signé
      reason?: string;
      reference?: string;
      costPrice?: number;
    },
  ) {
    return this.prisma.$transaction(async (tx) => {
      let stockBefore: number;
      let stockAfter: number;

      if (data.variantId) {
        const variant = await tx.productVariant.findUniqueOrThrow({
          where: { id: data.variantId },
        });
        stockBefore = variant.stock;
        stockAfter = stockBefore + data.quantity;
        if (stockAfter < 0) {
          throw new BadRequestException(
            `Stock insuffisant. Stock actuel : ${stockBefore}, ajustement : ${data.quantity}`,
          );
        }
        await tx.productVariant.update({
          where: { id: data.variantId },
          data: { stock: stockAfter },
        });
      } else {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: data.productId },
        });
        stockBefore = product.stock;
        stockAfter = stockBefore + data.quantity;
        if (stockAfter < 0) {
          throw new BadRequestException(
            `Stock insuffisant. Stock actuel : ${stockBefore}, ajustement : ${data.quantity}`,
          );
        }
        await tx.product.update({
          where: { id: data.productId },
          data: { stock: stockAfter },
        });
      }

      return tx.stockMovement.create({
        data: {
          tenantId,
          productId: data.productId,
          variantId: data.variantId ?? null,
          type: data.type,
          quantity: data.quantity,
          reason: data.reason,
          reference: data.reference,
          costPrice: data.costPrice,
          stockBefore,
          stockAfter,
        },
      });
    });
  }

  /**
   * Enregistre les mouvements SALE lors de la création d'une commande.
   * Appelé depuis OrdersService.create() DANS la transaction existante.
   */
  async recordSaleInTransaction(
    tx: Prisma.TransactionClient,
    tenantId: string,
    items: { productId: string; variantId: string | null; quantity: number }[],
    orderNumber: string,
  ) {
    for (const item of items) {
      let stockBefore: number;
      let stockAfter: number;

      if (item.variantId) {
        const variant = await tx.productVariant.findUniqueOrThrow({
          where: { id: item.variantId },
        });
        stockBefore = variant.stock;
        stockAfter = stockBefore - item.quantity;
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stock: stockAfter },
        });
      } else {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: item.productId },
        });
        stockBefore = product.stock;
        stockAfter = stockBefore - item.quantity;
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: stockAfter },
        });
      }

      await tx.stockMovement.create({
        data: {
          tenantId,
          productId: item.productId,
          variantId: item.variantId,
          type: StockMovementType.SALE,
          quantity: -item.quantity,
          reference: orderNumber,
          stockBefore,
          stockAfter,
        },
      });
    }
  }

  /**
   * Enregistre les mouvements RETURN lors d'une annulation/retour/remboursement.
   * Appelé depuis OrdersService.updateStatus() et processRefund().
   */
  async recordReturn(
    tenantId: string,
    items: { productId: string; variantId: string | null; quantity: number }[],
    orderNumber: string,
  ) {
    for (const item of items) {
      await this.recordMovement(tenantId, {
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        type: StockMovementType.RETURN,
        quantity: item.quantity,
        reference: orderNumber,
      });
    }
  }

  /**
   * Ajustement manuel depuis le dashboard.
   */
  async adjustStock(tenantId: string, dto: AdjustStockDto) {
    // Vérifier que le produit appartient au tenant
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, tenantId },
    });
    if (!product) throw new NotFoundException('Produit introuvable');

    if (dto.variantId) {
      const variant = await this.prisma.productVariant.findFirst({
        where: { id: dto.variantId, productId: dto.productId },
      });
      if (!variant) throw new NotFoundException('Variante introuvable');
    }

    return this.recordMovement(tenantId, {
      productId: dto.productId,
      variantId: dto.variantId,
      type: dto.type,
      quantity: dto.quantity,
      reason: dto.reason,
      costPrice: dto.costPrice,
    });
  }

  /**
   * Liste des mouvements paginée avec filtres.
   */
  async findMovements(tenantId: string, query: QueryMovementsDto) {
    const page = parseInt(query.page ?? '1') || 1;
    const limit = parseInt(query.limit ?? '20') || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.StockMovementWhereInput = {
      tenantId,
      ...(query.productId ? { productId: query.productId } : {}),
      ...(query.type ? { type: query.type } : {}),
      ...(query.dateFrom || query.dateTo
        ? {
            createdAt: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo + 'T23:59:59Z') } : {}),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { name: true } },
          variant: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Résumé santé du stock pour le dashboard.
   */
  async getSummary(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      select: { stock: true, costPrice: true, lowStockThreshold: true },
    });

    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, p) => {
      return sum + p.stock * Number(p.costPrice ?? 0);
    }, 0);
    const lowStockCount = products.filter(
      (p) => p.stock > 0 && p.stock <= p.lowStockThreshold,
    ).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;

    const recentMovements = await this.prisma.stockMovement.findMany({
      where: { tenantId },
      include: {
        product: { select: { name: true } },
        variant: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return { totalProducts, totalStockValue, lowStockCount, outOfStockCount, recentMovements };
  }

  /**
   * Export CSV des mouvements.
   */
  async exportMovementsCsv(tenantId: string): Promise<string> {
    const movements = await this.prisma.stockMovement.findMany({
      where: { tenantId },
      include: {
        product: { select: { name: true } },
        variant: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = 'Date;Produit;Variante;Type;Quantité;Stock avant;Stock après;Raison;Référence';
    const rows = movements.map((m) =>
      [
        m.createdAt.toISOString().slice(0, 10),
        m.product.name,
        m.variant?.name ?? '',
        m.type,
        m.quantity > 0 ? `+${m.quantity}` : String(m.quantity),
        m.stockBefore,
        m.stockAfter,
        m.reason ?? '',
        m.reference ?? '',
      ].join(';'),
    );
    return [header, ...rows].join('\n');
  }
}
