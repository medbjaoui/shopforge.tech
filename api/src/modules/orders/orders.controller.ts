import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Res, Header } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Tenant, OrderStatus } from '@prisma/client';

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
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  getStats(@CurrentTenant() tenant: Tenant) {
    return this.ordersService.getStats(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customers')
  getCustomers(
    @CurrentTenant() tenant: Tenant,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.getCustomers(tenant.id, +(page || 1), +(limit || 20));
  }

  @UseGuards(JwtAuthGuard)
  @Get('analytics')
  getAnalytics(@CurrentTenant() tenant: Tenant, @Query('days') days?: string) {
    const d = days ? parseInt(days) : 30;
    return this.ordersService.getAnalytics(tenant.id, isNaN(d) || d < 1 || d > 365 ? 30 : d);
  }

  @UseGuards(JwtAuthGuard)
  @Get('export/csv')
  async exportCsv(@CurrentTenant() tenant: Tenant, @Res() res: Response) {
    const csv = await this.ordersService.exportOrdersCsv(tenant.id);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=commandes.csv' });
    res.send('\uFEFF' + csv);
  }

  @UseGuards(JwtAuthGuard)
  @Get('customers/export/csv')
  async exportCustomersCsv(@CurrentTenant() tenant: Tenant, @Res() res: Response) {
    const csv = await this.ordersService.exportCustomersCsv(tenant.id);
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=clients.csv' });
    res.send('\uFEFF' + csv);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('bulk/status')
  bulkUpdateStatus(
    @Body() body: { ids: string[]; status: OrderStatus },
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.ordersService.bulkUpdateStatus(tenant.id, body.ids, body.status);
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.ordersService.findOne(id, tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: OrderStatus,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.ordersService.updateStatus(id, tenant.id, status);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/return')
  requestReturn(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.ordersService.requestReturn(id, tenant.id, reason);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/refund')
  processRefund(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.ordersService.processRefund(id, tenant.id, amount);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/exchange')
  requestExchange(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.ordersService.requestExchange(id, tenant.id, reason);
  }
}
