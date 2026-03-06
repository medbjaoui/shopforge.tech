import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Tenant, UserRole } from '@prisma/client';

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

  // Tous les rôles peuvent voir les infos tenant
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF)
  @Get('me')
  getMe(@CurrentTenant() tenant: Tenant) {
    return this.tenantsService.getMe(tenant.id);
  }

  // OWNER et ADMIN peuvent voir l'usage
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER, UserRole.ADMIN)
  @Get('me/usage')
  getUsage(@CurrentTenant() tenant: Tenant) {
    return this.tenantsService.getUsage(tenant.id);
  }

  // Seulement OWNER peut voir le parrainage
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Get('me/referral')
  getMyReferral(@CurrentTenant() tenant: Tenant) {
    return this.tenantsService.getMyReferral(tenant.id);
  }

  // Seulement OWNER peut compléter l'onboarding
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post('me/onboarding')
  completeOnboarding(
    @CurrentTenant() tenant: Tenant,
    @Body() body: { name?: string; description?: string; logo?: string; theme?: string; plan?: string },
  ) {
    return this.tenantsService.completeOnboarding(tenant.id, body);
  }

  // Seulement OWNER peut modifier les paramètres boutique
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
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

  // Seulement OWNER peut configurer Telegram
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Post('me/telegram-link-code')
  generateTelegramLinkCode(@CurrentTenant() tenant: Tenant) {
    return this.tenantsService.generateTelegramLinkCode(tenant.id);
  }

  // Seulement OWNER peut déconnecter Telegram
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.OWNER)
  @Delete('me/telegram')
  disconnectTelegram(@CurrentTenant() tenant: Tenant) {
    return this.tenantsService.disconnectTelegram(tenant.id);
  }
}
