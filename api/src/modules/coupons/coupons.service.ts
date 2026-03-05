import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCouponDto } from './dto/create-coupon.dto';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.coupon.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string, dto: CreateCouponDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.coupon.findFirst({ where: { code, tenantId } });
    if (existing) throw new ConflictException('Un coupon avec ce code existe déjà');

    return this.prisma.coupon.create({
      data: {
        tenantId,
        code,
        type: dto.type,
        value: dto.value,
        minAmount: dto.minAmount ?? null,
        maxUses: dto.maxUses ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, tenantId: string, dto: Partial<CreateCouponDto>) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException('Coupon introuvable');
    const data: any = { ...dto };
    if (dto.code) data.code = dto.code.trim().toUpperCase();
    if (dto.expiresAt) data.expiresAt = new Date(dto.expiresAt);
    return this.prisma.coupon.update({ where: { id }, data });
  }

  async remove(id: string, tenantId: string) {
    const coupon = await this.prisma.coupon.findFirst({ where: { id, tenantId } });
    if (!coupon) throw new NotFoundException('Coupon introuvable');
    return this.prisma.coupon.delete({ where: { id } });
  }

  async validate(code: string, tenantId: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: code.trim().toUpperCase(), tenantId, isActive: true },
    });

    if (!coupon) throw new NotFoundException('Code promo invalide ou expiré');

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Ce code promo a expiré');
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Ce code promo a atteint sa limite d\'utilisation');
    }

    if (coupon.minAmount !== null && subtotal < Number(coupon.minAmount)) {
      throw new BadRequestException(
        `Montant minimum requis : ${Number(coupon.minAmount).toFixed(2)} TND`,
      );
    }

    let discount = 0;
    if (coupon.type === 'PERCENT') {
      discount = (subtotal * Number(coupon.value)) / 100;
    } else {
      discount = Math.min(Number(coupon.value), subtotal);
    }

    return {
      code: coupon.code,
      type: coupon.type,
      value: Number(coupon.value),
      discount: Math.round(discount * 100) / 100,
    };
  }

  async applyAndIncrement(code: string, tenantId: string) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: code.trim().toUpperCase(), tenantId },
    });
    if (coupon) {
      await this.prisma.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });
    }
  }
}
