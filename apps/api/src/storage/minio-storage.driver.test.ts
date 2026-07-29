import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfigService } from '../config/app-config.service.js';

const bucketExists = vi.fn();
const makeBucket = vi.fn();
const putObject = vi.fn();
const presignedGetObject = vi.fn();
const removeObject = vi.fn();

vi.mock('minio', () => ({
  Client: class {
    bucketExists = bucketExists;
    makeBucket = makeBucket;
    putObject = putObject;
    presignedGetObject = presignedGetObject;
    removeObject = removeObject;
  },
}));

function createConfig(): AppConfigService {
  return {
    minioEndpoint: 'localhost',
    minioPort: 9000,
    minioUseSsl: false,
    minioAccessKey: 'access',
    minioSecretKey: 'secret',
    minioBucket: 'sonskay-media',
  } as unknown as AppConfigService;
}

describe('MinioStorageDriver', () => {
  let driver: import('./minio-storage.driver.js').MinioStorageDriver;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { MinioStorageDriver } = await import('./minio-storage.driver.js');
    driver = new MinioStorageDriver(createConfig());
  });

  describe('onModuleInit', () => {
    it('creates the bucket when it does not exist', async () => {
      bucketExists.mockResolvedValue(false);

      await driver.onModuleInit();

      expect(makeBucket).toHaveBeenCalledWith('sonskay-media');
    });

    it('does not recreate the bucket when it already exists', async () => {
      bucketExists.mockResolvedValue(true);

      await driver.onModuleInit();

      expect(makeBucket).not.toHaveBeenCalled();
    });
  });

  describe('upload', () => {
    it('puts the object with its content type', async () => {
      const data = Buffer.from('image-bytes');

      await driver.upload('key-1', data, 'image/png');

      expect(putObject).toHaveBeenCalledWith('sonskay-media', 'key-1', data, data.length, {
        'Content-Type': 'image/png',
      });
    });
  });

  describe('getUrl', () => {
    it('returns a presigned URL', async () => {
      presignedGetObject.mockResolvedValue('https://minio.test/key-1?signed');

      const url = await driver.getUrl('key-1');

      expect(url).toBe('https://minio.test/key-1?signed');
      expect(presignedGetObject).toHaveBeenCalledWith('sonskay-media', 'key-1', 7 * 24 * 60 * 60);
    });
  });

  describe('delete', () => {
    it('removes the object', async () => {
      await driver.delete('key-1');

      expect(removeObject).toHaveBeenCalledWith('sonskay-media', 'key-1');
    });
  });
});
