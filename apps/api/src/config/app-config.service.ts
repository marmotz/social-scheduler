import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import type { Env } from './env.schema.js';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<Env, true>) {}

  get nodeEnv(): Env['NODE_ENV'] {
    return this.configService.get('NODE_ENV', { infer: true });
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get port(): number {
    return this.configService.get('PORT', { infer: true });
  }

  get databaseUrl(): string {
    return this.configService.get('DATABASE_URL', { infer: true });
  }

  get encryptionKey(): string {
    return this.configService.get('SONSKAY_ENCRYPTION_KEY', { infer: true });
  }

  get jwtAccessSecret(): string {
    return this.configService.get('JWT_ACCESS_SECRET', { infer: true });
  }

  get jwtRefreshSecret(): string {
    return this.configService.get('JWT_REFRESH_SECRET', { infer: true });
  }

  get jwtAccessExpiresIn(): StringValue {
    return this.configService.get('JWT_ACCESS_EXPIRES_IN', { infer: true }) as StringValue;
  }

  get jwtRefreshExpiresIn(): StringValue {
    return this.configService.get('JWT_REFRESH_EXPIRES_IN', { infer: true }) as StringValue;
  }

  get webUrl(): string {
    return this.configService.get('WEB_URL', { infer: true });
  }

  get twitterClientId(): string | undefined {
    return this.configService.get('TWITTER_CLIENT_ID', { infer: true });
  }

  get twitterClientSecret(): string | undefined {
    return this.configService.get('TWITTER_CLIENT_SECRET', { infer: true });
  }

  get twitterApiBaseUrl(): string {
    return this.configService.get('TWITTER_API_BASE_URL', { infer: true });
  }

  /** Host of the interactive OAuth2 authorization page — distinct from `twitterApiBaseUrl` (the REST API host). */
  get twitterAuthorizeBaseUrl(): string {
    return this.configService.get('TWITTER_AUTHORIZE_BASE_URL', { infer: true });
  }

  get blueskyServiceUrl(): string {
    return this.configService.get('BLUESKY_SERVICE_URL', { infer: true });
  }

  get minioEndpoint(): string {
    return this.configService.get('MINIO_ENDPOINT', { infer: true });
  }

  get minioPort(): number {
    return this.configService.get('MINIO_PORT', { infer: true });
  }

  get minioUseSsl(): boolean {
    return this.configService.get('MINIO_USE_SSL', { infer: true });
  }

  get minioAccessKey(): string {
    return this.configService.get('MINIO_ACCESS_KEY', { infer: true });
  }

  get minioSecretKey(): string {
    return this.configService.get('MINIO_SECRET_KEY', { infer: true });
  }

  get minioBucket(): string {
    return this.configService.get('MINIO_BUCKET', { infer: true });
  }
}
