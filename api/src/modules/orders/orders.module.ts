import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CouponsModule } from '../coupons/coupons.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ShippingModule } from '../shipping/shipping.module';
import { InvoicesModule } from '../invoices/invoices.module';
import { InventoryModule } from '../inventory/inventory.module';
import { CustomersModule } from '../customers/customers.module';
import { WalletModule } from '../wallet/wallet.module';
import { TelegramModule } from '../telegram/telegram.module';
import { MetaModule } from '../meta/meta.module';

@Module({
  imports: [PrismaModule, CouponsModule, ShippingModule, InvoicesModule, InventoryModule, CustomersModule, WalletModule, TelegramModule, MetaModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
