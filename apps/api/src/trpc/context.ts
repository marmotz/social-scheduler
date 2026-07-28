import type { PublicUser } from '@sonskay/shared';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import type { AuthService } from '../auth/auth.service.js';

export interface Context {
  req: CreateExpressContextOptions['req'];
  res: CreateExpressContextOptions['res'];
  user: PublicUser | null;
}

export function createContextFactory(authService: AuthService) {
  return async ({ req, res }: CreateExpressContextOptions): Promise<Context> => {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const user = accessToken ? await authService.verifyAccessToken(accessToken) : null;

    return { req, res, user };
  };
}
