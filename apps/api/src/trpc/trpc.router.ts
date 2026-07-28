import { createAuthRouter } from '../auth/auth.router.js';
import type { AuthService } from '../auth/auth.service.js';
import type { AppConfigService } from '../config/app-config.service.js';
import { router } from './trpc.js';

export function createAppRouter(authService: AuthService, config: AppConfigService) {
  return router({
    auth: createAuthRouter(authService, config),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
