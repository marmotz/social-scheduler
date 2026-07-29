import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkCapabilitiesResolver } from '../networks/network-capabilities.resolver.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { MinioStorageDriver } from '../storage/minio-storage.driver.js';
import { PostsService } from './posts.service.js';

const CAPABILITIES = { maxChars: 280, maxImages: 4, supportsThread: true, supportsMentions: false };

function createPrisma() {
  const client: Record<string, unknown> = {
    socialAccount: { findMany: vi.fn() },
    post: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() },
    postItem: { deleteMany: vi.fn(), delete: vi.fn(), update: vi.fn(), create: vi.fn() },
    postTarget: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  client.$transaction = vi.fn((callback: (tx: unknown) => unknown) => callback(client));

  return { client } as unknown as PrismaService;
}

function createStorage(): MinioStorageDriver {
  return {
    upload: vi.fn(),
    getUrl: vi.fn().mockResolvedValue('https://minio.test/signed'),
    delete: vi.fn(),
  } as unknown as MinioStorageDriver;
}

function createCapabilitiesResolver(capabilities = CAPABILITIES): NetworkCapabilitiesResolver {
  return {
    capabilitiesForNetworks: vi.fn().mockReturnValue(capabilities),
    capabilitiesForAccountIds: vi.fn().mockResolvedValue(capabilities),
    capabilitiesForPost: vi.fn().mockResolvedValue(capabilities),
  } as unknown as NetworkCapabilitiesResolver;
}

function fakePost(overrides: Record<string, unknown> = {}) {
  return {
    id: 'post-1',
    userId: 'user-1',
    status: 'DRAFT',
    scheduledAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    items: [{ id: 'item-1', orderIndex: 0, text: 'Hello', media: [] }],
    targets: [
      {
        id: 'target-1',
        socialAccountId: 'acc-1',
        socialAccount: { network: 'TWITTER' },
        status: 'PENDING',
        errorMessage: null,
        publishedAt: null,
      },
    ],
    ...overrides,
  };
}

