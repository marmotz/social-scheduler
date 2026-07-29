import { Injectable } from '@nestjs/common';
import type { MediaSummary, UploadMediaInput } from '@sonskay/shared';
import { MAX_MEDIA_BYTES } from '@sonskay/shared';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'node:crypto';
import { NetworkCapabilitiesResolver } from '../networks/network-capabilities.resolver.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MinioStorageDriver } from '../storage/minio-storage.driver.js';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioStorageDriver,
    private readonly capabilitiesResolver: NetworkCapabilitiesResolver
  ) {}

  async upload(userId: string, input: UploadMediaInput): Promise<MediaSummary> {
    const postItem = await this.prisma.client.postItem.findUnique({
      where: { id: input.postItemId },
      include: { post: true, media: true },
    });
    if (!postItem || postItem.post.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Post item not found' });
    }

    const data = Buffer.from(input.data, 'base64');
    if (data.length > MAX_MEDIA_BYTES) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Image exceeds the ${MAX_MEDIA_BYTES} bytes limit` });
    }

    const capabilities = await this.capabilitiesResolver.capabilitiesForPost(postItem.postId);
    if (postItem.media.length >= capabilities.maxImages) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `This item already has the maximum of ${capabilities.maxImages} images for the selected networks`,
      });
    }

    const extension = MIME_EXTENSIONS[input.mimeType] ?? 'bin';
    const storageKey = `${postItem.postId}/${postItem.id}/${randomUUID()}.${extension}`;
    await this.storage.upload(storageKey, data, input.mimeType);

    const media = await this.prisma.client.media.create({
      data: {
        postItemId: postItem.id,
        storageKey,
        mimeType: input.mimeType,
        orderIndex: postItem.media.length,
      },
    });

    return {
      id: media.id,
      postItemId: media.postItemId,
      url: await this.storage.getUrl(media.storageKey),
      mimeType: media.mimeType,
      orderIndex: media.orderIndex,
    };
  }

  async delete(userId: string, mediaId: string): Promise<void> {
    const media = await this.prisma.client.media.findUnique({
      where: { id: mediaId },
      include: { postItem: { include: { post: true } } },
    });
    if (!media || media.postItem.post.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Media not found' });
    }

    await this.storage.delete(media.storageKey);
    await this.prisma.client.media.delete({ where: { id: mediaId } });
  }
}
