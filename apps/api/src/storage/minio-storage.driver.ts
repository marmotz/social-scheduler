import { Injectable, type OnModuleInit } from '@nestjs/common';
import { Client } from 'minio';
import { AppConfigService } from '../config/app-config.service.js';
import type { StorageDriver } from './storage-driver.interface.js';

/** Maximum accepted by MinIO/S3 presigned URLs (7 days, in seconds). */
const PRESIGNED_URL_EXPIRY_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class MinioStorageDriver implements StorageDriver, OnModuleInit {
  private readonly client: Client;
  private readonly bucket: string;

  constructor(config: AppConfigService) {
    this.client = new Client({
      endPoint: config.minioEndpoint,
      port: config.minioPort,
      useSSL: config.minioUseSsl,
      accessKey: config.minioAccessKey,
      secretKey: config.minioSecretKey,
    });
    this.bucket = config.minioBucket;
  }

  async onModuleInit(): Promise<void> {
    const exists = await this.client.bucketExists(this.bucket);
    if (!exists) {
      await this.client.makeBucket(this.bucket);
    }
  }

  async upload(key: string, data: Buffer, mimeType: string): Promise<void> {
    await this.client.putObject(this.bucket, key, data, data.length, { 'Content-Type': mimeType });
  }

  async getUrl(key: string): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, PRESIGNED_URL_EXPIRY_SECONDS);
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key);
  }
}
