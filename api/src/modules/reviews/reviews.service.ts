import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  /** Submit a review (public) */
  async create(tenantId: string, productId: string, dto: { rating: number; authorName: string; authorEmail: string; comment?: string }) {
    // Validate product exists and belongs to tenant
    const product = await this.prisma.product.findFirst({ where: { id: productId, tenantId, isActive: true } });
    if (!product) throw new NotFoundException('Produit introuvable');
    if (dto.rating < 1 || dto.rating > 5) throw new BadRequestException('La note doit être entre 1 et 5');

    return this.prisma.review.create({
      data: {
        productId,
        tenantId,
        rating: dto.rating,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        comment: dto.comment,
      },
    });
  }

  /** Get approved reviews for a product (public) */
  async findByProduct(productId: string, tenantId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { productId, tenantId, status: 'APPROVED' },
      orderBy: { createdAt: 'desc' },
    });
    const count = reviews.length;
    const avgRating = count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
    return { reviews, count, avgRating: Math.round(avgRating * 10) / 10 };
  }

  /** Get all reviews for moderation (dashboard) */
  async findAll(tenantId: string, status?: string, page = 1, limit = 20) {
    const where: any = { tenantId };
    if (status) where.status = status;
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { product: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /** Update review status (approve / reject) */
  async updateStatus(id: string, tenantId: string, status: 'APPROVED' | 'REJECTED') {
    const review = await this.prisma.review.findFirst({ where: { id, tenantId } });
    if (!review) throw new NotFoundException('Avis introuvable');
    return this.prisma.review.update({ where: { id }, data: { status } });
  }

  /** Delete a review */
  async remove(id: string, tenantId: string) {
    const review = await this.prisma.review.findFirst({ where: { id, tenantId } });
    if (!review) throw new NotFoundException('Avis introuvable');
    return this.prisma.review.delete({ where: { id } });
  }
}
