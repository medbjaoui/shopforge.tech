import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { Tenant, UserRole } from '@prisma/client';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /** POST /reviews/:productId — public, submit a review */
  @Post(':productId')
  create(
    @Req() req: any,
    @Param('productId') productId: string,
    @Body() body: { rating: number; authorName: string; authorEmail: string; comment?: string },
  ) {
    return this.reviewsService.create(req.tenant?.id, productId, body);
  }

  /** GET /reviews/product/:productId — public, approved reviews + stats */
  @Get('product/:productId')
  findByProduct(@Req() req: any, @Param('productId') productId: string) {
    return this.reviewsService.findByProduct(productId, req.tenant?.id);
  }

  /** GET /reviews — dashboard, all reviews for moderation */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get()
  findAll(
    @CurrentTenant() tenant: Tenant,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.findAll(tenant.id, status, page ? +page : 1, limit ? +limit : 20);
  }

  /** PATCH /reviews/:id/status — approve or reject */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Patch(':id/status')
  updateStatus(
    @CurrentTenant() tenant: Tenant,
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED' },
  ) {
    return this.reviewsService.updateStatus(id, tenant.id, body.status);
  }

  /** DELETE /reviews/:id */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Delete(':id')
  remove(@CurrentTenant() tenant: Tenant, @Param('id') id: string) {
    return this.reviewsService.remove(id, tenant.id);
  }
}
