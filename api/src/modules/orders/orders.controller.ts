import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Res, Header } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant, OrderStatus, UserRole } from '@prisma/client';

@Controller('orders')
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  // Public : passer une commande depuis la vitrine
  @Public()
  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  create(@Body() dto: CreateOrderDto, @CurrentTenant() tenant: Tenant) {
    return this.ordersService.create(tenant.id, dto);
  }

  // Public : suivi commande client
  @Public()
  @Get('track/:orderNumber')
  track(@Param('orderNumber') orderNumber: string, @CurrentTenant() tenant: Tenant) {
    return this.ordersService.trackByOrderNumber(orderNumber, tenant.id);
  }

  // Protégé : dashboard marchand

  // OWNER + ADMIN peuvent voir les stats (financières)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('stats')
  getStats(@CurrentTenant() tenant: Tenant) {
    return this.ordersService.getStats(tenant.id);
  }

  // Tous peuvent voir les clients
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get('customers')
  getCustomers(
    @CurrentTenant() tenant: Tenant,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getCustomers(tenant.id, +(page || 1), +(limit || 20));
  }

  // OWNER + ADMIN peuvent voir les analytics
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('analytics')
  getAnalytics(@CurrentTenant() tenant: Tenant, @Query('days') days?: string) {
    const d = days ? parseInt(days) : 30;
    return this.ordersService.getAnalytics(tenant.id, isNaN(d) || d < 1 || d > 365 ? 30 : d);
  }

  // OWNER + ADMIN peuvent exporter
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('export/csv')
  async exportCsv(@CurrentTenant() tenant: Tenant, @Res() res: Response) {
    const csv = await this.ordersService.exportOrdersCsv(tenant.id);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=commandes.csv' });
    res.send('\uFEFF' + csv);
  }

  // OWNER + ADMIN peuvent exporter les clients
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('customers/export/csv')
  async exportCustomersCsv(@CurrentTenant() tenant: Tenant, @Res() res: Response) {
    const csv = await this.ordersService.exportCustomersCsv(tenant.id);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=clients.csv' });
    res.send('\uFEFF' + csv);
  }

  // OWNER + ADMIN peuvent faire des actions en masse
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch('bulk/status')
  bulkUpdateStatus(
    @Body() body: { ids: string[]; status: OrderStatus },
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.ordersService.bulkUpdateStatus(tenant.id, body.ids, body.status);
  }

  // Tous peuvent voir les commandes
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get()
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Query('status') status?: string,
    @Query('q') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAll(tenant.id, status, search, +(page || 1), +(limit || 20));
  }

  // Tous peuvent voir une commande
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.ordersService.findOne(id, tenant.id);
  }

  // Tous peuvent changer le statut
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.ordersService.updateStatus(id, tenant.id, status);
  }

  // OWNER + ADMIN peuvent gérer les retours
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id/return')
  requestReturn(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.ordersService.requestReturn(id, tenant.id, reason);
  }

  // OWNER + ADMIN peuvent faire des remboursements
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id/refund')
  processRefund(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.ordersService.processRefund(id, tenant.id, amount);
  }

  // OWNER + ADMIN peuvent gérer les échanges
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id/exchange')
  requestExchange(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.ordersService.requestExchange(id, tenant.id, reason);
  }
}
