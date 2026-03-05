import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { AnalyticsModule } from '../analytics/analytics.module';

@Module({
  imports: [AnalyticsModule],
  providers: [SchedulerService],
})
export class SchedulerModule {}
