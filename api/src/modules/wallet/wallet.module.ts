import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController, AdminWalletController, AdminCreditCodesController } from './wallet.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PlatformRevenueModule } from '../platform-revenue/platform-revenue.module';

@Module({
  imports: [PrismaModule, PlatformRevenueModule],
  controllers: [WalletController, AdminWalletController, AdminCreditCodesController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
