import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { Tenant, AiFeature } from '@prisma/client';

@Controller('ai')
export class AiController {
  constructor(
    private aiService: AiService,
    private prisma: PrismaService,
  ) {}

  // ── Feature 1: Product Description Generator ────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('product-description')
  async generateProductDescription(
    @Body()
    body: {
      productName: string;
      category?: string;
      price?: number;
      keywords?: string;
      tone?: string;
      existingDescription?: string;
    },
    @CurrentTenant() tenant: Tenant,
  ) {
    if (!body.productName?.trim()) {
      throw new BadRequestException('Le nom du produit est requis.');
    }

    const systemPrompt = `Tu es un expert en marketing e-commerce pour le marché tunisien et MENA.
Génère une description de produit en français, attrayante et optimisée pour la vente en ligne.
La description doit faire entre 2 et 4 paragraphes.
Utilise un ton ${body.tone || 'professionnel'}.
N'utilise PAS de markdown, retourne du texte brut avec des sauts de ligne.
Ne mentionne jamais le prix dans la description.`;

    let userPrompt = `Produit : "${body.productName.trim()}"`;
    if (body.category) userPrompt += `\nCatégorie : ${body.category}`;
    if (body.price) userPrompt += `\nPrix : ${body.price} TND`;
    if (body.keywords) userPrompt += `\nMots-clés : ${body.keywords}`;
    if (body.existingDescription) {
      userPrompt += `\n\nDescription actuelle à améliorer :\n${body.existingDescription}`;
    }

    const result = await this.aiService.call({
      tenantId: tenant.id,
      feature: AiFeature.PRODUCT_DESCRIPTION,
      systemPrompt,
      userPrompt,
      maxTokens: 512,
    });

    return {
      description: result.content,
      tokensUsed: result.inputTokens + result.outputTokens,
    };
  }

  // ── Feature 2: Store Chatbot ────────────────────────────────────────────

  @Public()
  @Post('chatbot')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async chatbot(
    @Body()
    body: {
      message: string;
      history?: Array<{ role: string; content: string }>;
    },
    @Req() req: any,
  ) {
    const tenantId = req.tenant?.id;
    if (!tenantId) {
      throw new BadRequestException('Tenant requis (header X-Tenant-Slug).');
    }

    if (!body.message?.trim()) {
      throw new BadRequestException('Le message est requis.');
    }

    const [products, tenantInfo] = await Promise.all([
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        select: {
          name: true,
          price: true,
          description: true,
          slug: true,
          category: { select: { name: true } },
        },
        take: 50,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.findUniqueOrThrow({
        where: { id: tenantId },
        select: {
          name: true,
          description: true,
          shippingFee: true,
          freeShippingThreshold: true,
          returnPolicy: true,
          phone: true,
          codEnabled: true,
        },
      }),
    ]);

    const catalog = products
      .map(
        (p) =>
          `- ${p.name} (${Number(p.price).toFixed(2)} TND)${p.category ? ` [${p.category.name}]` : ''}${p.description ? `: ${p.description.slice(0, 100)}` : ''}`,
      )
      .join('\n');

    const systemPrompt = `Tu es l'assistant de la boutique "${tenantInfo.name}".
${tenantInfo.description ? `Description : ${tenantInfo.description}` : ''}

Infos boutique :
- Livraison : ${tenantInfo.shippingFee ? `${Number(tenantInfo.shippingFee).toFixed(3)} TND` : 'Gratuite'}${tenantInfo.freeShippingThreshold ? ` (gratuite dès ${Number(tenantInfo.freeShippingThreshold).toFixed(0)} TND)` : ''}
- Paiement : ${tenantInfo.codEnabled ? 'Paiement à la livraison' : 'Contactez la boutique'}
- Contact : ${tenantInfo.phone || 'Non renseigné'}
${tenantInfo.returnPolicy ? `- Retours : ${tenantInfo.returnPolicy}` : ''}

Catalogue :
${catalog || 'Aucun produit disponible.'}

Règles :
- Réponds UNIQUEMENT en français.
- Sois serviable, concis et professionnel (2-3 phrases max).
- N'invente JAMAIS de produit ou de prix.
- Si tu ne connais pas la réponse, invite le client à contacter la boutique.`;

    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
      ...(body.history || [])
        .slice(-10)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      { role: 'user', content: body.message.trim() },
    ];

    const result = await this.aiService.callWithHistory({
      tenantId,
      feature: AiFeature.STORE_CHATBOT,
      systemPrompt,
      messages,
      maxTokens: 256,
    });

