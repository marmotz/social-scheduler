import { mockTrpcFetch, trpcError, trpcSuccess } from '@/lib/test-trpc-fetch.js';
import { TRPCProvider, trpcClient } from '@/lib/trpc.js';
import { useAuthStore } from '@/stores/auth-store.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { dashboardRoute } from './dashboard.js';
import { loginRoute } from './login.js';
import { registerRoute } from './register.js';
import { rootRoute } from './root.js';

function renderAt(path: string) {
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

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isHydrated: false });
  });

  it('logs in and redirects to the dashboard on success', async () => {
    mockTrpcFetch({
      'auth.login': () => trpcSuccess({ accessToken: 'token', user: { id: 'user-1', email: 'jane@example.com' } }),
      'auth.refresh': () => trpcError('UNAUTHORIZED', 401),
    });

    renderAt('/login');

    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Signed in as jane@example.com.')).toBeInTheDocument();
    expect(useAuthStore.getState().user).toEqual({ id: 'user-1', email: 'jane@example.com' });
  });

  it('shows an error message when credentials are invalid', async () => {
    mockTrpcFetch({
      'auth.login': () => trpcError('Invalid credentials', 401),
    });

    renderAt('/login');

    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Log in' }));

    expect(await screen.findByText('Invalid email or password.')).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
  });
});
