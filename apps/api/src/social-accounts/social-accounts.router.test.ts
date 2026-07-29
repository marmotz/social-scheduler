import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '../trpc/context.js';
import { createSocialAccountsRouter } from './social-accounts.router.js';
import type { SocialAccountsService } from './social-accounts.service.js';

function createContext(overrides: Partial<Context> = {}): Context {
  return {
    req: {} as Context['req'],
    res: {} as Context['res'],
    user: { id: 'user-1', email: 'jane@example.com' },
    ...overrides,
  };
}

describe('socialAccountsRouter', () => {
  let service: {
    listAccounts: ReturnType<typeof vi.fn>;
    startConnect: ReturnType<typeof vi.fn>;
    completeConnect: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      listAccounts: vi.fn(),
      startConnect: vi.fn(),
      completeConnect: vi.fn(),
      disconnect: vi.fn(),
    };
  });

  it('listAccounts delegates to the service with the current user id', async () => {
    service.listAccounts.mockResolvedValue([]);
    const router = createSocialAccountsRouter(service as unknown as SocialAccountsService);
    const caller = router.createCaller(createContext());

    await caller.listAccounts();

    expect(service.listAccounts).toHaveBeenCalledWith('user-1');
  });

  it('listAccounts rejects when unauthenticated', async () => {
    const router = createSocialAccountsRouter(service as unknown as SocialAccountsService);
    const caller = router.createCaller(createContext({ user: null }));

    await expect(caller.listAccounts()).rejects.toThrow();
  });

  it('startConnect forwards network and redirectUri', async () => {
    service.startConnect.mockReturnValue({ authorizationUrl: 'https://x.test/authorize', state: 'state-1' });
    const router = createSocialAccountsRouter(service as unknown as SocialAccountsService);
    const caller = router.createCaller(createContext());

    const result = await caller.startConnect({ network: 'TWITTER', redirectUri: 'https://app.test/callback' });

    expect(service.startConnect).toHaveBeenCalledWith('TWITTER', 'https://app.test/callback');
    expect(result).toEqual({ authorizationUrl: 'https://x.test/authorize', state: 'state-1' });
  });

  it('completeConnect forwards the current user id, network and credentials', async () => {
    service.completeConnect.mockResolvedValue({
      id: 'acc-1',
      network: 'BLUESKY',
      handle: 'jane.bsky.social',
      status: 'CONNECTED',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    const router = createSocialAccountsRouter(service as unknown as SocialAccountsService);
    const caller = router.createCaller(createContext());
    const credentials = { type: 'app_password' as const, identifier: 'jane.bsky.social', appPassword: 'secret' };

    await caller.completeConnect({ network: 'BLUESKY', credentials });

    expect(service.completeConnect).toHaveBeenCalledWith('user-1', 'BLUESKY', credentials);
  });

  it('disconnect forwards the current user id and account id', async () => {
    service.disconnect.mockResolvedValue(undefined);
    const router = createSocialAccountsRouter(service as unknown as SocialAccountsService);
    const caller = router.createCaller(createContext());

    const result = await caller.disconnect({ accountId: 'acc-1' });

    expect(service.disconnect).toHaveBeenCalledWith('user-1', 'acc-1');
    expect(result).toEqual({ success: true });
  });
});
