import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Tenant } from '@prisma/client';

@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  // Public : validation depuis le checkout de la vitrine
  @Public()
  @Post('validate')
  validate(
    @Body('code') code: string,
    @Body('subtotal') subtotal: number,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.couponsService.validate(code, tenant.id, subtotal);
  }

  // Protégé : dashboard marchand
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@CurrentTenant() tenant: Tenant) {
    return this.couponsService.findAll(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() dto: CreateCouponDto, @CurrentTenant() tenant: Tenant) {
    return this.couponsService.create(tenant.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCouponDto>,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.couponsService.update(id, tenant.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.couponsService.remove(id, tenant.id);
  }
}
