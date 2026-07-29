import { Module } from '@nestjs/common';
import { BlueskyAdapter } from './bluesky.adapter.js';

@Module({
  providers: [BlueskyAdapter],
  exports: [BlueskyAdapter],
})
export class BlueskyModule {}
