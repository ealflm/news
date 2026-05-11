import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  PUBLIC_BASE_URL: z.string().url(),
  UPLOADS_DIR: z.string().default('/home/ealflm/dev/news/uploads'),
  PUBLIC_UPLOADS_PREFIX: z.string().default('/uploads'),
  HMAC_CLICK_SECRET: z.string().min(32),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('"News Admin" <noreply@local.test>'),
  ADMIN_INVITE_SECRET: z.string().min(32).default('change_me_dev_only_invite_secret_32_chars_min'),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment');
  }
  return parsed.data;
}
