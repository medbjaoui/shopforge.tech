import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class CustomerJwtStrategy extends PassportStrategy(Strategy, 'customer-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET ?? 'secret',
    });
  }

  async validate(payload: any) {
    if (payload.type !== 'customer') {
      throw new UnauthorizedException('Token invalide.');
    }
    return { customerId: payload.sub, tenantId: payload.tenantId };
  }
}
