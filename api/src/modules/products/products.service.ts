import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { isUnlimited, getDynamicPlanLimits } from '../../common/billing/plan-limits';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { InventoryService } from '../inventory/inventory.service';
import { StockMovementType } from '@prisma/client';

const PRODUCT_INCLUDE = {
  category: true,
  variants: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private config: PlatformConfigService,
    private inventoryService: InventoryService,
  ) {}

  async findAll(tenantId: string, page = 1, limit = 20, search?: string) {
    const where = {
      tenantId,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async findBySlug(slug: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, tenantId, isActive: true },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException('Produit introuvable');
    return product;
  }

  async findAllPublic(tenantId: string, search?: string, categorySlug?: string, page = 1, limit = 20) {
    const where = {
      tenantId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(categorySlug ? { category: { slug: categorySlug } } : {}),
    };
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: PRODUCT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async create(tenantId: string, dto: CreateProductDto) {
    // Vérifier la limite du plan
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const limits = getDynamicPlanLimits(this.config)[tenant.plan];
    if (!isUnlimited(limits.maxProducts)) {
      const count = await this.prisma.product.count({ where: { tenantId } });
      if (count >= limits.maxProducts) {
        throw new ForbiddenException(
          `Limite atteinte : le plan ${limits.label} permet ${limits.maxProducts} produits. Passez au plan supérieur.`,
        );
      }
    }

    const existing = await this.prisma.product.findFirst({
      where: { slug: dto.slug, tenantId },
    });
    if (existing) throw new ConflictException('Un produit avec ce slug existe déjà');

    const product = await this.prisma.product.create({
      data: { ...dto, tenantId },
      include: PRODUCT_INCLUDE,
    });

    // Auto-publier la boutique au 1er produit ajouté
    if (!tenant.isPublished) {
      const productCount = await this.prisma.product.count({ where: { tenantId } });
      if (productCount === 1) {
        await this.prisma.tenant.update({ where: { id: tenantId }, data: { isPublished: true } });
      }
    }

    return product;
  }

  async update(id: string, tenantId: string, dto: Partial<CreateProductDto>) {
    const current = await this.findOne(id, tenantId);

    // Si le stock change, enregistrer un mouvement ADJUSTMENT
    if (dto.stock !== undefined && dto.stock !== current.stock) {
      const delta = dto.stock - current.stock;
      await this.inventoryService.recordMovement(tenantId, {
        productId: id,
        type: StockMovementType.ADJUSTMENT,
        quantity: delta,
        reason: 'Modification manuelle depuis le dashboard',
      });
      // Le stock a déjà été mis à jour par recordMovement, on retire du dto
      const { stock, ...rest } = dto;
      return this.prisma.product.update({
        where: { id },
        data: rest,
        include: PRODUCT_INCLUDE,
      });
    }

    return this.prisma.product.update({
      where: { id },
      data: dto,
      include: PRODUCT_INCLUDE,
    });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.product.delete({ where: { id } });
  }

  // ── Variants ──────────────────────────────────────────────────────────────

  async createVariant(productId: string, tenantId: string, dto: CreateVariantDto) {
    await this.findOne(productId, tenantId); // vérifie appartenance tenant
    return this.prisma.productVariant.create({
      data: { ...dto, productId },
    });
  }

  async updateVariant(
    variantId: string,
    productId: string,
    tenantId: string,
    dto: Partial<CreateVariantDto>,
  ) {
    await this.findOne(productId, tenantId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Variante introuvable');
    return this.prisma.productVariant.update({ where: { id: variantId }, data: dto });
  }

  async removeVariant(variantId: string, productId: string, tenantId: string) {
    await this.findOne(productId, tenantId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) throw new NotFoundException('Variante introuvable');
    return this.prisma.productVariant.delete({ where: { id: variantId } });
  }

  // ── CSV Export ──────────────────────────────────────────────────────────────

  async exportCsv(tenantId: string): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      include: { category: true, variants: true },
      orderBy: { createdAt: 'desc' },
    });
    const header = 'Nom;Slug;Prix;Prix comparé;Stock;Actif;Catégorie;Variantes;Date création';
    const rows = products.map((p) =>
      [p.name, p.slug, Number(p.price).toFixed(2), p.comparePrice ? Number(p.comparePrice).toFixed(2) : '',
       p.stock, p.isActive ? 'Oui' : 'Non', p.category?.name ?? '',
       p.variants.map((v) => `${v.name}(${v.stock})`).join(', '),
       p.createdAt.toISOString().slice(0, 10)].join(';'),
    );
    return [header, ...rows].join('\n');
  }

  // ── Bulk Actions ───────────────────────────────────────────────────────────

  async bulkAction(tenantId: string, ids: string[], action: 'delete' | 'activate' | 'deactivate') {
    const where = { id: { in: ids }, tenantId };
    if (action === 'delete') {
      return this.prisma.product.deleteMany({ where });
    }
    return this.prisma.product.updateMany({
      where,
      data: { isActive: action === 'activate' },
    });
  }

  // ── CSV Import ─────────────────────────────────────────────────────────────

  async importCsv(tenantId: string, csvContent: string) {
    const lines = csvContent.split('\n').filter((l) => l.trim());
    if (lines.length < 2) return { created: 0, skipped: 0, errors: [{ line: 1, message: 'Fichier vide ou en-tête manquant' }] };
    const MAX_CSV_LINES = 500;
    if (lines.length > MAX_CSV_LINES + 1) {
      throw new ForbiddenException(`Le fichier CSV ne peut pas dépasser ${MAX_CSV_LINES} lignes par import.`);
    }

    // Vérifier la limite du plan avant d'importer
    const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const limits = getDynamicPlanLimits(this.config)[tenant.plan];
    let remainingSlots = Infinity;
    if (!isUnlimited(limits.maxProducts)) {
      const currentCount = await this.prisma.product.count({ where: { tenantId } });
      remainingSlots = limits.maxProducts - currentCount;
      if (remainingSlots <= 0) {
        throw new ForbiddenException(
          `Limite atteinte : le plan ${limits.label} permet ${limits.maxProducts} produits. Passez au plan supérieur.`,
        );
      }
    }

    const results = { created: 0, skipped: 0, errors: [] as { line: number; message: string }[] };

    for (let i = 1; i < lines.length; i++) {
      // Arrêter si la limite est atteinte
      if (results.created >= remainingSlots) {
        results.skipped = lines.length - i;
        results.errors.push({ line: i + 1, message: `Limite du plan atteinte (${limits.maxProducts} produits). Import arrêté.` });
        break;
      }
      const cols = lines[i].split(';').map((c) => c.trim());
      const [name, , priceStr, , stockStr] = cols;
      if (!name || !priceStr) {
        results.errors.push({ line: i + 1, message: 'Nom ou prix manquant' });
        continue;
      }
      const price = parseFloat(priceStr);
      const stock = parseInt(stockStr) || 0;
      if (isNaN(price) || price <= 0) {
        results.errors.push({ line: i + 1, message: `Prix invalide: ${priceStr}` });
        continue;
      }
      const slug = name.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 50);
      try {
        await this.prisma.product.create({
          data: { name, slug: `${slug}-${Date.now()}`, price, stock, tenantId, isActive: true },
        });
        results.created++;
      } catch (err: any) {
        results.errors.push({ line: i + 1, message: err.message?.slice(0, 80) ?? 'Erreur création' });
      }
    }
    return results;
  }
}
