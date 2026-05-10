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
import { ZodValidationPipe } from './zod.pipe';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard, JwtRefreshGuard } from './guards/jwt.guard';
import { LoginInputSchema, type LoginInput } from '@news/shared';

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
  ) {}

  @Post('login')
  @HttpCode(200)
  @UsePipes(new ZodValidationPipe(LoginInputSchema))
  async login(@Body() body: LoginInput, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.validateCreds(body.email, body.password);
    const access = this.auth.signAccessToken(user);
    const refresh = this.auth.signRefreshToken(user);

    res.cookie('access_token', access, { ...baseCookie, maxAge: ACCESS_MS });
    res.cookie('refresh_token', refresh, { ...baseCookie, maxAge: REFRESH_MS });

    return { user: { id: user.id, email: user.email, displayName: user.displayName } };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    const payload = req.user as { sub: string };
    const user = await this.users.findByIdOrThrow(payload.sub);
    return { id: user.id, email: user.email, displayName: user.displayName };
  }

  @Post('refresh')
  @HttpCode(200)
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const payload = req.user as { sub: string };
    const user = await this.users.findByIdOrThrow(payload.sub);
    const access = this.auth.signAccessToken(user);
    res.cookie('access_token', access, { ...baseCookie, maxAge: ACCESS_MS });
    return { ok: true };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', { ...baseCookie });
    res.clearCookie('refresh_token', { ...baseCookie });
  }
}
