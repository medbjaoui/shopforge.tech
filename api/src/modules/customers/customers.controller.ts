import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ── Static routes first (before :id) ──────────────────────────────────────

  @Get('stats')
  getStats(@CurrentTenant() tenant: any) {
    return this.customersService.getStats(tenant.id);
  }

  @Get('segments')
  getSegmentCounts(@CurrentTenant() tenant: any) {
    return this.customersService.getSegmentCounts(tenant.id);
  }

  @Get('tags')
  findAllTags(@CurrentTenant() tenant: any) {
    return this.customersService.findAllTags(tenant.id);
  }

  @Post('tags')
  createTag(@CurrentTenant() tenant: any, @Body() body: { name: string; color?: string }) {
    return this.customersService.createTag(tenant.id, body.name, body.color);
  }

  @Delete('tags/:tagId')
  deleteTag(@CurrentTenant() tenant: any, @Param('tagId') tagId: string) {
    return this.customersService.deleteTag(tagId, tenant.id);
  }

  @Get('export/csv')
  async exportCsv(@CurrentTenant() tenant: any, @Res() res: Response) {
    const csv = await this.customersService.exportCsv(tenant.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
    res.send('\uFEFF' + csv);
  }

  @Post('migrate')
  migrate() {
    return this.customersService.migrateExistingOrders();
  }

  // ── Dynamic :id routes ────────────────────────────────────────────────────

  @Get()
  findAll(@CurrentTenant() tenant: any, @Query() query: CustomerQueryDto) {
    return this.customersService.findAll(tenant.id, query);
  }

  @Post()
  create(@CurrentTenant() tenant: any, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(tenant.id, dto);
  }

  @Get(':id')
  findOne(@CurrentTenant() tenant: any, @Param('id') id: string) {
    return this.customersService.findOne(id, tenant.id);
  }

  @Patch(':id')
  update(@CurrentTenant() tenant: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, tenant.id, dto);
  }

  @Patch(':id/notes')
  updateNotes(@CurrentTenant() tenant: any, @Param('id') id: string, @Body() body: { notes: string }) {
    return this.customersService.updateNotes(id, tenant.id, body.notes);
  }

  @Get(':id/orders')
  getOrders(
    @CurrentTenant() tenant: any,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.customersService.getCustomerOrders(id, tenant.id, parseInt(page ?? '1'), parseInt(limit ?? '10'));
  }

  // ── Tags on customer ─────────────────────────────────────────────────────

  @Post(':id/tags')
  addTag(@CurrentTenant() tenant: any, @Param('id') id: string, @Body() body: { tagId: string }) {
    return this.customersService.addTagToCustomer(id, body.tagId, tenant.id);
  }

  @Delete(':id/tags/:tagId')
  removeTag(@CurrentTenant() tenant: any, @Param('id') id: string, @Param('tagId') tagId: string) {
    return this.customersService.removeTagFromCustomer(id, tagId, tenant.id);
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  @Post(':id/addresses')
  addAddress(@CurrentTenant() tenant: any, @Param('id') id: string, @Body() dto: CreateAddressDto) {
    return this.customersService.addAddress(id, tenant.id, dto);
  }

  @Patch(':id/addresses/:addressId')
  updateAddress(
    @CurrentTenant() tenant: any,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() dto: Partial<CreateAddressDto>,
  ) {
    return this.customersService.updateAddress(addressId, id, tenant.id, dto);
  }

  @Delete(':id/addresses/:addressId')
  removeAddress(
    @CurrentTenant() tenant: any,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return this.customersService.removeAddress(addressId, id, tenant.id);
  }
}
