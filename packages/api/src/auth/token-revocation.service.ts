import { Injectable, OnModuleDestroy } from '@nestjs/common';
import IORedis from 'ioredis';
import { loadEnv } from '../config/env';

@Injectable()
export class TokenRevocationService implements OnModuleDestroy {
  private redis: IORedis;

  constructor() {
    const env = loadEnv();
    this.redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }

  private key(jti: string): string {
    return `revoked:jwt:${jti}`;
  }

  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    if (!jti) return;
    if (ttlSeconds <= 0) return;
    await this.redis.set(this.key(jti), '1', 'EX', ttlSeconds);
  }

  async isRevoked(jti: string | undefined): Promise<boolean> {
    if (!jti) return false;
    const v = await this.redis.get(this.key(jti));
    return v !== null;
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }
}
