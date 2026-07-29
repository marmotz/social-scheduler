import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Context } from '../trpc/context.js';
import { createMediaRouter } from './media.router.js';
import type { MediaService } from './media.service.js';

function createContext(overrides: Partial<Context> = {}): Context {
  return {
    req: {} as Context['req'],
    res: {} as Context['res'],
    user: { id: 'user-1', email: 'jane@example.com' },
    ...overrides,
  };
}

describe('mediaRouter', () => {
  let service: {
    upload: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = { upload: vi.fn(), delete: vi.fn() };
  });

  it('upload forwards the current user id and input', async () => {
    service.upload.mockResolvedValue({
      id: 'media-1',
      postItemId: 'item-1',
      url: 'https://minio.test/signed',
      mimeType: 'image/png',
      orderIndex: 0,
    });
    const router = createMediaRouter(service as unknown as MediaService);
    const caller = router.createCaller(createContext());
    const input = { postItemId: 'item-1', fileName: 'photo.png', mimeType: 'image/png' as const, data: 'YQ==' };

    const result = await caller.upload(input);

    expect(service.upload).toHaveBeenCalledWith('user-1', input);
    expect(result.id).toBe('media-1');
  });

  it('upload rejects when unauthenticated', async () => {
    const router = createMediaRouter(service as unknown as MediaService);
    const caller = router.createCaller(createContext({ user: null }));

    await expect(
      caller.upload({ postItemId: 'item-1', fileName: 'photo.png', mimeType: 'image/png', data: 'YQ==' })
    ).rejects.toThrow();
  });

  it('delete forwards the media id', async () => {
    service.delete.mockResolvedValue(undefined);
    const router = createMediaRouter(service as unknown as MediaService);
    const caller = router.createCaller(createContext());

    const result = await caller.delete({ mediaId: 'media-1' });

    expect(service.delete).toHaveBeenCalledWith('user-1', 'media-1');
    expect(result).toEqual({ success: true });
  });
});
