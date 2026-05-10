import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
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

  signAccessToken(user: User): string {
    const env = loadEnv();
    const payload: JwtAccessPayload = { sub: user.id, email: user.email, type: 'access' };
    return this.jwt.sign(payload, {
      secret: env.JWT_ACCESS_SECRET,
      expiresIn: env.JWT_ACCESS_TTL,
    });
  }

  signRefreshToken(user: User): string {
    const env = loadEnv();
    const payload: JwtRefreshPayload = { sub: user.id, type: 'refresh' };
    return this.jwt.sign(payload, {
      secret: env.JWT_REFRESH_SECRET,
      expiresIn: env.JWT_REFRESH_TTL,
    });
  }
}
