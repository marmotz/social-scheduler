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

describe('RegisterPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isHydrated: false });
  });

  it('creates the account and redirects to the dashboard on success', async () => {
    mockTrpcFetch({
      'auth.register': () => trpcSuccess({ accessToken: 'token', user: { id: 'user-1', email: 'jane@example.com' } }),
      'auth.refresh': () => trpcError('UNAUTHORIZED', 401),
    });

    renderAt('/register');

    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Signed in as jane@example.com.')).toBeInTheDocument();
  });

  it('shows an error message when the email is already registered', async () => {
    mockTrpcFetch({
      'auth.register': () => trpcError('Email already in use', 409),
    });

    renderAt('/register');

    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('This email is already registered.')).toBeInTheDocument();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('shows a validation error when the password is too short', async () => {
    const fetchMock = mockTrpcFetch({});

    renderAt('/register');

    fireEvent.change(await screen.findByLabelText('Email'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } });
    fireEvent.click(screen.getByRole('button', { name: 'Register' }));

    expect(await screen.findByText('Password must be at least 8 characters, email must be valid.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
