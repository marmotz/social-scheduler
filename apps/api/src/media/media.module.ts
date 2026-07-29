import { Module } from '@nestjs/common';
import { NetworkCapabilitiesModule } from '../networks/network-capabilities.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { MediaService } from './media.service.js';

@Module({
  imports: [StorageModule, NetworkCapabilitiesModule],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
