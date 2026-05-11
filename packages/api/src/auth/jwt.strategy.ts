import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { loadEnv } from '../config/env';
import type { JwtAccessPayload } from '@news/shared';
import { TokenRevocationService } from './token-revocation.service';

const cookieExtractor = (req: Request): string | null =>
  (req?.cookies?.['access_token'] as string | undefined) ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly revocation: TokenRevocationService) {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: loadEnv().JWT_ACCESS_SECRET,
    });
  }

  async validate(payload: JwtAccessPayload & { jti?: string }): Promise<JwtAccessPayload> {
    if (payload.type !== 'access') throw new UnauthorizedException('wrong token type');
    if (await this.revocation.isRevoked(payload.jti)) {
      throw new UnauthorizedException('token revoked');
    }
    return payload;
  }
}
