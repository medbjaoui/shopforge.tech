import { Module } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController, AdminWalletController, AdminCreditCodesController } from './wallet.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WalletController, AdminWalletController, AdminCreditCodesController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
