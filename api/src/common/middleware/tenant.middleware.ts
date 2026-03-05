import { Injectable, NestMiddleware, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

const TENANT_FREE_PATHS = ['/admin', '/health'];

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if (TENANT_FREE_PATHS.some((p) => req.path.startsWith(p))) {
      return next();
    }

    // ── Méthode 1 : X-Tenant-Slug header (Nginx en prod) ──────────────────
    const tenantSlug = req.headers['x-tenant-slug'] as string;
    if (tenantSlug) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug, isActive: true },
      });
      if (!tenant) throw new NotFoundException(`Store "${tenantSlug}" introuvable`);
      (req as any).tenant = tenant;
      return next();
    }

    // ── Méthode 2 : Bearer JWT (dashboard en dev sans subdomain) ──────────
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload = this.jwtService.verify<{ sub: string; tenantId: string }>(
          token,
          { secret: this.config.get('JWT_SECRET') },
        );
        if (payload.tenantId) {
          const tenant = await this.prisma.tenant.findUnique({
            where: { id: payload.tenantId, isActive: true },
          });
          if (!tenant) throw new UnauthorizedException('Store introuvable ou inactif');
          (req as any).tenant = tenant;
        }
      } catch (err) {
        // Propager UnauthorizedException, ignorer les erreurs de token invalide/expiré
        if (err instanceof UnauthorizedException) throw err;
        // Token invalide — le JwtAuthGuard rejettera si nécessaire
      }
    }

    next();
  }
}
