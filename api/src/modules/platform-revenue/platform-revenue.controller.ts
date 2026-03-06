import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PlatformRevenueService } from './platform-revenue.service';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';

@Controller('admin/revenue')
@UseGuards(SuperAdminGuard)
export class PlatformRevenueController {
  constructor(private platformRevenue: PlatformRevenueService) {}

  /**
   * Dashboard CA - Résumé complet
   * GET /admin/revenue/summary
   */
  @Get('summary')
  async getSummary() {
    return this.platformRevenue.getAdminSummary();
  }

  /**
   * Historique CA sur N mois
   * GET /admin/revenue/history?months=12
   */
  @Get('history')
  async getHistory(@Query('months') months?: string) {
    const monthsCount = months ? parseInt(months, 10) : 12;
    return this.platformRevenue.getRevenueHistory(monthsCount);
  }

  /**
   * CA par type (commissions vs subscriptions)
   * GET /admin/revenue/by-type
   */
  @Get('by-type')
  async getByType() {
    return this.platformRevenue.getRevenueByType();
  }

  /**
   * MRR actuel
   * GET /admin/revenue/mrr
   */
  @Get('mrr')
  async getMRR() {
    return this.platformRevenue.getMRR();
  }

  /**
   * CA mensuel spécifique
   * GET /admin/revenue/month?year=2026&month=3
   */
  @Get('month')
  async getMonthRevenue(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const y = year ? parseInt(year, 10) : now.getFullYear();
    const m = month ? parseInt(month, 10) : now.getMonth() + 1;

    return this.platformRevenue.getMonthlyRevenue(y, m);
  }
}
