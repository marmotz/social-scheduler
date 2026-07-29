import { mockTrpcFetch, trpcError, trpcSuccess } from '@/lib/test-trpc-fetch.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function renderSocialAccountsAt(path: string) {
  const { loginRoute } = await import('./login.js');
  const { rootRoute } = await import('./root.js');
  const { socialAccountsCallbackRoute } = await import('./social-accounts.callback.js');
  const { socialAccountsRoute } = await import('./social-accounts.js');
  const { trpcClient, TRPCProvider } = await import('@/lib/trpc.js');

  const routeTree = rootRoute.addChildren([loginRoute, socialAccountsRoute, socialAccountsCallbackRoute]);
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createRouter({ routeTree, history });
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <TRPCProvider
        trpcClient={trpcClient}
        queryClient={queryClient}
      >
        <RouterProvider router={router} />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

const session = trpcSuccess({ accessToken: 'token', user: { id: 'user-1', email: 'jane@example.com' } });

describe('social accounts page', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('redirects to /login when there is no valid session', async () => {
    mockTrpcFetch({ 'auth.refresh': () => trpcError('UNAUTHORIZED', 401) });

    await renderSocialAccountsAt('/social-accounts');

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  it('lists connected accounts with their status', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () =>
        trpcSuccess([
          {
            id: 'acc-1',
            network: 'TWITTER',
            handle: 'janedoe',
            status: 'CONNECTED',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'acc-2',
            network: 'BLUESKY',
            handle: 'jane.bsky.social',
            status: 'EXPIRED',
            createdAt: '2026-01-02T00:00:00.000Z',
          },
        ]),
    });

    await renderSocialAccountsAt('/social-accounts');

    expect(await screen.findByText('janedoe')).toBeInTheDocument();
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('jane.bsky.social')).toBeInTheDocument();
    expect(screen.getByText('Expired')).toBeInTheDocument();
  });

  it('shows an empty state when no account is connected', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess([]),
    });

    await renderSocialAccountsAt('/social-accounts');

    expect(await screen.findByText('No account connected yet.')).toBeInTheDocument();
  });

  it('disconnects an account and refreshes the list', async () => {
    let listCallCount = 0;
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => {
        listCallCount += 1;
        return listCallCount === 1
          ? trpcSuccess([
              {
                id: 'acc-1',
                network: 'TWITTER',
                handle: 'janedoe',
                status: 'CONNECTED',
                createdAt: '2026-01-01T00:00:00.000Z',
              },
            ])
          : trpcSuccess([]);
      },
      'socialAccounts.disconnect': () => trpcSuccess({ success: true }),
    });

    await renderSocialAccountsAt('/social-accounts');
    await screen.findByText('janedoe');

    fireEvent.click(screen.getByRole('button', { name: 'Disconnect' }));

    expect(await screen.findByText('No account connected yet.')).toBeInTheDocument();
  });

  it('connects a Bluesky account via the app password form', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess([]),
      'socialAccounts.completeConnect': () =>
        trpcSuccess({
          id: 'acc-1',
          network: 'BLUESKY',
          handle: 'jane.bsky.social',
          status: 'CONNECTED',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
    });

    await renderSocialAccountsAt('/social-accounts');
    await screen.findByText('No account connected yet.');

    fireEvent.change(screen.getByLabelText('Handle or email'), { target: { value: 'jane.bsky.social' } });
    fireEvent.change(screen.getByLabelText('App password'), { target: { value: 'xxxx-xxxx-xxxx-xxxx' } });
    fireEvent.click(screen.getByRole('button', { name: 'Connect Bluesky' }));

    await vi.waitFor(() => expect(screen.getByLabelText('Handle or email')).toHaveValue(''));
  });

  it('redirects to the X authorization URL when connecting Twitter', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess([]),
      'socialAccounts.startConnect': () =>
        trpcSuccess({ authorizationUrl: 'https://x.test/authorize?state=abc', state: 'abc' }),
    });

    const originalLocation = window.location;
    const locationMock = { ...originalLocation, href: '' };
    Object.defineProperty(window, 'location', { value: locationMock, writable: true });

    await renderSocialAccountsAt('/social-accounts');
    await screen.findByText('No account connected yet.');

    fireEvent.click(screen.getByRole('button', { name: 'Connect X / Twitter' }));

    await vi.waitFor(() => expect(window.location.href).toBe('https://x.test/authorize?state=abc'));

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
  });
});

describe('social accounts OAuth callback', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('completes the Twitter connection and redirects to the accounts page', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.completeConnect': () =>
        trpcSuccess({
          id: 'acc-1',
          network: 'TWITTER',
          handle: 'janedoe',
          status: 'CONNECTED',
          createdAt: '2026-01-01T00:00:00.000Z',
        }),
      'socialAccounts.listAccounts': () =>
        trpcSuccess([
          {
            id: 'acc-1',
            network: 'TWITTER',
            handle: 'janedoe',
            status: 'CONNECTED',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ]),
    });

    await renderSocialAccountsAt('/social-accounts/callback?code=auth-code&state=verifier-state');

    fireEvent.change(await screen.findByLabelText('X handle'), { target: { value: 'janedoe' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm and connect' }));

    expect(await screen.findByText('janedoe')).toBeInTheDocument();
  });

  it('shows an error when the authorization code is missing', async () => {
    mockTrpcFetch({ 'auth.refresh': () => session });

    await renderSocialAccountsAt('/social-accounts/callback');

    expect(await screen.findByText('Missing authorization code from X / Twitter.')).toBeInTheDocument();
  });
});
