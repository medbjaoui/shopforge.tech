import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Tenant, UserRole } from '@prisma/client';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('shipping')
export class ShippingController {
  constructor(private shippingService: ShippingService) {}

  // ─── CARRIERS DISPONIBLES ─────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get('carriers')
  getAvailableCarriers() {
    return this.shippingService.getAvailableCarriers();
  }

  // ─── CONFIGURATION PAR BOUTIQUE ───────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('my-carriers')
  getMyCarriers(@CurrentTenant() tenant: Tenant) {
    return this.shippingService.getTenantCarriers(tenant.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('carriers/:carrierId')
  configureCarrier(
    @CurrentTenant() tenant: Tenant,
    @Param('carrierId') carrierId: string,
    @Body('apiKey') apiKey?: string,
    @Body('isDefault') isDefault?: boolean,
  ) {
    return this.shippingService.configureCarrier(tenant.id, carrierId, apiKey, isDefault);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch('carriers/:carrierId/default')
  setDefault(@CurrentTenant() tenant: Tenant, @Param('carrierId') carrierId: string) {
    return this.shippingService.setDefaultCarrier(tenant.id, carrierId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete('carriers/:carrierId')
  removeCarrier(@CurrentTenant() tenant: Tenant, @Param('carrierId') carrierId: string) {
    return this.shippingService.removeCarrier(tenant.id, carrierId);
  }

  // ─── EXPÉDITIONS ──────────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get('shipments')
  getShipments(@CurrentTenant() tenant: Tenant) {
    return this.shippingService.getShipments(tenant.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get('shipments/order/:orderId')
  getShipmentByOrder(@CurrentTenant() tenant: Tenant, @Param('orderId') orderId: string) {
    return this.shippingService.getShipmentByOrderId(orderId, tenant.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Post('shipments')
  createShipment(
    @CurrentTenant() tenant: Tenant,
    @Body('orderId') orderId: string,
    @Body('carrierId') carrierId: string,
    @Body('trackingNumber') trackingNumber?: string,
    @Body('notes') notes?: string,
  ) {
    return this.shippingService.createShipment(tenant.id, orderId, carrierId, trackingNumber, notes);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Post('shipments/:id/sync')
  @HttpCode(HttpStatus.OK)
  syncShipment(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.shippingService.syncShipment(id, tenant.id);
  }

  // ─── WEBHOOK PUBLIC ───────────────────────────────────────────────────────

  @Public()
  @Post('webhook/:carrierSlug')
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Req() req: any,
    @Param('carrierSlug') carrierSlug: string,
    @Body() payload: Record<string, unknown>,
  ) {
    return this.shippingService.handleWebhook(carrierSlug, payload);
  }
}
