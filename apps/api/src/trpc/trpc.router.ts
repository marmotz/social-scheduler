import { createAuthRouter } from '../auth/auth.router.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AppConfigService } from '../config/app-config.service.js';
import { createMediaRouter } from '../media/media.router.js';
import type { MediaService } from '../media/media.service.js';
import { createPostsRouter } from '../posts/posts.router.js';
import type { PostsService } from '../posts/posts.service.js';
import { createSocialAccountsRouter } from '../social-accounts/social-accounts.router.js';
import type { SocialAccountsService } from '../social-accounts/social-accounts.service.js';
import { router } from './trpc.js';

export function createAppRouter(
  authService: AuthService,
  config: AppConfigService,
  socialAccountsService: SocialAccountsService,
  mediaService: MediaService,
  postsService: PostsService
) {
  return router({
    auth: createAuthRouter(authService, config),
    socialAccounts: createSocialAccountsRouter(socialAccountsService),
    media: createMediaRouter(mediaService),
    posts: createPostsRouter(postsService),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