    return { reply: result.content };
  }

  // ── Feature 3: Review Sentiment Summary ─────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('review-summary')
  async summarizeReviews(
    @Body() body: { productId: string },
    @CurrentTenant() tenant: Tenant,
  ) {
    if (!body.productId) {
      throw new BadRequestException('productId requis.');
    }

    const reviews = await this.prisma.review.findMany({
      where: {
        productId: body.productId,
        tenantId: tenant.id,
        status: 'APPROVED',
      },
      select: { rating: true, comment: true, authorName: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    if (reviews.length === 0) {
      throw new BadRequestException(
        'Aucun avis approuvé pour ce produit.',
      );
    }

    const reviewsText = reviews
      .filter((r) => r.comment)
      .map((r, i) => `Avis ${i + 1} (${r.rating}/5) : ${r.comment}`)
      .join('\n');

    const result = await this.aiService.call({
      tenantId: tenant.id,
      feature: AiFeature.REVIEW_SENTIMENT,
      systemPrompt: `Tu es un analyste d'avis clients pour une boutique e-commerce en Tunisie.
Analyse les avis suivants et fournis :
1. Un résumé en 2-3 phrases de l'opinion générale
2. Les points positifs principaux (liste à puces avec -)
3. Les points négatifs ou axes d'amélioration (liste à puces avec -)
4. Sentiment global : POSITIF, MITIGÉ ou NÉGATIF

Réponds en français. Sois factuel et concis. N'utilise pas de markdown (**, ##, etc.).`,
      userPrompt: `${reviews.length} avis clients :\n${reviewsText}`,
      maxTokens: 512,
    });

    const avgRating =
      reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

    return {
      summary: result.content,
      reviewCount: reviews.length,
      avgRating: Math.round(avgRating * 10) / 10,
    };
  }

  // ── Feature 4: Dashboard Insights ───────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('dashboard-insights')
  async getDashboardInsights(@CurrentTenant() tenant: Tenant) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      monthOrders,
      prevMonthOrders,
      monthRevenue,
      prevMonthRevenue,
      pendingOrders,
      topProducts,
      productCount,
    ] = await Promise.all([
      this.prisma.order.count({
        where: { tenantId: tenant.id, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.order.count({
        where: {
          tenantId: tenant.id,
          createdAt: { gte: startOfPrevMonth, lt: startOfMonth },
        },
      }),
      this.prisma.order.aggregate({
        where: { tenantId: tenant.id, createdAt: { gte: startOfMonth } },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          tenantId: tenant.id,
          createdAt: { gte: startOfPrevMonth, lt: startOfMonth },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: { tenantId: tenant.id, status: 'PENDING' },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { tenantId: tenant.id, createdAt: { gte: startOfMonth } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.prisma.product.count({ where: { tenantId: tenant.id } }),
    ]);

    const topProductNames = await Promise.all(
      topProducts.map(async (tp) => {
        const p = await this.prisma.product.findUnique({
          where: { id: tp.productId },
          select: { name: true },
        });
        return `${p?.name || 'Inconnu'} (${tp._sum.quantity} ventes)`;
      }),
    );

    const mr = Number(monthRevenue._sum.totalAmount ?? 0);
    const pmr = Number(prevMonthRevenue._sum.totalAmount ?? 0);

    const dataContext = `Boutique : ${tenant.name} (Plan: ${tenant.plan})
Période : mois en cours

Commandes ce mois : ${monthOrders}
Commandes mois précédent : ${prevMonthOrders}
CA ce mois : ${mr.toFixed(2)} TND
CA mois précédent : ${pmr.toFixed(2)} TND
Commandes en attente : ${pendingOrders}
Nombre de produits : ${productCount}
Top produits : ${topProductNames.join(', ') || 'Aucune vente ce mois'}`;

    const result = await this.aiService.call({
      tenantId: tenant.id,
      feature: AiFeature.DASHBOARD_INSIGHTS,
      systemPrompt: `Tu es un consultant e-commerce spécialisé dans le marché tunisien.
Analyse les données de performance et fournis :
1. 3-4 observations clés (tendances, anomalies, points forts)
2. 2-3 recommandations concrètes et actionnables
3. Indicateur global : Excellent / Bon / À améliorer / Préoccupant

Réponds en français. Sois précis avec les chiffres. N'utilise pas de markdown (**, ##).
Adapte tes conseils au marché tunisien.`,
      userPrompt: dataContext,
      maxTokens: 768,
    });

    return { insights: result.content };
  }

  // ── Feature 5: Order Response Generator ─────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('order-response')
  async generateOrderResponse(
    @Body()
    body: { orderId: string; context: string; tone?: string },
    @CurrentTenant() tenant: Tenant,
  ) {
    if (!body.orderId || !body.context) {
      throw new BadRequestException('orderId et context requis.');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: body.orderId, tenantId: tenant.id },
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Commande introuvable.');

    const orderCtx = `Commande : ${order.orderNumber}
Client : ${order.customerName}
Téléphone : ${order.customerPhone}
Statut : ${order.status}
Montant : ${Number(order.totalAmount).toFixed(2)} TND
Articles : ${order.items.map((i) => `${i.product.name} x${i.quantity}`).join(', ')}
${order.notes ? `Notes client : ${order.notes}` : ''}`;

    const result = await this.aiService.call({
      tenantId: tenant.id,
      feature: AiFeature.ORDER_RESPONSE,
      systemPrompt: `Tu es le service client d'une boutique e-commerce en Tunisie.
Génère un message professionnel en français pour le client.
Ton : ${body.tone || 'professionnel et courtois'}.
Le message doit être prêt à copier pour WhatsApp ou SMS.
3-5 lignes max. N'utilise pas de markdown.`,
      userPrompt: `Contexte : ${body.context}\n\nDétails :\n${orderCtx}`,
      maxTokens: 256,
    });

    return { response: result.content };
  }

  // ── Usage endpoint (for dashboard) ──────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('usage')
  async getUsage(@CurrentTenant() tenant: Tenant) {
    return this.aiService.getUsageBreakdown(tenant.id);
  }
}
