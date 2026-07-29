import { describe, expect, it } from 'vitest';
import { validateEnv } from './env.schema.js';

function validEnv(overrides: Record<string, unknown> = {}) {
  return {
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
    SONSKAY_ENCRYPTION_KEY: 'a'.repeat(64),
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    MINIO_ACCESS_KEY: 'minio-access-key',
    MINIO_SECRET_KEY: 'minio-secret-key',
    ...overrides,
  };
}

describe('validateEnv', () => {
  it('accepts a valid configuration and applies defaults', () => {
    const env = validateEnv(validEnv());

    expect(env).toMatchObject({
      NODE_ENV: 'development',
      PORT: 3003,
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
      WEB_URL: 'http://localhost:5173',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: 9000,
      MINIO_USE_SSL: false,
      MINIO_BUCKET: 'sonskay-media',
    });
  });

  it('coerces PORT to a number', () => {
    const env = validateEnv(validEnv({ PORT: '4000' }));

    expect(env.PORT).toBe(4000);
  });

  it('throws when a required variable is missing', () => {
    const { JWT_ACCESS_SECRET: _omitted, ...rest } = validEnv();

    expect(() => validateEnv(rest)).toThrow(/Invalid environment variables/);
  });

  it('throws when DATABASE_URL is not a valid URL', () => {
    expect(() => validateEnv(validEnv({ DATABASE_URL: 'not-a-url' }))).toThrow();
  });

  it('rejects an unknown NODE_ENV value', () => {
    expect(() => validateEnv(validEnv({ NODE_ENV: 'staging' }))).toThrow();
  });

  it('rejects an encryption key that is not a 64-character hex string', () => {
    expect(() => validateEnv(validEnv({ SONSKAY_ENCRYPTION_KEY: 'too-short' }))).toThrow(
      /Invalid environment variables/
    );
  });
});
