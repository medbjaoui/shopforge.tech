import { Controller, Get, Post, Body, Query, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Tenant } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  // ─── PUBLIC: INGEST EVENTS (storefront tracker) ──────────────────────────

  @Public()
  @Post('events')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 req/min per IP
  ingestEvents(
    @Body() body: { events: any[] },
    @CurrentTenant() tenant: Tenant,
  ) {
    return this.analyticsService.ingestEvents(tenant.id, body.events ?? []);
  }

  // ─── MERCHANT: FUNNEL ────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('funnel')
  getMerchantFunnel(
    @CurrentTenant() tenant: Tenant,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getTenantFunnel(
      tenant.id,
      days ? parseInt(days, 10) : 30,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('funnel/daily')
  getMerchantFunnelHistory(
    @CurrentTenant() tenant: Tenant,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getMerchantFunnelHistory(
      tenant.id,
      days ? parseInt(days, 10) : 30,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('sources')
  getMerchantSources(
    @CurrentTenant() tenant: Tenant,
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getTenantSources(
      tenant.id,
      days ? parseInt(days, 10) : 30,
    );
  }

  // ─── ADMIN: ANALYTICS ────────────────────────────────────────────────────

  @UseGuards(SuperAdminGuard)
  @Get('admin/summary')
  getAdminSummary() {
    return this.analyticsService.getAdminAnalyticsSummary();
  }

  @UseGuards(SuperAdminGuard)
  @Get('admin/churn')
  getChurn() {
    return this.analyticsService.getChurnStats();
  }

  @UseGuards(SuperAdminGuard)
  @Get('admin/cohorts')
  getCohorts(@Query('months') months?: string) {
    return this.analyticsService.getCohortRetention(
      months ? parseInt(months, 10) : 6,
    );
  }

  @UseGuards(SuperAdminGuard)
  @Get('admin/ltv')
  getLtv() {
    return this.analyticsService.getLtvStats();
  }

  @UseGuards(SuperAdminGuard)
  @Get('admin/activation')
  getActivation(@Query('days') days?: string) {
    return this.analyticsService.getActivationStats(
      days ? parseInt(days, 10) : 90,
    );
  }
}
