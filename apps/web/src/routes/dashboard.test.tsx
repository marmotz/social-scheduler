import { mockTrpcFetch, trpcError, trpcSuccess } from '@/lib/test-trpc-fetch.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function renderDashboardAt(path: string) {
  const { dashboardRoute } = await import('./dashboard.js');
  const { loginRoute } = await import('./login.js');
  const { registerRoute } = await import('./register.js');
  const { rootRoute } = await import('./root.js');
  const { trpcClient, TRPCProvider } = await import('@/lib/trpc.js');

  const routeTree = rootRoute.addChildren([loginRoute, registerRoute, dashboardRoute]);
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

describe('dashboard route guard', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('redirects to /login when there is no valid session', async () => {
    mockTrpcFetch({
      'auth.refresh': () => trpcError('UNAUTHORIZED', 401),
    });

    await renderDashboardAt('/dashboard');

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  it('renders the dashboard when a session is already present', async () => {
    mockTrpcFetch({
      'auth.refresh': () => trpcSuccess({ accessToken: 'token', user: { id: 'user-1', email: 'jane@example.com' } }),
    });

    await renderDashboardAt('/dashboard');

    expect(await screen.findByText('Signed in as jane@example.com.')).toBeInTheDocument();
  });

  it('redirects to /login and clears the session when logging out', async () => {
    mockTrpcFetch({
      'auth.refresh': () => trpcSuccess({ accessToken: 'token', user: { id: 'user-1', email: 'jane@example.com' } }),
      'auth.logout': () => trpcSuccess({ success: true }),
    });

    await renderDashboardAt('/dashboard');
    await screen.findByText('Signed in as jane@example.com.');

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();

    const { useAuthStore } = await import('@/stores/auth-store.js');
    expect(useAuthStore.getState().user).toBeNull();
  });
});
