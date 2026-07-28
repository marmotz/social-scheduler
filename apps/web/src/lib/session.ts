import { trpcClient } from '@/lib/trpc.js';
import { useAuthStore } from '@/stores/auth-store.js';

let bootstrapPromise: Promise<void> | null = null;

/**
 * Attempts a silent session restore from the httpOnly refresh cookie.
 * Memoized so the refresh mutation only ever runs once per page load,
 * regardless of how many routes await it in `beforeLoad`.
 */
export function bootstrapSession(): Promise<void> {
  if (!bootstrapPromise) {
    bootstrapPromise = trpcClient.auth.refresh
      .mutate()
      .then((session) => {
        useAuthStore.getState().setSession(session);
      })
      .catch(() => {
        // No valid refresh cookie: the user is simply not authenticated yet.
      })
      .finally(() => {
        useAuthStore.getState().setHydrated();
      });
  }
  return bootstrapPromise;
}
