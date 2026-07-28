import { loginSchema, registerSchema } from '@sonskay/shared';
import { TRPCError } from '@trpc/server';
import type { AppConfigService } from '../config/app-config.service.js';
import type { Context } from '../trpc/context.js';
import { protectedProcedure, publicProcedure, router } from '../trpc/trpc.js';
import type { AuthService, AuthTokens } from './auth.service.js';

const REFRESH_COOKIE_NAME = 'sonskay_refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function setRefreshCookie(res: Context['res'], refreshToken: string, config: AppConfigService) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  });
}

function clearRefreshCookie(res: Context['res']) {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
}

function toSession(tokens: AuthTokens) {
  return { accessToken: tokens.accessToken, user: tokens.user };
}

export function createAuthRouter(authService: AuthService, config: AppConfigService) {
  return router({
    register: publicProcedure.input(registerSchema).mutation(async ({ input, ctx }) => {
      const tokens = await authService.register(input);
      setRefreshCookie(ctx.res, tokens.refreshToken, config);

      return toSession(tokens);
    }),

    login: publicProcedure.input(loginSchema).mutation(async ({ input, ctx }) => {
      const tokens = await authService.login(input);
      setRefreshCookie(ctx.res, tokens.refreshToken, config);

      return toSession(tokens);
    }),

    refresh: publicProcedure.mutation(async ({ ctx }) => {
      const refreshToken = (ctx.req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE_NAME];
      if (!refreshToken) {
        throw new TRPCError({ code: 'UNAUTHORIZED' });
      }

      const tokens = await authService.refresh(refreshToken);
      setRefreshCookie(ctx.res, tokens.refreshToken, config);

      return toSession(tokens);
    }),

    logout: publicProcedure.mutation(({ ctx }) => {
      clearRefreshCookie(ctx.res);

      return { success: true as const };
    }),

    me: protectedProcedure.query(({ ctx }) => ctx.user),
  });
}
