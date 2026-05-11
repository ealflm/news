import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { loadEnv } from '../config/env';
import type { JwtAccessPayload, JwtRefreshPayload } from '@news/shared';
import type { User } from '@news/db';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async validateCreds(email: string, password: string): Promise<User> {
    const user = await this.users.findByEmail(email);
    if (!user) throw new UnauthorizedException('invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('invalid credentials');
    return user;
  }

  signAccessToken(user: User): { token: string; jti: string } {
    const env = loadEnv();
    const jti = randomUUID();
    const payload: JwtAccessPayload & { jti: string } = {
      sub: user.id,
      email: user.email,
      type: 'access',
      jti,
    };
    const token = this.jwt.sign(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_TTL,
    } as JwtSignOptions);
    return { token, jti };
  }

  signRefreshToken(user: User): { token: string; jti: string } {
    const env = loadEnv();
    const jti = randomUUID();
    const payload: JwtRefreshPayload & { jti: string } = {
      sub: user.id,
      type: 'refresh',
      jti,
    };
    const token = this.jwt.sign(payload, {
      secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_TTL,
    } as JwtSignOptions);
    return { token, jti };
  }
}
