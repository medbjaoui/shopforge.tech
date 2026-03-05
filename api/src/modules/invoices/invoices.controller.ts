import {
  Controller, Get, Param, Query, UseGuards,
  DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Tenant } from '@prisma/client';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.invoicesService.getAllInvoices(page, limit, tenant.id, search);
  }

  @Get('stats')
  getStats(@CurrentTenant() tenant: Tenant) {
    return this.invoicesService.getTenantInvoiceStats(tenant.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentTenant() tenant: Tenant) {
    return this.invoicesService.getInvoiceByIdForTenant(id, tenant.id);
  }
}
