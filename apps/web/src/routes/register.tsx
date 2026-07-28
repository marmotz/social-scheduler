import { Button } from '@/components/ui/button.js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.js';
import { Input } from '@/components/ui/input.js';
import { Label } from '@/components/ui/label.js';
import { useTRPC } from '@/lib/trpc.js';
import { useAuthStore } from '@/stores/auth-store.js';
import { registerSchema } from '@sonskay/shared';
import { useMutation } from '@tanstack/react-query';
import { Link, createRoute, useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { rootRoute } from './root.js';

export const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/register',
  component: RegisterPage,
});

function RegisterPage() {
  const trpc = useTRPC();
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const registerMutation = useMutation(
    trpc.auth.register.mutationOptions({
      onSuccess: (session) => {
        setSession(session);
        void navigate({ to: '/dashboard' });
      },
      onError: (err) => {
        setError(
          err instanceof Error && err.message.includes('already in use')
            ? 'This email is already registered.'
            : 'Could not create your account.'
        );
      },
    })
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsed = registerSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError('Password must be at least 8 characters, email must be valid.');
      return;
    }

    registerMutation.mutate(parsed.data);
  }

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>Start scheduling your posts with Sonskay.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button
              type="submit"
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? 'Creating account…' : 'Register'}
            </Button>
          </form>
          <p className="mt-4 text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="underline"
            >
              Log in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
