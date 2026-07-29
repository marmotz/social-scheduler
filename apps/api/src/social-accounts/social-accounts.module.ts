import { Module } from '@nestjs/common';
import { BlueskyModule } from '../networks/bluesky/bluesky.module.js';
import { TwitterModule } from '../networks/twitter/twitter.module.js';
import { SocialAccountsService } from './social-accounts.service.js';

@Module({
  imports: [TwitterModule, BlueskyModule],
  providers: [SocialAccountsService],
  exports: [SocialAccountsService],
})
export class SocialAccountsModule {}
