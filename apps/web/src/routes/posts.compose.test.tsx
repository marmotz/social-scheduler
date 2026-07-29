import { mockTrpcFetch, trpcSuccess } from '@/lib/test-trpc-fetch.js';
import { useAuthStore } from '@/stores/auth-store.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createMemoryHistory, createRouter } from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

async function renderComposerAt(path: string) {
  const { loginRoute } = await import('./login.js');
  const { postComposeRoute } = await import('./posts.compose.js');
  const { rootRoute } = await import('./root.js');
  const { trpcClient, TRPCProvider } = await import('@/lib/trpc.js');

  const routeTree = rootRoute.addChildren([loginRoute, postComposeRoute]);
  const history = createMemoryHistory({ initialEntries: [path] });
  const router = createRouter({ routeTree, history });
  const queryClient = new QueryClient();

  return render(
    <QueryClientProvider client={queryClient}>
      <TRPCProvider
        trpcClient={trpcClient}
        queryClient={queryClient}
      >
        <RouterProvider router={router} />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

const session = trpcSuccess({ accessToken: 'token', user: { id: 'user-1', email: 'jane@example.com' } });

const accounts = [
  { id: 'acc-1', network: 'TWITTER', handle: 'janedoe', status: 'CONNECTED', createdAt: '2026-01-01T00:00:00.000Z' },
];

const noDrafts = trpcSuccess([]);

describe('post composer page', () => {
  beforeEach(() => {
    vi.resetModules();
    useAuthStore.setState({ user: null, accessToken: null, isHydrated: false });
  });

  it('lists the connected accounts as target checkboxes', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess(accounts),
      'posts.listPosts': () => noDrafts,
    });

    await renderComposerAt('/posts/compose');

    expect(await screen.findByText('X / Twitter — janedoe')).toBeInTheDocument();
  });

  it('shows the character limit for the selected network', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess(accounts),
      'posts.listPosts': () => noDrafts,
    });

    await renderComposerAt('/posts/compose');
    fireEvent.click(await screen.findByRole('checkbox'));

    expect(await screen.findByText('0 / 280 characters')).toBeInTheDocument();
  });

  it('requires at least one target network before saving', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess(accounts),
      'posts.listPosts': () => noDrafts,
    });

    await renderComposerAt('/posts/compose');
    fireEvent.click(await screen.findByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Select at least one target network.')).toBeInTheDocument();
  });

  it('saves a draft with the entered text and selected account', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess(accounts),
      'posts.listPosts': () => noDrafts,
      'posts.createDraft': () =>
        trpcSuccess({
          id: 'post-1',
          status: 'DRAFT',
          scheduledAt: null,
          itemCount: 1,
          targets: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          items: [{ id: 'item-1', orderIndex: 0, text: 'Hello world', media: [] }],
        }),
    });

    await renderComposerAt('/posts/compose');
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.change(screen.getByPlaceholderText("What's happening?"), { target: { value: 'Hello world' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Draft saved.')).toBeInTheDocument();
  });

  it('shows an error when the text exceeds the character limit for the selected network', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess(accounts),
      'posts.listPosts': () => noDrafts,
    });

    await renderComposerAt('/posts/compose');
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.change(screen.getByPlaceholderText("What's happening?"), { target: { value: 'x'.repeat(281) } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByText('Some items exceed the 280 character limit.')).toBeInTheDocument();
  });

  it('uploads an image once the draft has been saved manually', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess(accounts),
      'posts.listPosts': () => noDrafts,
      'posts.createDraft': () =>
        trpcSuccess({
          id: 'post-1',
          status: 'DRAFT',
          scheduledAt: null,
          itemCount: 1,
          targets: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          items: [{ id: 'item-1', orderIndex: 0, text: 'Hello', media: [] }],
        }),
      'media.upload': () =>
        trpcSuccess({
          id: 'media-1',
          postItemId: 'item-1',
          url: 'https://minio.test/signed',
          mimeType: 'image/png',
          orderIndex: 0,
        }),
    });

    await renderComposerAt('/posts/compose');
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.change(screen.getByPlaceholderText("What's happening?"), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Draft saved.');

    const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByRole('img')).toBeInTheDocument();
  });

  it('auto-saves the draft when adding an image before it was ever saved', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess(accounts),
      'posts.listPosts': () => noDrafts,
      'posts.createDraft': () =>
        trpcSuccess({
          id: 'post-1',
          status: 'DRAFT',
          scheduledAt: null,
          itemCount: 1,
          targets: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          items: [{ id: 'item-1', orderIndex: 0, text: 'Hello', media: [] }],
        }),
      'media.upload': () =>
        trpcSuccess({
          id: 'media-1',
          postItemId: 'item-1',
          url: 'https://minio.test/signed',
          mimeType: 'image/png',
          orderIndex: 0,
        }),
    });

    await renderComposerAt('/posts/compose');
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.change(screen.getByPlaceholderText("What's happening?"), { target: { value: 'Hello' } });

    const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByRole('img')).toBeInTheDocument();
  });

  it('removes an attached image', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess(accounts),
      'posts.listPosts': () => noDrafts,
      'posts.createDraft': () =>
        trpcSuccess({
          id: 'post-1',
          status: 'DRAFT',
          scheduledAt: null,
          itemCount: 1,
          targets: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          items: [{ id: 'item-1', orderIndex: 0, text: 'Hello', media: [] }],
        }),
      'media.upload': () =>
        trpcSuccess({
          id: 'media-1',
          postItemId: 'item-1',
          url: 'https://minio.test/signed',
          mimeType: 'image/png',
          orderIndex: 0,
        }),
      'media.delete': () => trpcSuccess({ success: true }),
    });

    await renderComposerAt('/posts/compose');
    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.change(screen.getByPlaceholderText("What's happening?"), { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await screen.findByText('Draft saved.');

    const file = new File(['image-bytes'], 'photo.png', { type: 'image/png' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });
    await screen.findByRole('img');

    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }));

    await vi.waitFor(() => expect(screen.queryByRole('img')).not.toBeInTheDocument());
  });

  it('sends the existing item id when re-saving a loaded draft, so its media is preserved', async () => {
    const fetchMock = mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess(accounts),
      'posts.listPosts': () =>
        trpcSuccess([
          {
            id: 'post-1',
            status: 'DRAFT',
            scheduledAt: null,
            itemCount: 1,
            targets: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ]),
      'posts.getPost': () =>
        trpcSuccess({
          id: 'post-1',
          status: 'DRAFT',
          scheduledAt: null,
          itemCount: 1,
          targets: [
            {
              id: 'target-1',
              socialAccountId: 'acc-1',
              network: 'TWITTER',
              status: 'PENDING',
              errorMessage: null,
              publishedAt: null,
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          items: [
            {
              id: 'item-1',
              orderIndex: 0,
              text: 'Existing draft text',
              media: [
                {
                  id: 'media-1',
                  postItemId: 'item-1',
                  url: 'https://minio.test/signed',
                  mimeType: 'image/png',
                  orderIndex: 0,
                },
              ],
            },
          ],
        }),
      'posts.updatePost': () =>
        trpcSuccess({
          id: 'post-1',
          status: 'DRAFT',
          scheduledAt: null,
          itemCount: 1,
          targets: [],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-03T00:00:00.000Z',
          items: [{ id: 'item-1', orderIndex: 0, text: 'Edited text', media: [] }],
        }),
    });

    await renderComposerAt('/posts/compose');
    fireEvent.click(await screen.findByText(/1 item — saved/));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await screen.findByDisplayValue('Existing draft text');

    fireEvent.change(screen.getByPlaceholderText("What's happening?"), { target: { value: 'Edited text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    await screen.findByText('Draft saved.');

    const updateCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('posts.updatePost'));
    const body = JSON.parse(String(updateCall?.[1]?.body)) as Record<string, unknown>;
    const sentInput = Object.values(body)[0];

    expect(sentInput).toMatchObject({
      postId: 'post-1',
      items: [{ id: 'item-1', orderIndex: 0, text: 'Edited text' }],
    });
  });

  it('lists saved drafts and loads one back into the editor', async () => {
    mockTrpcFetch({
      'auth.refresh': () => session,
      'socialAccounts.listAccounts': () => trpcSuccess(accounts),
      'posts.listPosts': () =>
        trpcSuccess([
          {
            id: 'post-1',
            status: 'DRAFT',
            scheduledAt: null,
            itemCount: 1,
            targets: [],
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
          },
        ]),
      'posts.getPost': () =>
        trpcSuccess({
          id: 'post-1',
          status: 'DRAFT',
          scheduledAt: null,
          itemCount: 1,
          targets: [
            {
              id: 'target-1',
              socialAccountId: 'acc-1',
              network: 'TWITTER',
              status: 'PENDING',
              errorMessage: null,
              publishedAt: null,
            },
          ],
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
          items: [{ id: 'item-1', orderIndex: 0, text: 'Existing draft text', media: [] }],
        }),
    });

    await renderComposerAt('/posts/compose');
    expect(await screen.findByText(/1 item — saved/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(await screen.findByDisplayValue('Existing draft text')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeChecked();
  });
});
