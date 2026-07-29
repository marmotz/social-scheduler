import { createRouter } from '@tanstack/react-router';
import { dashboardRoute } from './routes/dashboard.js';
import { indexRoute } from './routes/index.js';
import { loginRoute } from './routes/login.js';
import { postComposeRoute } from './routes/posts.compose.js';
import { registerRoute } from './routes/register.js';
import { rootRoute } from './routes/root.js';
import { socialAccountsCallbackRoute } from './routes/social-accounts.callback.js';
import { socialAccountsRoute } from './routes/social-accounts.js';

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  registerRoute,
  dashboardRoute,
  socialAccountsRoute,
  socialAccountsCallbackRoute,
  postComposeRoute,
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
