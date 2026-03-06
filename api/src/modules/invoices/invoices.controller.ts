import {
  Controller, Get, Param, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant, UserRole } from '@prisma/client';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get()
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.invoicesService.getAllInvoices(page, limit, tenant.id, search);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('stats')
  getStats(@CurrentTenant() tenant: Tenant) {
    return this.invoicesService.getTenantInvoiceStats(tenant.id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.invoicesService.getInvoiceByIdForTenant(id, tenant.id);
  }
}
