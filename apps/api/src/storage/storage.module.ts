import { Module } from '@nestjs/common';
import { MinioStorageDriver } from './minio-storage.driver.js';

@Module({
  providers: [MinioStorageDriver],
  exports: [MinioStorageDriver],
})
export class StorageModule {}
