import { Controller, Get, Post, Patch, Param, Body, Query, Delete, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { Public } from '../../common/decorators/public.decorator';
import { PlanType } from '@prisma/client';
import { InvoicesService } from '../invoices/invoices.service';
import { PlatformConfigService } from '../platform-config/platform-config.service';
import { AiService } from '../ai/ai.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';

@Controller('admin')
export class AdminController {
  constructor(
    private adminService: AdminService,
    private invoicesService: InvoicesService,
    private configService: PlatformConfigService,
    private aiService: AiService,
    private cloudflareService: CloudflareService,
  ) {}

  // ─── PUBLIC ───────────────────────────────────────────────────────────────

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Public()
  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  // ─── PROTÉGÉ SUPER ADMIN ──────────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('stats')
  getStats(@Query('days') days?: string) {
    const d = days ? parseInt(days, 10) : undefined;
    return this.adminService.getStats(d && !isNaN(d) ? d : undefined);
  }

  @UseGuards(SuperAdminGuard)
  @Get('alerts')
  getAlerts() {
    return this.adminService.getAlerts();
  }

  @UseGuards(SuperAdminGuard)
  @Get('billing')
  getBillingStats() {
    return this.adminService.getBillingStats();
  }

  @UseGuards(SuperAdminGuard)
  @Get('tenants/performance')
  getTenantsPerformance() {
    return this.adminService.getTenantsPerformance();
  }

  @UseGuards(SuperAdminGuard)
  @Get('tenants')
  getAllTenants() {
    return this.adminService.getAllTenants();
  }

  @UseGuards(SuperAdminGuard)
  @Get('tenants/:id')
  getTenant(@Param('id') id: string) {
    return this.adminService.getTenantById(id);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('tenants/:id/toggle')
  toggleTenant(@Param('id') id: string) {
    return this.adminService.toggleTenant(id);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('tenants/:id/plan')
  updatePlan(@Param('id') id: string, @Body('plan') plan: PlanType) {
    return this.adminService.updateTenantPlan(id, plan);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('tenants/:id/domain')
  updateDomain(@Param('id') id: string, @Body('domain') domain: string | null) {
    return this.adminService.updateTenantDomain(id, domain);
  }

  @UseGuards(SuperAdminGuard)
  @Get('cloudflare/cname-target')
  getCnameTarget() {
    return { cnameTarget: this.cloudflareService.cnameTarget };
  }

  // ─── TRANSPORTEURS ────────────────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('carriers')
  getAllCarriers() {
    return this.adminService.getAllCarriers();
  }

  @UseGuards(SuperAdminGuard)
  @Post('carriers')
  createCarrier(@Body() body: {
    name: string;
    slug: string;
    logoUrl?: string;
    apiBaseUrl?: string;
    apiType?: string;
    description?: string;
  }) {
    return this.adminService.createCarrier(body);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('carriers/:id')
  updateCarrier(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      logoUrl?: string;
      apiBaseUrl?: string;
      apiType?: string;
      description?: string;
    },
  ) {
    return this.adminService.updateCarrier(id, body);
  }

  @UseGuards(SuperAdminGuard)
  @Patch('carriers/:id/toggle')
  toggleCarrier(@Param('id') id: string) {
    return this.adminService.toggleCarrier(id);
  }

  // ─── COMMANDES GLOBALES ───────────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('orders')
  getAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.getAllOrders(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 30,
    );
  }

  // ─── FACTURES ────────────────────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('invoices/stats')
  getInvoiceStats() {
    return this.invoicesService.getInvoiceStats();
  }

  @UseGuards(SuperAdminGuard)
  @Get('invoices')
  getAllInvoices(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('tenantId') tenantId?: string,
    @Query('q') search?: string,
  ) {
    return this.invoicesService.getAllInvoices(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 30,
      tenantId,
      search,
    );
  }

  @UseGuards(SuperAdminGuard)
  @Get('invoices/:id')
  getInvoice(@Param('id') id: string) {
    return this.invoicesService.getInvoiceById(id);
  }

  @UseGuards(SuperAdminGuard)
  @Post('invoices/generate/:orderId')
  generateInvoice(@Param('orderId') orderId: string) {
    return this.invoicesService.generateInvoiceForOrder(orderId);
  }

  // ─── INTELLIGENCE ARTIFICIELLE ─────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('ai/stats')
  getAiStats() {
    return this.aiService.getAdminStats();
  }

  // ─── CONFIGURATION PLATEFORME ──────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('settings')
  getSettings() {
    return this.configService.getAll();
  }

  @UseGuards(SuperAdminGuard)
  @Patch('settings')
  updateSettings(@Body() body: { updates: Array<{ key: string; value: string }> }) {
    return this.configService.updateMany(body.updates);
  }
}
