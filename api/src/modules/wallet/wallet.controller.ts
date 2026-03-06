import {
  Controller, Get, Post, Delete, Param, Body, Query,
  UseGuards, Request, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { IsNumber, IsPositive, IsOptional, IsString, IsNotEmpty, IsInt, Min, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

class TopupDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}

class RedeemDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}

class CreateCreditCodeDto {
  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  maxUses?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

// ─── Merchant Routes (/wallet) ───────────────────────────────────────────────

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private walletService: WalletService) {}

  // Seulement OWNER peut voir le wallet (finances sensibles)
  @Roles(UserRole.OWNER)
  @Get()
  getWallet(@Request() req: any) {
    return this.walletService.getWallet(req.user.tenantId);
  }

  // Seulement OWNER peut voir les transactions
  @Roles(UserRole.OWNER)
  @Get('transactions')
  getTransactions(
    @Request() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.walletService.getTransactions(req.user.tenantId, page, limit);
  }

  // Seulement OWNER peut utiliser un code promo
  @Roles(UserRole.OWNER)
  @Post('redeem')
  redeemCode(@Request() req: any, @Body() dto: RedeemDto) {
    return this.walletService.redeemCode(req.user.tenantId, dto.code);
  }
}

// ─── Admin Routes (/admin/wallet) ─────────────────────────────────────────────

@Controller('admin/wallet')
@UseGuards(SuperAdminGuard)
export class AdminWalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  getAllWallets(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.walletService.getAllWallets(page, limit);
  }

  @Post('topup/:tenantId')
  topup(@Param('tenantId') tenantId: string, @Body() dto: TopupDto) {
    return this.walletService.topup(tenantId, dto.amount, dto.note);
  }
}

// ─── Admin Credit Codes Routes (/admin/credit-codes) ─────────────────────────

@Controller('admin/credit-codes')
@UseGuards(SuperAdminGuard)
export class AdminCreditCodesController {
  constructor(private walletService: WalletService) {}

  @Get()
  getCreditCodes(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.walletService.getCreditCodes(page, limit);
  }

  @Post()
  createCreditCode(@Body() dto: CreateCreditCodeDto) {
    return this.walletService.createCreditCode(dto.amount, dto.note, dto.code, dto.maxUses, dto.expiresAt);
  }

  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.walletService.deactivateCreditCode(id);
  }
}
