import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Tenant } from '@prisma/client';

@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  // Public : vitrine
  @Public()
  @Get('public')
  findPublic(@CurrentTenant() tenant: Tenant) {
    return this.categoriesService.findAll(tenant.id);
  }

  // Dashboard marchand
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentTenant() tenant: Tenant) {
    return this.categoriesService.findAll(tenant.id);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto, @CurrentTenant() tenant: Tenant) {
    return this.categoriesService.create(tenant.id, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCategoryDto>,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.categoriesService.update(id, tenant.id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.categoriesService.remove(id, tenant.id);
  }
}
