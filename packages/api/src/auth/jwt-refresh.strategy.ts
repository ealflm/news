import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { loadEnv } from '../config/env';
import type { JwtRefreshPayload } from '@news/shared';
import { TokenRevocationService } from './token-revocation.service';

const refreshCookieExtractor = (req: Request): string | null =>
  (req?.cookies?.['refresh_token'] as string | undefined) ?? null;

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private readonly revocation: TokenRevocationService) {
    super({
      jwtFromRequest: refreshCookieExtractor,
      ignoreExpiration: false,
      secretOrKey: loadEnv().JWT_REFRESH_SECRET,
    });
  }

  async validate(payload: JwtRefreshPayload & { jti?: string }): Promise<JwtRefreshPayload> {
    if (payload.type !== 'refresh') throw new UnauthorizedException('wrong token type');
    if (await this.revocation.isRevoked(payload.jti)) {
      throw new UnauthorizedException('token revoked');
    }
    return payload;
  }
}
