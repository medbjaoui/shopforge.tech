import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CouponsService } from './coupons.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant, UserRole } from '@prisma/client';

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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get()
  findAll(@CurrentTenant() tenant: Tenant) {
    return this.couponsService.findAll(tenant.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateCouponDto, @CurrentTenant() tenant: Tenant) {
    return this.couponsService.create(tenant.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCouponDto>,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.couponsService.update(id, tenant.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.couponsService.remove(id, tenant.id);
  }
}
