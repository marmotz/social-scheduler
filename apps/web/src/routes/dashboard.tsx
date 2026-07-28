import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.js';
import { bootstrapSession } from '@/lib/session.js';
import { useAuthStore } from '@/stores/auth-store.js';
import { createRoute, redirect } from '@tanstack/react-router';
import { rootRoute } from './root.js';

export const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: async () => {
    await bootstrapSession();
    if (!useAuthStore.getState().user) {
      throw redirect({ to: '/login' });
    }
  },
  component: DashboardPage,
});

function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Signed in as {user?.email}.</p>
      </CardContent>
    </Card>
  );
}
