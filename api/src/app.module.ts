import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { AdminModule } from './modules/admin/admin.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { PlatformConfigModule } from './modules/platform-config/platform-config.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AiModule } from './modules/ai/ai.module';
import { EmailModule } from './modules/email/email.module';
import { StoreCustomerAuthModule } from './modules/store-customer-auth/store-customer-auth.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { CloudflareModule } from './modules/cloudflare/cloudflare.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Rate limiting global (OWASP A04)
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 30 }]),
    // JwtModule global pour le TenantMiddleware
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
      }),
      global: true,
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    ProductsModule,
    OrdersModule,
    AdminModule,
    CategoriesModule,
    UploadsModule,
    CouponsModule,
    ShippingModule,
    PlatformConfigModule,
    ReviewsModule,
    InventoryModule,
    CustomersModule,
    AiModule,
    EmailModule,
    StoreCustomerAuthModule,
    WalletModule,
    SchedulerModule,
    TelegramModule,
    CloudflareModule,
    AnalyticsModule,
    PaymentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
