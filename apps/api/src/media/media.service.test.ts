import { TRPCError } from '@trpc/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NetworkCapabilitiesResolver } from '../networks/network-capabilities.resolver.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { MinioStorageDriver } from '../storage/minio-storage.driver.js';
import { MediaService } from './media.service.js';

function createPrisma() {
  return {
    client: {
      postItem: { findUnique: vi.fn() },
      media: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    },
  } as unknown as PrismaService;
}

function createStorage(): MinioStorageDriver {
  return {
    upload: vi.fn(),
    getUrl: vi.fn().mockResolvedValue('https://minio.test/signed-url'),
    delete: vi.fn(),
  } as unknown as MinioStorageDriver;
}

function createCapabilitiesResolver(maxImages = 4): NetworkCapabilitiesResolver {
  return {
    capabilitiesForPost: vi.fn().mockResolvedValue({
      maxChars: 280,
      maxImages,
      supportsThread: true,
      supportsMentions: false,
    }),
  } as unknown as NetworkCapabilitiesResolver;
}

describe('MediaService', () => {
  let prisma: ReturnType<typeof createPrisma>;
  let storage: MinioStorageDriver;
  let capabilitiesResolver: NetworkCapabilitiesResolver;
  let service: MediaService;

  beforeEach(() => {
    prisma = createPrisma();
    storage = createStorage();
    capabilitiesResolver = createCapabilitiesResolver();
    service = new MediaService(prisma, storage, capabilitiesResolver);
  });

  describe('upload', () => {
    const uploadInput = {
      postItemId: 'item-1',
      fileName: 'photo.png',
      mimeType: 'image/png' as const,
      data: Buffer.from('image-bytes').toString('base64'),
    };

    it('uploads to storage and creates the Media row', async () => {
      vi.mocked(prisma.client.postItem.findUnique).mockResolvedValue({
        id: 'item-1',
        postId: 'post-1',
        post: { userId: 'user-1' },
        media: [],
      } as never);
      vi.mocked(prisma.client.media.create).mockResolvedValue({
        id: 'media-1',
        postItemId: 'item-1',
        storageKey: 'post-1/item-1/generated.png',
        mimeType: 'image/png',
        orderIndex: 0,
      } as never);

      const result = await service.upload('user-1', uploadInput);

      expect(storage.upload).toHaveBeenCalledWith(
        expect.stringMatching(/^post-1\/item-1\/.+\.png$/),
        Buffer.from('image-bytes'),
        'image/png'
      );
      expect(result).toEqual({
        id: 'media-1',
        postItemId: 'item-1',
        url: 'https://minio.test/signed-url',
        mimeType: 'image/png',
        orderIndex: 0,
      });
    });

    it('throws NOT_FOUND when the post item does not belong to the user', async () => {
      vi.mocked(prisma.client.postItem.findUnique).mockResolvedValue({
        id: 'item-1',
        postId: 'post-1',
        post: { userId: 'someone-else' },
        media: [],
      } as never);

      await expect(service.upload('user-1', uploadInput)).rejects.toBeInstanceOf(TRPCError);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the post item does not exist', async () => {
      vi.mocked(prisma.client.postItem.findUnique).mockResolvedValue(null);

      await expect(service.upload('user-1', uploadInput)).rejects.toBeInstanceOf(TRPCError);
    });

    it('rejects when the item already has the maximum number of images for the targeted networks', async () => {
      capabilitiesResolver = createCapabilitiesResolver(1);
      service = new MediaService(prisma, storage, capabilitiesResolver);
      vi.mocked(prisma.client.postItem.findUnique).mockResolvedValue({
        id: 'item-1',
        postId: 'post-1',
        post: { userId: 'user-1' },
        media: [{ id: 'existing-media' }],
      } as never);

      await expect(service.upload('user-1', uploadInput)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('rejects a payload larger than the maximum allowed size', async () => {
      vi.mocked(prisma.client.postItem.findUnique).mockResolvedValue({
        id: 'item-1',
        postId: 'post-1',
        post: { userId: 'user-1' },
        media: [],
      } as never);
      const oversized = { ...uploadInput, data: Buffer.alloc(9 * 1024 * 1024).toString('base64') };

      await expect(service.upload('user-1', oversized)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
      expect(storage.upload).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('deletes the storage object and the Media row', async () => {
      vi.mocked(prisma.client.media.findUnique).mockResolvedValue({
        id: 'media-1',
        storageKey: 'post-1/item-1/photo.png',
        postItem: { post: { userId: 'user-1' } },
      } as never);

      await service.delete('user-1', 'media-1');

      expect(storage.delete).toHaveBeenCalledWith('post-1/item-1/photo.png');
      expect(prisma.client.media.delete).toHaveBeenCalledWith({ where: { id: 'media-1' } });
    });

    it('throws NOT_FOUND when the media does not belong to the user', async () => {
      vi.mocked(prisma.client.media.findUnique).mockResolvedValue({
        id: 'media-1',
        storageKey: 'post-1/item-1/photo.png',
        postItem: { post: { userId: 'someone-else' } },
      } as never);

      await expect(service.delete('user-1', 'media-1')).rejects.toBeInstanceOf(TRPCError);
      expect(storage.delete).not.toHaveBeenCalled();
    });

    it('throws NOT_FOUND when the media does not exist', async () => {
      vi.mocked(prisma.client.media.findUnique).mockResolvedValue(null);

      await expect(service.delete('user-1', 'missing')).rejects.toBeInstanceOf(TRPCError);
    });
  });
});