describe('PostsService', () => {
  let prisma: ReturnType<typeof createPrisma>;
  let storage: MinioStorageDriver;
  let capabilitiesResolver: NetworkCapabilitiesResolver;
  let service: PostsService;

  beforeEach(() => {
    prisma = createPrisma();
    storage = createStorage();
    capabilitiesResolver = createCapabilitiesResolver();
    service = new PostsService(prisma, storage, capabilitiesResolver);
  });

  describe('createDraft', () => {
    const input = { items: [{ orderIndex: 0, text: 'Hello' }], socialAccountIds: ['acc-1'] };

    it('creates the post with its items and targets', async () => {
      vi.mocked(prisma.client.socialAccount.findMany).mockResolvedValue([{ id: 'acc-1', network: 'TWITTER' }] as never);
      vi.mocked(prisma.client.post.create).mockResolvedValue(fakePost() as never);

      const result = await service.createDraft('user-1', input);

      expect(prisma.client.post.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          status: 'DRAFT',
          items: { create: [{ orderIndex: 0, text: 'Hello' }] },
          targets: { create: [{ socialAccountId: 'acc-1' }] },
        },
        include: expect.any(Object),
      });
      expect(result.id).toBe('post-1');
      expect(result.items).toHaveLength(1);
    });

    it('rejects when one of the target accounts does not belong to the user', async () => {
      vi.mocked(prisma.client.socialAccount.findMany).mockResolvedValue([] as never);

      await expect(service.createDraft('user-1', input)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(prisma.client.post.create).not.toHaveBeenCalled();
    });

    it('rejects an item whose text exceeds the most restrictive character limit', async () => {
      vi.mocked(prisma.client.socialAccount.findMany).mockResolvedValue([{ id: 'acc-1', network: 'TWITTER' }] as never);
      capabilitiesResolver = createCapabilitiesResolver({ ...CAPABILITIES, maxChars: 3 });
      service = new PostsService(prisma, storage, capabilitiesResolver);

      await expect(service.createDraft('user-1', input)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(prisma.client.post.create).not.toHaveBeenCalled();
    });

    it('rejects a multi-item thread when a targeted network does not support threads', async () => {
      vi.mocked(prisma.client.socialAccount.findMany).mockResolvedValue([{ id: 'acc-1', network: 'TWITTER' }] as never);
      capabilitiesResolver = createCapabilitiesResolver({ ...CAPABILITIES, supportsThread: false });
      service = new PostsService(prisma, storage, capabilitiesResolver);
      const threadInput = {
        items: [
          { orderIndex: 0, text: 'Hello' },
          { orderIndex: 1, text: 'World' },
        ],
        socialAccountIds: ['acc-1'],
      };

      await expect(service.createDraft('user-1', threadInput)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    });
  });

  describe('updatePost', () => {
    const input = {
      postId: 'post-1',
      items: [{ id: 'item-1', orderIndex: 0, text: 'Updated' }],
      socialAccountIds: ['acc-1'],
    };

    it('updates existing items in place, preserving their media', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(
        fakePost({
          items: [{ id: 'item-1', orderIndex: 0, text: 'Hello', media: [{ id: 'media-1', storageKey: 'key-1' }] }],
        }) as never
      );
      vi.mocked(prisma.client.socialAccount.findMany).mockResolvedValue([{ id: 'acc-1', network: 'TWITTER' }] as never);
      vi.mocked(prisma.client.post.update).mockResolvedValue(
        fakePost({ items: [{ ...fakePost().items[0], text: 'Updated' }] }) as never
      );

      const result = await service.updatePost('user-1', input);

      expect(prisma.client.postItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { orderIndex: 0, text: 'Updated' },
      });
      expect(prisma.client.postItem.delete).not.toHaveBeenCalled();
      expect(prisma.client.postItem.create).not.toHaveBeenCalled();
      expect(storage.delete).not.toHaveBeenCalled();
      expect(result.items[0]?.text).toBe('Updated');
    });

    it('creates items that have no existing id', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(fakePost() as never);
      vi.mocked(prisma.client.socialAccount.findMany).mockResolvedValue([{ id: 'acc-1', network: 'TWITTER' }] as never);
      vi.mocked(prisma.client.post.update).mockResolvedValue(fakePost() as never);

      await service.updatePost('user-1', {
        postId: 'post-1',
        items: [
          { id: 'item-1', orderIndex: 0, text: 'Hello' },
          { orderIndex: 1, text: 'New item' },
        ],
        socialAccountIds: ['acc-1'],
      });

      expect(prisma.client.postItem.create).toHaveBeenCalledWith({
        data: { postId: 'post-1', orderIndex: 1, text: 'New item' },
      });
    });

    it('deletes items dropped from the input and cleans up their storage objects', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(
        fakePost({
          items: [
            { id: 'item-1', orderIndex: 0, text: 'Hello', media: [] },
            { id: 'item-2', orderIndex: 1, text: 'Dropped', media: [{ id: 'media-2', storageKey: 'key-2' }] },
          ],
        }) as never
      );
      vi.mocked(prisma.client.socialAccount.findMany).mockResolvedValue([{ id: 'acc-1', network: 'TWITTER' }] as never);
      vi.mocked(prisma.client.post.update).mockResolvedValue(fakePost() as never);

      await service.updatePost('user-1', input);

      expect(prisma.client.postItem.delete).toHaveBeenCalledWith({ where: { id: 'item-2' } });
      expect(storage.delete).toHaveBeenCalledWith('key-2');
    });

    it('replaces the targets', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(fakePost() as never);
      vi.mocked(prisma.client.socialAccount.findMany).mockResolvedValue([{ id: 'acc-2', network: 'BLUESKY' }] as never);
      vi.mocked(prisma.client.post.update).mockResolvedValue(fakePost() as never);

      await service.updatePost('user-1', { ...input, socialAccountIds: ['acc-2'] });

      expect(prisma.client.postTarget.deleteMany).toHaveBeenCalledWith({ where: { postId: 'post-1' } });
      expect(prisma.client.postTarget.createMany).toHaveBeenCalledWith({
        data: [{ postId: 'post-1', socialAccountId: 'acc-2' }],
      });
    });

    it('rejects editing a post that is already publishing', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(fakePost({ status: 'PUBLISHING' }) as never);

      await expect(service.updatePost('user-1', input)).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(prisma.client.postTarget.deleteMany).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the post does not belong to the user', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(fakePost({ userId: 'someone-else' }) as never);

      await expect(service.updatePost('user-1', input)).rejects.toBeInstanceOf(TRPCError);
    });
  });

  describe('schedulePost', () => {
    it('sets status SCHEDULED with the given date', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(fakePost() as never);
      vi.mocked(prisma.client.post.update).mockResolvedValue(
        fakePost({ status: 'SCHEDULED', scheduledAt: new Date('2026-02-01T00:00:00Z') }) as never
      );

      const result = await service.schedulePost('user-1', {
        postId: 'post-1',
        scheduledAt: '2026-02-01T00:00:00.000Z',
      });

      expect(prisma.client.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'SCHEDULED', scheduledAt: new Date('2026-02-01T00:00:00.000Z') },
        include: expect.any(Object),
      });
      expect(result.status).toBe('SCHEDULED');
    });

    it('rejects scheduling a post that already published', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(fakePost({ status: 'PUBLISHED' }) as never);

      await expect(
        service.schedulePost('user-1', { postId: 'post-1', scheduledAt: '2026-02-01T00:00:00.000Z' })
      ).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('publishNow', () => {
    it('sets status SCHEDULED with scheduledAt now', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(fakePost() as never);
      vi.mocked(prisma.client.post.update).mockResolvedValue(fakePost({ status: 'SCHEDULED' }) as never);

      await service.publishNow('user-1', 'post-1');

      expect(prisma.client.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'SCHEDULED', scheduledAt: expect.any(Date) },
        include: expect.any(Object),
      });
    });
  });

  describe('cancelScheduled', () => {
    it('reverts a scheduled post back to draft', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(fakePost({ status: 'SCHEDULED' }) as never);
      vi.mocked(prisma.client.post.update).mockResolvedValue(fakePost({ status: 'DRAFT' }) as never);

      const result = await service.cancelScheduled('user-1', 'post-1');

      expect(prisma.client.post.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: 'DRAFT', scheduledAt: null },
        include: expect.any(Object),
      });
      expect(result.status).toBe('DRAFT');
    });

    it('rejects cancelling a post that is not scheduled', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(fakePost({ status: 'DRAFT' }) as never);

      await expect(service.cancelScheduled('user-1', 'post-1')).rejects.toMatchObject({ code: 'CONFLICT' });
    });
  });

  describe('deletePost', () => {
    it('deletes the post and its media storage objects', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(
        fakePost({
          items: [{ id: 'item-1', orderIndex: 0, text: 'Hello', media: [{ id: 'media-1', storageKey: 'key-1' }] }],
        }) as never
      );

      await service.deletePost('user-1', 'post-1');

      expect(prisma.client.post.delete).toHaveBeenCalledWith({ where: { id: 'post-1' } });
      expect(storage.delete).toHaveBeenCalledWith('key-1');
    });

    it('rejects deleting a post that is currently publishing', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(fakePost({ status: 'PUBLISHING' }) as never);

      await expect(service.deletePost('user-1', 'post-1')).rejects.toMatchObject({ code: 'CONFLICT' });
      expect(prisma.client.post.delete).not.toHaveBeenCalled();
    });
  });

  describe('listPosts', () => {
    it('lists the user posts optionally filtered by status', async () => {
      vi.mocked(prisma.client.post.findMany).mockResolvedValue([fakePost()] as never);

      const result = await service.listPosts('user-1', { status: 'DRAFT' });

      expect(prisma.client.post.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', status: 'DRAFT' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0]?.itemCount).toBe(1);
    });
  });

  describe('getPost', () => {
    it('returns the post detail with resolved media urls', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(
        fakePost({
          items: [
            {
              id: 'item-1',
              orderIndex: 0,
              text: 'Hello',
              media: [{ id: 'media-1', postItemId: 'item-1', storageKey: 'key', mimeType: 'image/png', orderIndex: 0 }],
            },
          ],
        }) as never
      );

      const result = await service.getPost('user-1', 'post-1');

      expect(result.items[0]?.media[0]?.url).toBe('https://minio.test/signed');
    });

    it('throws NOT_FOUND when the post does not belong to the user', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(fakePost({ userId: 'someone-else' }) as never);

      await expect(service.getPost('user-1', 'post-1')).rejects.toBeInstanceOf(TRPCError);
    });

    it('throws NOT_FOUND when the post does not exist', async () => {
      vi.mocked(prisma.client.post.findUnique).mockResolvedValue(null);

      await expect(service.getPost('user-1', 'missing')).rejects.toBeInstanceOf(TRPCError);
    });
  });
});
