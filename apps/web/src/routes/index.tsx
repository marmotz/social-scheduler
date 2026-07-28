import { createRoute } from '@tanstack/react-router';
import { rootRoute } from './root.js';

export const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: HomePage,
});

function HomePage() {
  return <h1>Sonskay</h1>;
}
