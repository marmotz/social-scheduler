import { createAuthRouter } from '../auth/auth.router.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AppConfigService } from '../config/app-config.service.js';
import { createSocialAccountsRouter } from '../social-accounts/social-accounts.router.js';
import type { SocialAccountsService } from '../social-accounts/social-accounts.service.js';
import { router } from './trpc.js';

export function createAppRouter(
  authService: AuthService,
  config: AppConfigService,
  socialAccountsService: SocialAccountsService
) {
  return router({
    auth: createAuthRouter(authService, config),
    socialAccounts: createSocialAccountsRouter(socialAccountsService),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
