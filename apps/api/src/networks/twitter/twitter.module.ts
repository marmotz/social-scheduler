import { Module } from '@nestjs/common';
import { TwitterAdapter } from './twitter.adapter.js';

@Module({
  providers: [TwitterAdapter],
  exports: [TwitterAdapter],
})
export class TwitterModule {}
