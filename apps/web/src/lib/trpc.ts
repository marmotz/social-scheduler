import { useAuthStore } from '@/stores/auth-store.js';
import type { AppRouter } from '@sonskay/api';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCContext } from '@trpc/tanstack-react-query';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3003';

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiUrl}/trpc`,
      fetch(url, options) {
        return fetch(url, { ...options, credentials: 'include' });
      },
      headers() {
        const accessToken = useAuthStore.getState().accessToken;
        return accessToken ? { authorization: `Bearer ${accessToken}` } : {};
      },
    }),
  ],
});

export const { TRPCProvider, useTRPC, useTRPCClient } = createTRPCContext<AppRouter>();
