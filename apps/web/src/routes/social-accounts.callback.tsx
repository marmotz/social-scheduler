import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { bootstrapSession } from '@/lib/session.js';
import { useTRPC } from '@/lib/trpc.js';
import { useAuthStore } from '@/stores/auth-store.js';
import { useMutation } from '@tanstack/react-query';
import { Link, createRoute, redirect, useNavigate, useSearch } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { rootRoute } from './root.js';
import { TWITTER_CALLBACK_PATH } from './social-accounts.js';

interface TwitterCallbackSearch {
  code?: string;
  state?: string;
  error?: string;
}

export const socialAccountsCallbackRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: TWITTER_CALLBACK_PATH,
  validateSearch: (search: Record<string, unknown>): TwitterCallbackSearch => ({
    code: typeof search.code === 'string' ? search.code : undefined,
    state: typeof search.state === 'string' ? search.state : undefined,
    error: typeof search.error === 'string' ? search.error : undefined,
  }),
  beforeLoad: async () => {
    await bootstrapSession();
    if (!useAuthStore.getState().user) {
      throw redirect({ to: '/login' });
    }
  },
  component: SocialAccountsCallbackPage,
});

function SocialAccountsCallbackPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const search = useSearch({ from: socialAccountsCallbackRoute.id });
  const [handle, setHandle] = useState('');
  const [error, setError] = useState<string | null>(
    search.error ? 'Missing authorization code from X / Twitter.' : null
  );

  const completeConnectMutation = useMutation(
    trpc.socialAccounts.completeConnect.mutationOptions({
      onSuccess: () => void navigate({ to: '/social-accounts' }),
      onError: () => setError('Could not complete the X / Twitter connection.'),
    })
  );

  const missingCallbackParams = !search.error && (!search.code || !search.state);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!search.code || !search.state) {
      return;
    }
    setError(null);
    completeConnectMutation.mutate({
      network: 'TWITTER',
      credentials: {
        type: 'oauth2_code',
        code: search.code,
        state: search.state,
        redirectUri: `${window.location.origin}${TWITTER_CALLBACK_PATH}`,
        handle,
      },
    });
  }

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Connecting to X / Twitter…</CardTitle>
          {!error && !missingCallbackParams ? (
            <CardDescription>
              X does not share your handle with this app on the Free tier — confirm it to finish connecting.
            </CardDescription>
          ) : null}
        </CardHeader>
        <CardContent>
          {error || missingCallbackParams ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-destructive">{error ?? 'Missing authorization code from X / Twitter.'}</p>
              <Link
                to="/social-accounts"
                className="text-sm underline"
              >
                Back to connected accounts
              </Link>
            </div>
          ) : (
            <form
              className="flex flex-col gap-4"
              onSubmit={handleSubmit}
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="twitter-handle">X handle</Label>
                <Input
                  id="twitter-handle"
                  value={handle}
                  onChange={(event) => setHandle(event.target.value)}
                  placeholder="janedoe"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={completeConnectMutation.isPending}
              >
                {completeConnectMutation.isPending ? 'Connecting…' : 'Confirm and connect'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
