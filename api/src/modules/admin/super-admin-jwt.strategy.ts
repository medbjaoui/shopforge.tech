import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(Strategy, 'super-admin-jwt') {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_ADMIN_SECRET') ?? config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; isAdmin: true }) {
    if (!payload.isAdmin) throw new UnauthorizedException();

    const admin = await this.prisma.superAdmin.findUnique({
      where: { id: payload.sub },
    });

    if (!admin) throw new UnauthorizedException('Super admin introuvable');

    return admin;
  }
}
