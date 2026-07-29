import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import { AppConfigService } from '../config/app-config.service.js';
import { EncryptionService } from '../crypto/encryption.service.js';
import { createSocialAccountEncryptionExtension } from './social-account-encryption.extension.js';

function buildClient(config: AppConfigService, encryption: EncryptionService) {
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString: config.databaseUrl }),
  });

  return client.$extends(createSocialAccountEncryptionExtension(encryption));
}

/**
 * Wraps PrismaClient instead of extending it: Prisma 7's generated client is a
 * factory-built class with a generic constructor, which TypeScript cannot
 * extend directly (see https://pris.ly/d/no-rust-engine).
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly client: ReturnType<typeof buildClient>;

  constructor(config: AppConfigService, encryption: EncryptionService) {
    this.client = buildClient(config, encryption);
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
