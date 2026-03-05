import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Tenant } from '@prisma/client';

@Controller('products')
@UseGuards(JwtAuthGuard)
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

  @Get()
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Query('q') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAll(tenant.id, +(page || 1), +(limit || 20), search);
  }

  @Get('export/csv')
  async exportCsv(@CurrentTenant() tenant: Tenant, @Res() res: Response) {
    const csv = await this.productsService.exportCsv(tenant.id);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=produits.csv' });
    res.send('\uFEFF' + csv);
  }

  @Patch('bulk')
  bulkAction(
    @Body() body: { ids: string[]; action: 'delete' | 'activate' | 'deactivate' },
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.productsService.bulkAction(tenant.id, body.ids, body.action);
  }

  @Post('import')
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(@UploadedFile() file: { buffer: Buffer; originalname: string }, @CurrentTenant() tenant: Tenant) {
    const content = file.buffer.toString('utf-8');
    return this.productsService.importCsv(tenant.id, content);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.productsService.findOne(id, tenant.id);
  }

  @Post()
  create(@Body() dto: CreateProductDto, @CurrentTenant() tenant: Tenant) {
    return this.productsService.create(tenant.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductDto>,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.productsService.update(id, tenant.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.productsService.remove(id, tenant.id);
  }

  // ── Variants ──────────────────────────────────────────────────────────────

  @Post(':id/variants')
  createVariant(
    @Param('id') productId: string,
    @Body() dto: CreateVariantDto,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.productsService.createVariant(productId, tenant.id, dto);
  }

  @Patch(':id/variants/:variantId')
  updateVariant(
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: Partial<CreateVariantDto>,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.productsService.updateVariant(variantId, productId, tenant.id, dto);
  }

  @Delete(':id/variants/:variantId')
  removeVariant(
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.productsService.removeVariant(variantId, productId, tenant.id);
  }
}
