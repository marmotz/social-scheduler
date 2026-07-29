import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '../trpc/context.js';
import { createPostsRouter } from './posts.router.js';
import type { PostsService } from './posts.service.js';

function createContext(overrides: Partial<Context> = {}): Context {
  return {
    req: {} as Context['req'],
    res: {} as Context['res'],
    user: { id: 'user-1', email: 'jane@example.com' },
    ...overrides,
  };
}

describe('postsRouter', () => {
  let service: {
    createDraft: ReturnType<typeof vi.fn>;
    updatePost: ReturnType<typeof vi.fn>;
    schedulePost: ReturnType<typeof vi.fn>;
    publishNow: ReturnType<typeof vi.fn>;
    cancelScheduled: ReturnType<typeof vi.fn>;
    deletePost: ReturnType<typeof vi.fn>;
    listPosts: ReturnType<typeof vi.fn>;
    getPost: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      createDraft: vi.fn(),
      updatePost: vi.fn(),
      schedulePost: vi.fn(),
      publishNow: vi.fn(),
      cancelScheduled: vi.fn(),
      deletePost: vi.fn(),
      listPosts: vi.fn(),
      getPost: vi.fn(),
    };
  });

  it('createDraft forwards the current user id and input', async () => {
    service.createDraft.mockResolvedValue({ id: 'post-1' });
    const router = createPostsRouter(service as unknown as PostsService);
    const caller = router.createCaller(createContext());
    const input = { items: [{ orderIndex: 0, text: 'Hello' }], socialAccountIds: ['acc-1'] };

    await caller.createDraft(input);

    expect(service.createDraft).toHaveBeenCalledWith('user-1', input);
  });

  it('createDraft rejects when unauthenticated', async () => {
    const router = createPostsRouter(service as unknown as PostsService);
    const caller = router.createCaller(createContext({ user: null }));

    await expect(
      caller.createDraft({ items: [{ orderIndex: 0, text: 'Hello' }], socialAccountIds: ['acc-1'] })
    ).rejects.toThrow();
  });

  it('updatePost forwards the current user id and input', async () => {
    service.updatePost.mockResolvedValue({ id: 'post-1' });
    const router = createPostsRouter(service as unknown as PostsService);
    const caller = router.createCaller(createContext());
    const input = { postId: 'post-1', items: [{ orderIndex: 0, text: 'Hello' }], socialAccountIds: ['acc-1'] };

    await caller.updatePost(input);

    expect(service.updatePost).toHaveBeenCalledWith('user-1', input);
  });

  it('schedulePost forwards the current user id and input', async () => {
    service.schedulePost.mockResolvedValue({ id: 'post-1', status: 'SCHEDULED' });
    const router = createPostsRouter(service as unknown as PostsService);
    const caller = router.createCaller(createContext());
    const input = { postId: 'post-1', scheduledAt: '2026-02-01T00:00:00.000Z' };

    await caller.schedulePost(input);

    expect(service.schedulePost).toHaveBeenCalledWith('user-1', input);
  });

  it('publishNow forwards the current user id and post id', async () => {
    service.publishNow.mockResolvedValue({ id: 'post-1', status: 'SCHEDULED' });
    const router = createPostsRouter(service as unknown as PostsService);
    const caller = router.createCaller(createContext());

    await caller.publishNow({ postId: 'post-1' });

    expect(service.publishNow).toHaveBeenCalledWith('user-1', 'post-1');
  });

  it('cancelScheduled forwards the current user id and post id', async () => {
    service.cancelScheduled.mockResolvedValue({ id: 'post-1', status: 'DRAFT' });
    const router = createPostsRouter(service as unknown as PostsService);
    const caller = router.createCaller(createContext());

    await caller.cancelScheduled({ postId: 'post-1' });

    expect(service.cancelScheduled).toHaveBeenCalledWith('user-1', 'post-1');
  });

  it('deletePost forwards the current user id and post id', async () => {
    service.deletePost.mockResolvedValue(undefined);
    const router = createPostsRouter(service as unknown as PostsService);
    const caller = router.createCaller(createContext());

    const result = await caller.deletePost({ postId: 'post-1' });

    expect(service.deletePost).toHaveBeenCalledWith('user-1', 'post-1');
    expect(result).toEqual({ success: true });
  });

  it('listPosts forwards the current user id and filter', async () => {
    service.listPosts.mockResolvedValue([]);
    const router = createPostsRouter(service as unknown as PostsService);
    const caller = router.createCaller(createContext());

    await caller.listPosts({ status: 'DRAFT' });

    expect(service.listPosts).toHaveBeenCalledWith('user-1', { status: 'DRAFT' });
  });

  it('getPost forwards the current user id and post id', async () => {
    service.getPost.mockResolvedValue({ id: 'post-1' });
    const router = createPostsRouter(service as unknown as PostsService);
    const caller = router.createCaller(createContext());

    await caller.getPost({ postId: 'post-1' });

    expect(service.getPost).toHaveBeenCalledWith('user-1', 'post-1');
  });
});
