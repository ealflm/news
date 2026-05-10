import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { loadEnv } from '../config/env';
import type { JwtAccessPayload } from '@news/shared';

const cookieExtractor = (req: Request): string | null =>
  (req?.cookies?.['access_token'] as string | undefined) ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: cookieExtractor,
      ignoreExpiration: false,
      secretOrKey: loadEnv().JWT_ACCESS_SECRET,
    });
  }

  validate(payload: JwtAccessPayload): JwtAccessPayload {
    if (payload.type !== 'access') throw new UnauthorizedException('wrong token type');
    return payload;
  }
}
