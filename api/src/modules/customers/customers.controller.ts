import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { CustomerQueryDto } from './dto/customer-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  // ── Static routes first (before :id) ──────────────────────────────────────

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('stats')
  getStats(@CurrentTenant() tenant: any) {
    return this.customersService.getStats(tenant.id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('segments')
  getSegmentCounts(@CurrentTenant() tenant: any) {
    return this.customersService.getSegmentCounts(tenant.id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('tags')
  findAllTags(@CurrentTenant() tenant: any) {
    return this.customersService.findAllTags(tenant.id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('tags')
  createTag(@CurrentTenant() tenant: any, @Body() body: { name: string; color?: string }) {
    return this.customersService.createTag(tenant.id, body.name, body.color);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete('tags/:tagId')
  deleteTag(@CurrentTenant() tenant: any, @Param('tagId') tagId: string) {
    return this.customersService.deleteTag(tagId, tenant.id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('export/csv')
  async exportCsv(@CurrentTenant() tenant: any, @Res() res: Response) {
    const csv = await this.customersService.exportCsv(tenant.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=clients.csv');
    res.send('\uFEFF' + csv);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post('migrate')
  migrate() {
    return this.customersService.migrateExistingOrders();
  }

  // ── Dynamic :id routes ────────────────────────────────────────────────────

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get()
  findAll(@CurrentTenant() tenant: any, @Query() query: CustomerQueryDto) {
    return this.customersService.findAll(tenant.id, query);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post()
  create(@CurrentTenant() tenant: any, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(tenant.id, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get(':id')
  findOne(@CurrentTenant() tenant: any, @Param('id') id: string) {
    return this.customersService.findOne(id, tenant.id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id')
  update(@CurrentTenant() tenant: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, tenant.id, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id/notes')
  updateNotes(@CurrentTenant() tenant: any, @Param('id') id: string, @Body() body: { notes: string }) {
    return this.customersService.updateNotes(id, tenant.id, body.notes);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
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

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post(':id/tags')
  addTag(@CurrentTenant() tenant: any, @Param('id') id: string, @Body() body: { tagId: string }) {
    return this.customersService.addTagToCustomer(id, body.tagId, tenant.id);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id/tags/:tagId')
  removeTag(@CurrentTenant() tenant: any, @Param('id') id: string, @Param('tagId') tagId: string) {
    return this.customersService.removeTagFromCustomer(id, tagId, tenant.id);
  }

  // ── Addresses ─────────────────────────────────────────────────────────────

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Post(':id/addresses')
  addAddress(@CurrentTenant() tenant: any, @Param('id') id: string, @Body() dto: CreateAddressDto) {
    return this.customersService.addAddress(id, tenant.id, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id/addresses/:addressId')
  updateAddress(
    @CurrentTenant() tenant: any,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
    @Body() dto: Partial<CreateAddressDto>,
  ) {
    return this.customersService.updateAddress(addressId, id, tenant.id, dto);
  }

  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id/addresses/:addressId')
  removeAddress(
    @CurrentTenant() tenant: any,
    @Param('id') id: string,
    @Param('addressId') addressId: string,
  ) {
    return this.customersService.removeAddress(addressId, id, tenant.id);
  }
}
