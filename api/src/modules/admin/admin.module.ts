import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuperAdminJwtStrategy } from './super-admin-jwt.strategy';
import { InvoicesModule } from '../invoices/invoices.module';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [
    PassportModule,
    InvoicesModule,
    AiModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ADMIN_SECRET') ?? config.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, SuperAdminJwtStrategy],
})
export class AdminModule {}
