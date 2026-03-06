import { Module } from '@nestjs/common';
import { PlatformRevenueService } from './platform-revenue.service';
import { PlatformRevenueController } from './platform-revenue.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlatformRevenueController],
  providers: [PlatformRevenueService],
  exports: [PlatformRevenueService],
})
export class PlatformRevenueModule {}
