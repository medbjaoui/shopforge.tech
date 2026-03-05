import { Controller, Get, Post, Body, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { InventoryService } from './inventory.service';
import { AdjustStockDto } from './dto/adjust-stock.dto';
import { QueryMovementsDto } from './dto/query-movements.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('summary')
  getSummary(@CurrentTenant() tenant: any) {
    return this.inventoryService.getSummary(tenant.id);
  }

  @Get('movements')
  findMovements(@CurrentTenant() tenant: any, @Query() query: QueryMovementsDto) {
    return this.inventoryService.findMovements(tenant.id, query);
  }

  @Post('adjust')
  adjustStock(@CurrentTenant() tenant: any, @Body() dto: AdjustStockDto) {
    return this.inventoryService.adjustStock(tenant.id, dto);
  }

  @Get('export/csv')
  async exportCsv(@CurrentTenant() tenant: any, @Res() res: Response) {
    const csv = await this.inventoryService.exportMovementsCsv(tenant.id);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=mouvements-stock.csv');
    res.send('\uFEFF' + csv);
  }
}
