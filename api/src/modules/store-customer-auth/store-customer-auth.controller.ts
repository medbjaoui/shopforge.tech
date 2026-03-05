import { Controller, Post, Get, Body, Headers, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { StoreCustomerAuthService } from './store-customer-auth.service';
import { CustomerJwtGuard } from './customer-jwt.guard';
import { CustomerRegisterDto } from './dto/customer-register.dto';
import { CustomerLoginDto } from './dto/customer-login.dto';

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
}
