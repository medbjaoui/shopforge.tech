import { Controller, Get, Patch, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { ConfigureProgramDto } from './dto/configure-program.dto';
import { AdjustPointsDto } from './dto/adjust-points.dto';
import { UserRole, Tenant } from '@prisma/client';

@Controller('loyalty')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoyaltyController {
  constructor(private loyaltyService: LoyaltyService) {}

  // ─── CONFIGURATION PROGRAMME (OWNER/ADMIN) ──────────────────────────────────

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('program')
  getProgram(@CurrentTenant() tenant: Tenant) {
    return this.loyaltyService.getProgram(tenant.id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch('program')
  configureProgram(@CurrentTenant() tenant: Tenant, @Body() dto: ConfigureProgramDto) {
    return this.loyaltyService.configureProgram(tenant.id, dto);
  }

  // ─── STATS & DASHBOARD (OWNER/ADMIN) ───────────────────────────────────────

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('stats')
  getStats(@CurrentTenant() tenant: Tenant) {
    return this.loyaltyService.getTenantStats(tenant.id);
  }

  // ─── GESTION CLIENT (OWNER/ADMIN) ──────────────────────────────────────────

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('customer/:customerId')
  getCustomerLoyalty(@Param('customerId') customerId: string) {
    return this.loyaltyService.getCustomerLoyalty(customerId);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('customer/:customerId/history')
  getCustomerHistory(
    @Param('customerId') customerId: string,
    @Query('limit') limit?: string,
  ) {
    return this.loyaltyService.getCustomerHistory(customerId, limit ? parseInt(limit, 10) : 50);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('customer/:customerId/adjust')
  adjustPoints(
    @CurrentTenant() tenant: Tenant,
    @Param('customerId') customerId: string,
    @Body() dto: AdjustPointsDto,
  ) {
    return this.loyaltyService.adjustPoints(tenant.id, customerId, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('customer/:customerId/redeem')
  redeemPoints(
    @CurrentTenant() tenant: Tenant,
    @Param('customerId') customerId: string,
  ) {
    return this.loyaltyService.redeemPoints(tenant.id, customerId);
  }
}
