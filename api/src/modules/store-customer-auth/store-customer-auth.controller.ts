import { Controller, Post, Get, Patch, Delete, Body, Headers, UseGuards, Req, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { StoreCustomerAuthService } from './store-customer-auth.service';
import { CustomerJwtGuard } from './customer-jwt.guard';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

// Resolves tenantId from X-Tenant-Slug header via the request (set by TenantMiddleware)
function getTenantId(req: any): string {
  return req.tenant?.id ?? '';
}

@Controller('store/auth')
export class StoreCustomerAuthController {
  constructor(private readonly service: StoreCustomerAuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Req() req: any, @Body() dto: CustomerRegisterDto) {
    return this.service.register(getTenantId(req), dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Req() req: any, @Body() dto: CustomerLoginDto) {
    return this.service.login(getTenantId(req), dto);
  }

  @Get('me')
  @UseGuards(CustomerJwtGuard)
  getMe(@Req() req: any) {
    return this.service.getMe(req.user.customerId, req.user.tenantId);
  }

  @Get('orders')
  @UseGuards(CustomerJwtGuard)
  getMyOrders(@Req() req: any) {
    return this.service.getMyOrders(req.user.customerId, req.user.tenantId);
  }

  // ── Profile Management ────────────────────────────────────────────────────

  @Patch('profile')
  @UseGuards(CustomerJwtGuard)
  updateProfile(@Req() req: any, @Body() dto: UpdateProfileDto) {
    return this.service.updateProfile(req.user.customerId, req.user.tenantId, dto);
  }

  @Patch('password')
  @UseGuards(CustomerJwtGuard)
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(req.user.customerId, req.user.tenantId, dto);
  }

  // ── Address Management ────────────────────────────────────────────────────

  @Get('addresses')
  @UseGuards(CustomerJwtGuard)
  getAddresses(@Req() req: any) {
    return this.service.getAddresses(req.user.customerId, req.user.tenantId);
  }

  @Post('addresses')
  @UseGuards(CustomerJwtGuard)
  createAddress(@Req() req: any, @Body() dto: CreateAddressDto) {
    return this.service.createAddress(req.user.customerId, req.user.tenantId, dto);
  }

  @Patch('addresses/:id')
  @UseGuards(CustomerJwtGuard)
  updateAddress(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAddressDto) {
    return this.service.updateAddress(id, req.user.customerId, req.user.tenantId, dto);
  }

  @Delete('addresses/:id')
  @UseGuards(CustomerJwtGuard)
  deleteAddress(@Req() req: any, @Param('id') id: string) {
    return this.service.deleteAddress(id, req.user.customerId, req.user.tenantId);
  }

  @Post('addresses/:id/set-default')
  @UseGuards(CustomerJwtGuard)
  setDefaultAddress(@Req() req: any, @Param('id') id: string) {
    return this.service.setDefaultAddress(id, req.user.customerId, req.user.tenantId);
  }
}
