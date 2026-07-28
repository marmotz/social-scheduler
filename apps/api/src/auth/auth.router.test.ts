import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppConfigService } from '../config/app-config.service.js';
import type { Context } from '../trpc/context.js';
import { createAuthRouter } from './auth.router.js';
import type { AuthService } from './auth.service.js';

const config = { isProduction: false } as unknown as AppConfigService;

function createResMock() {
  return { cookie: vi.fn(), clearCookie: vi.fn() };
}

function createContext(overrides: Partial<Context> = {}): Context {
  return {
    req: { cookies: {}, headers: {} } as Context['req'],
    res: createResMock() as unknown as Context['res'],
    user: null,
    ...overrides,
  };
}

describe('authRouter', () => {
  let authService: {
    register: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    refresh: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authService = { register: vi.fn(), login: vi.fn(), refresh: vi.fn() };
  });

  const tokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
    user: { id: 'user-1', email: 'jane@example.com' },
  };

  it('register sets the refresh cookie and returns the session', async () => {
    authService.register.mockResolvedValue(tokens);
    const ctx = createContext();
    const router = createAuthRouter(authService as unknown as AuthService, config);
    const caller = router.createCaller(ctx);

    const result = await caller.register({ email: 'jane@example.com', password: 'password123' });

    expect(result).toEqual({ accessToken: 'access-token', user: tokens.user });
    expect(ctx.res.cookie).toHaveBeenCalledWith(
      'sonskay_refresh_token',
      'refresh-token',
      expect.objectContaining({ httpOnly: true })
    );
  });

  it('login sets the refresh cookie and returns the session', async () => {
    authService.login.mockResolvedValue(tokens);
    const ctx = createContext();
    const router = createAuthRouter(authService as unknown as AuthService, config);
    const caller = router.createCaller(ctx);

    const result = await caller.login({ email: 'jane@example.com', password: 'password123' });

    expect(result).toEqual({ accessToken: 'access-token', user: tokens.user });
    expect(ctx.res.cookie).toHaveBeenCalled();
  });

  it('refresh reads the cookie and rotates it', async () => {
    authService.refresh.mockResolvedValue(tokens);
    const ctx = createContext({
      req: { cookies: { sonskay_refresh_token: 'old-token' }, headers: {} } as unknown as Context['req'],
    });
    const router = createAuthRouter(authService as unknown as AuthService, config);
    const caller = router.createCaller(ctx);

    const result = await caller.refresh();

    expect(authService.refresh).toHaveBeenCalledWith('old-token');
    expect(result).toEqual({ accessToken: 'access-token', user: tokens.user });
  });

  it('refresh rejects with UNAUTHORIZED when there is no cookie', async () => {
    const ctx = createContext();
    const router = createAuthRouter(authService as unknown as AuthService, config);
    const caller = router.createCaller(ctx);

    await expect(caller.refresh()).rejects.toBeInstanceOf(TRPCError);
  });

  it('logout clears the refresh cookie', async () => {
    const ctx = createContext();
    const router = createAuthRouter(authService as unknown as AuthService, config);
    const caller = router.createCaller(ctx);

    const result = await caller.logout();

    expect(result).toEqual({ success: true });
    expect(ctx.res.clearCookie).toHaveBeenCalledWith('sonskay_refresh_token', { path: '/' });
  });

  it('me rejects with UNAUTHORIZED when there is no authenticated user', async () => {
    const ctx = createContext({ user: null });
    const router = createAuthRouter(authService as unknown as AuthService, config);
    const caller = router.createCaller(ctx);

    await expect(caller.me()).rejects.toBeInstanceOf(TRPCError);
  });

  it('me returns the current user when authenticated', async () => {
    const ctx = createContext({ user: { id: 'user-1', email: 'jane@example.com' } });
    const router = createAuthRouter(authService as unknown as AuthService, config);
    const caller = router.createCaller(ctx);

    await expect(caller.me()).resolves.toEqual({ id: 'user-1', email: 'jane@example.com' });
  });
});
