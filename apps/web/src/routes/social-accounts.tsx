import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { bootstrapSession } from '@/lib/session.js';
import { useTRPC } from '@/lib/trpc.js';
import { useAuthStore } from '@/stores/auth-store.js';
import type { Network, SocialAccountStatus } from '@sonskay/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createRoute, redirect } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { rootRoute } from './root.js';

export const TWITTER_CALLBACK_PATH = '/social-accounts/callback';

export const socialAccountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/social-accounts',
  beforeLoad: async () => {
    await bootstrapSession();
    if (!useAuthStore.getState().user) {
      throw redirect({ to: '/login' });
    }
  },
  component: SocialAccountsPage,
});

const STATUS_LABELS: Record<SocialAccountStatus, string> = {
  CONNECTED: 'Connected',
  EXPIRED: 'Expired',
  REVOKED: 'Revoked',
};

const STATUS_CLASSES: Record<SocialAccountStatus, string> = {
  CONNECTED: 'text-green-600 dark:text-green-400',
  EXPIRED: 'text-amber-600 dark:text-amber-400',
  REVOKED: 'text-red-600 dark:text-red-400',
};

const NETWORK_LABELS: Record<Network, string> = {
  TWITTER: 'X / Twitter',
  BLUESKY: 'Bluesky',
};

function SocialAccountsPage() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [blueskyIdentifier, setBlueskyIdentifier] = useState('');
  const [blueskyAppPassword, setBlueskyAppPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const accountsQuery = useQuery(trpc.socialAccounts.listAccounts.queryOptions());

  const invalidateAccounts = () =>
    queryClient.invalidateQueries({ queryKey: trpc.socialAccounts.listAccounts.queryKey() });

  const startConnectMutation = useMutation(
    trpc.socialAccounts.startConnect.mutationOptions({
      onSuccess: (result) => {
        if (result.authorizationUrl) {
          window.location.href = result.authorizationUrl;
        }
      },
      onError: () => setError('Could not start the connection flow.'),
    })
  );

  const completeConnectMutation = useMutation(
    trpc.socialAccounts.completeConnect.mutationOptions({
      onSuccess: () => {
        setBlueskyIdentifier('');
        setBlueskyAppPassword('');
        setError(null);
        void invalidateAccounts();
      },
      onError: () => setError('Could not connect this Bluesky account. Check your handle and app password.'),
    })
  );

  const disconnectMutation = useMutation(
    trpc.socialAccounts.disconnect.mutationOptions({
      onSuccess: () => void invalidateAccounts(),
    })
  );

  function handleConnectTwitter() {
    setError(null);
    startConnectMutation.mutate({
      network: 'TWITTER',
      redirectUri: `${window.location.origin}${TWITTER_CALLBACK_PATH}`,
    });
  }

  function handleConnectBluesky(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    completeConnectMutation.mutate({
      network: 'BLUESKY',
      credentials: { type: 'app_password', identifier: blueskyIdentifier, appPassword: blueskyAppPassword },
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected accounts</CardTitle>
          <CardDescription>Manage the social network accounts linked to Sonskay.</CardDescription>
        </CardHeader>
        <CardContent>
          {accountsQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
          {accountsQuery.data && accountsQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No account connected yet.</p>
          ) : null}
          {accountsQuery.data && accountsQuery.data.length > 0 ? (
            <ul className="flex flex-col gap-3">
              {accountsQuery.data.map((account) => (
                <li
                  key={account.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-border p-3"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{NETWORK_LABELS[account.network]}</span>
                    <span className="text-sm text-muted-foreground">{account.handle}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${STATUS_CLASSES[account.status]}`}>{STATUS_LABELS[account.status]}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disconnectMutation.isPending}
                      onClick={() => disconnectMutation.mutate({ accountId: account.id })}
                    >
                      Disconnect
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </CardContent>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle>Connect X / Twitter</CardTitle>
          <CardDescription>You will be redirected to X to authorize Sonskay.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleConnectTwitter}
            disabled={startConnectMutation.isPending}
          >
            {startConnectMutation.isPending ? 'Redirecting…' : 'Connect X / Twitter'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Connect Bluesky</CardTitle>
          <CardDescription>Use an app password, not your main account password.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleConnectBluesky}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="bluesky-identifier">Handle or email</Label>
              <Input
                id="bluesky-identifier"
                value={blueskyIdentifier}
                onChange={(event) => setBlueskyIdentifier(event.target.value)}
                placeholder="jane.bsky.social"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="bluesky-app-password">App password</Label>
              <Input
                id="bluesky-app-password"
                type="password"
                value={blueskyAppPassword}
                onChange={(event) => setBlueskyAppPassword(event.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              disabled={completeConnectMutation.isPending}
            >
              {completeConnectMutation.isPending ? 'Connecting…' : 'Connect Bluesky'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">No app password yet?</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one on{' '}
            <a
              href="https://bsky.app/settings/app-passwords"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              bsky.app/settings/app-passwords
            </a>{' '}
            (log in with the account you want to connect first).
          </p>
          <p className="mt-1 text-sm font-bold text-muted-foreground">Never use your main Bluesky password here.</p>
        </CardContent>
      </Card>
    </div>
  );
}
