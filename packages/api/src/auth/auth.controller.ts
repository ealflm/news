import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ZodValidationPipe } from './zod.pipe';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard, JwtRefreshGuard } from './guards/jwt.guard';
import { LoginInputSchema, type LoginInput } from '@news/shared';
import { loadEnv } from '../config/env';
import { TokenRevocationService } from './token-revocation.service';

const baseCookie: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};
const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly revocation: TokenRevocationService,
  ) {}

  @Post('login')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(LoginInputSchema))
  async login(@Body() body: LoginInput, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateCreds(body.username, body.password);
    const access = this.auth.signAccessToken(user);
    const refresh = this.auth.signRefreshToken(user);

    res.cookie('access_token', access.token, { ...baseCookie, maxAge: ACCESS_MS });
    res.cookie('refresh_token', refresh.token, { ...baseCookie, maxAge: REFRESH_MS });

    return {
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
      },
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const payload = req.user as { sub: string };
    const user = await this.users.findByIdOrThrow(payload.sub);
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    };
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = req.user as { sub: string; jti?: string; exp?: number };
    const user = await this.users.findByIdOrThrow(payload.sub);
    // Don't revoke the old refresh token here: concurrent middleware refreshes
    // (page navigation + prefetch) would race — the first revokes the jti before
    // the second's guard runs, kicking the user to /admin/login. Old refresh
    // tokens stay valid until natural expiry; only /logout revokes explicitly.
    const access = this.auth.signAccessToken(user);
    const refresh = this.auth.signRefreshToken(user);
    res.cookie('access_token', access.token, { ...baseCookie, maxAge: ACCESS_MS });
    res.cookie('refresh_token', refresh.token, { ...baseCookie, maxAge: REFRESH_MS });
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const env = loadEnv();
    const accessToken = req.cookies?.access_token as string | undefined;
    const refreshToken = req.cookies?.refresh_token as string | undefined;
    for (const [secret, token] of [
      [env.JWT_ACCESS_SECRET, accessToken],
      [env.JWT_REFRESH_SECRET, refreshToken],
    ] as [string, string | undefined][]) {
      if (!token) continue;
      try {
        const decoded = this.jwt.verify<{ jti?: string; exp?: number }>(token, { secret });
        if (decoded.jti && decoded.exp) {
          const ttl = decoded.exp - Math.floor(Date.now() / 1000);
          if (ttl > 0) {
            await this.revocation.revoke(decoded.jti, ttl);
          }
        }
      } catch {
        // ignore
      }
    }
    res.clearCookie('access_token', { ...baseCookie });
    res.clearCookie('refresh_token', { ...baseCookie });
  }
}
