import { Module } from '@nestjs/common';
import { NetworkCapabilitiesModule } from '../networks/network-capabilities.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { PostsService } from './posts.service.js';

@Module({
  imports: [StorageModule, NetworkCapabilitiesModule],
  providers: [PostsService],
  exports: [PostsService],
})
export class PostsModule {}
