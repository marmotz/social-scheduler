import { Module } from '@nestjs/common';
import { BlueskyModule } from './bluesky/bluesky.module.js';
import { NetworkCapabilitiesResolver } from './network-capabilities.resolver.js';
import { TwitterModule } from './twitter/twitter.module.js';

@Module({
  imports: [TwitterModule, BlueskyModule],
  providers: [NetworkCapabilitiesResolver],
  exports: [NetworkCapabilitiesResolver],
})
export class NetworkCapabilitiesModule {}
