import { Button } from '@/components/ui/button.js';
import { trpcClient } from '@/lib/trpc.js';
import { useAuthStore } from '@/stores/auth-store.js';
import { Link, Outlet, createRootRoute, useNavigate } from '@tanstack/react-router';

export const rootRoute = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);

  async function handleLogout() {
    await trpcClient.auth.logout.mutate();
    clearSession();
    await navigate({ to: '/login' });
  }

  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <Link
          to="/"
          className="text-lg font-semibold"
        >
          Sonskay
        </Link>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/dashboard"
                className="text-sm"
              >
                Dashboard
              </Link>
              <Link
                to="/social-accounts"
                className="text-sm"
              >
                Social accounts
              </Link>
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
              >
                Log out
              </Button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-sm"
              >
                Log in
              </Link>
              <Link
                to="/register"
                className="text-sm"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
