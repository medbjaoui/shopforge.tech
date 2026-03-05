import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Tenant } from '@prisma/client';

@Controller('tenants')
export class TenantsController {
  constructor(private tenantsService: TenantsService) {}

  // Public : vitrine du store — SSR Next.js l'appelle sans auth
  @Public()
  @Get('public/:slug')
  getPublic(@Param('slug') slug: string) {
    return this.tenantsService.getPublic(slug);
  }

  // Résolution domaine custom → slug (utilisé par le middleware Next.js)
  @Public()
  @Get('by-domain/:domain')
  getByDomain(@Param('domain') domain: string) {
    return this.tenantsService.findByDomain(domain);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentTenant() tenant: Tenant) {
    return this.tenantsService.getMe(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/usage')
  getUsage(@CurrentTenant() tenant: Tenant) {
    return this.tenantsService.getUsage(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/referral')
  getMyReferral(@CurrentTenant() tenant: Tenant) {
    return this.tenantsService.getMyReferral(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/onboarding')
  completeOnboarding(
    @CurrentTenant() tenant: Tenant,
    @Body() body: { name?: string; description?: string; logo?: string; theme?: string; plan?: string },
  ) {
    return this.tenantsService.completeOnboarding(tenant.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  update(
    @CurrentTenant() tenant: Tenant,
    @Body() body: {
      name?: string; description?: string; logo?: string; theme?: string;
      phone?: string; whatsapp?: string; address?: string; contactEmail?: string;
      shippingFee?: number; freeShippingThreshold?: number; returnPolicy?: string;
      codEnabled?: boolean;
      matriculeFiscal?: string; rne?: string;
      legalName?: string; legalAddress?: string;
      // Customisation avancée
      bannerImage?: string; instagram?: string; facebook?: string; tiktok?: string;
      announcementText?: string; announcementEnabled?: boolean;
      announcementBgColor?: string; announcementTextColor?: string;
      heroTitle?: string; heroSubtitle?: string; heroCta?: string;
      favicon?: string; font?: string;
      notificationChannel?: string;
      storeLanguage?: string;
    },
  ) {
    return this.tenantsService.update(tenant.id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/telegram-link-code')
  generateTelegramLinkCode(@CurrentTenant() tenant: Tenant) {
    return this.tenantsService.generateTelegramLinkCode(tenant.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/telegram')
  disconnectTelegram(@CurrentTenant() tenant: Tenant) {
    return this.tenantsService.disconnectTelegram(tenant.id);
  }
}
