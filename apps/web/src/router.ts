import { createRouter } from '@tanstack/react-router';
import { dashboardRoute } from './routes/dashboard.js';
import { indexRoute } from './routes/index.js';
import { loginRoute } from './routes/login.js';
import { registerRoute } from './routes/register.js';
import { rootRoute } from './routes/root.js';

const routeTree = rootRoute.addChildren([indexRoute, loginRoute, registerRoute, dashboardRoute]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
