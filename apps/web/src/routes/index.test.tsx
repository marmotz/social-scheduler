import { RouterProvider, createRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { indexRoute } from './index.js';
import { rootRoute } from './root.js';

describe('HomePage', () => {
  it('renders the app title', async () => {
    const routeTree = rootRoute.addChildren([indexRoute]);
    const router = createRouter({ routeTree });

    render(<RouterProvider router={router} />);

    expect(await screen.findByRole('heading', { name: 'Sonskay' })).toBeInTheDocument();
  });
});
