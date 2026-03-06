import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PlatformRevenueModule } from '../platform-revenue/platform-revenue.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [AnalyticsModule, PlatformRevenueModule, WalletModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
