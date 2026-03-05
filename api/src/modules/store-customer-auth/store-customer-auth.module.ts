import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { StoreCustomerAuthController } from './store-customer-auth.controller';
import { StoreCustomerAuthService } from './store-customer-auth.service';
import { CustomerJwtStrategy } from './customer-jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'secret',
    }),
  ],
  controllers: [StoreCustomerAuthController],
  providers: [StoreCustomerAuthService, CustomerJwtStrategy],
})
export class StoreCustomerAuthModule {}
