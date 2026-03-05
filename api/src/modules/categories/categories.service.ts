import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(tenantId: string, dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: { slug: dto.slug, tenantId },
    });
    if (existing) throw new ConflictException('Une catégorie avec ce slug existe déjà');

    return this.prisma.category.create({
      data: { ...dto, tenantId },
    });
  }

  async update(id: string, tenantId: string, dto: Partial<CreateCategoryDto>) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Catégorie introuvable');
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string, tenantId: string) {
    const cat = await this.prisma.category.findFirst({ where: { id, tenantId } });
    if (!cat) throw new NotFoundException('Catégorie introuvable');
    // Détacher les produits avant suppression
    await this.prisma.product.updateMany({
      where: { categoryId: id, tenantId },
      data: { categoryId: null },
    });
    return this.prisma.category.delete({ where: { id } });
  }
}
