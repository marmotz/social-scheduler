import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3003),
  DATABASE_URL: z.url(),
  SONSKAY_ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, 'must be a 64-character hex string (32 bytes), see `bun run generate:encryption-key`'),
  JWT_ACCESS_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1),
  JWT_ACCESS_EXPIRES_IN: z.string().min(1).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().min(1).default('7d'),
  WEB_URL: z.url().default('http://localhost:5173'),
  TWITTER_CLIENT_ID: z.string().min(1).optional(),
  TWITTER_CLIENT_SECRET: z.string().min(1).optional(),
  TWITTER_API_BASE_URL: z.url().default('https://api.twitter.com'),
  TWITTER_AUTHORIZE_BASE_URL: z.url().default('https://twitter.com'),
  BLUESKY_SERVICE_URL: z.url().default('https://bsky.social'),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }

  return result.data;
}
