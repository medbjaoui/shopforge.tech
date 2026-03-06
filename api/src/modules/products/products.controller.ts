import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant, UserRole } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  // ── Public : vitrine ──────────────────────────────────────────────────────

  @Public()
  @Get('public')
  findPublic(
    @CurrentTenant() tenant: Tenant,
    @Query('q') search?: string,
    @Query('category') categorySlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAllPublic(tenant.id, search, categorySlug, +(page || 1), +(limit || 20));
  }

  @Public()
  @Get('public/:slug')
  findPublicBySlug(@Param('slug') slug: string, @CurrentTenant() tenant: Tenant) {
    return this.productsService.findBySlug(slug, tenant.id);
  }

  // ── Dashboard marchand ────────────────────────────────────────────────────

  // Tous les rôles peuvent voir les produits
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get()
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Query('q') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll(tenant.id, +(page || 1), +(limit || 20), search);
  }

  // OWNER + ADMIN peuvent exporter
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('export/csv')
  async exportCsv(@CurrentTenant() tenant: Tenant, @Res() res: Response) {
    const csv = await this.productsService.exportCsv(tenant.id);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=produits.csv' });
    res.send('\uFEFF' + csv);
  }

  // OWNER + ADMIN peuvent faire des actions en masse
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch('bulk')
  bulkAction(
    @Body() body: { ids: string[]; action: 'delete' | 'activate' | 'deactivate' },
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.productsService.bulkAction(tenant.id, body.ids, body.action);
  }

  // OWNER + ADMIN peuvent importer
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('import')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@UploadedFile() file: { buffer: Buffer; originalname: string }, @CurrentTenant() tenant: Tenant) {
    const content = file.buffer.toString('utf-8');
    return this.productsService.importCsv(tenant.id, content);
  }

  // Tous les rôles peuvent voir un produit
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.productsService.findOne(id, tenant.id);
  }

  // OWNER + ADMIN peuvent créer des produits
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateProductDto, @CurrentTenant() tenant: Tenant) {
    return this.productsService.create(tenant.id, dto);
  }

  // OWNER + ADMIN peuvent modifier des produits
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.productsService.update(id, tenant.id, dto);
  }

  // OWNER + ADMIN peuvent supprimer des produits
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.productsService.remove(id, tenant.id);
  }

  // ── Variants ──────────────────────────────────────────────────────────────

  // OWNER + ADMIN peuvent créer des variants
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post(':id/variants')
  createVariant(
    @Param('id') productId: string,
    @Body() dto: CreateVariantDto,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.productsService.createVariant(productId, tenant.id, dto);
  }

  // OWNER + ADMIN peuvent modifier des variants
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id/variants/:variantId')
  updateVariant(
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: Partial<CreateVariantDto>,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.productsService.updateVariant(variantId, productId, tenant.id, dto);
  }

  // OWNER + ADMIN peuvent supprimer des variants
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id/variants/:variantId')
  removeVariant(
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.productsService.removeVariant(variantId, productId, tenant.id);
  }
}
