import { Injectable } from '@nestjs/common';
import type {
  CreateDraftInput,
  ListPostsInput,
  NetworkCapabilities,
  PostDetail,
  PostItemDetail,
  PostSummary,
  PostTargetSummary,
  SchedulePostInput,
  UpdatePostInput,
} from '@sonskay/shared';
import { TRPCError } from '@trpc/server';
import type { Prisma } from '../../generated/prisma/client.js';
import { NetworkCapabilitiesResolver } from '../networks/network-capabilities.resolver.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MinioStorageDriver } from '../storage/minio-storage.driver.js';

const POST_INCLUDE = {
  items: { include: { media: true }, orderBy: { orderIndex: 'asc' } },
  targets: { include: { socialAccount: true } },
} satisfies Prisma.PostInclude;

type PostWithRelations = Prisma.PostGetPayload<{ include: typeof POST_INCLUDE }>;

@Injectable()
export class PostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: MinioStorageDriver,
    private readonly capabilitiesResolver: NetworkCapabilitiesResolver
  ) {}

  async createDraft(userId: string, input: CreateDraftInput): Promise<PostDetail> {
    const accounts = await this.getOwnedAccountsOrThrow(userId, input.socialAccountIds);
    const capabilities = this.capabilitiesResolver.capabilitiesForNetworks(accounts.map((account) => account.network));
    this.validateItems(input.items, capabilities);

    const post = await this.prisma.client.post.create({
      data: {
        userId,
        status: 'DRAFT',
        items: { create: input.items.map((item) => ({ orderIndex: item.orderIndex, text: item.text })) },
        targets: { create: accounts.map((account) => ({ socialAccountId: account.id })) },
      },
      include: POST_INCLUDE,
    });

    return this.toPostDetail(post);
  }

  /**
   * Items carrying an existing `id` are updated in place so their `Media` rows (and the
   * MinIO objects behind them) survive the edit; only items dropped from `input.items`
   * are deleted, and their storage objects cleaned up afterwards.
   */
  async updatePost(userId: string, input: UpdatePostInput): Promise<PostDetail> {
    const existing = await this.findEditablePostOrThrow(userId, input.postId);
    const accounts = await this.getOwnedAccountsOrThrow(userId, input.socialAccountIds);
    const capabilities = this.capabilitiesResolver.capabilitiesForNetworks(accounts.map((account) => account.network));
    this.validateItems(input.items, capabilities);

    const keptItemIds = new Set(input.items.flatMap((item) => (item.id ? [item.id] : [])));
    const removedItems = existing.items.filter((item) => !keptItemIds.has(item.id));

    const post = await this.prisma.client.$transaction(async (tx) => {
      for (const item of removedItems) {
        await tx.postItem.delete({ where: { id: item.id } });
      }
      for (const item of input.items) {
        if (item.id) {
          await tx.postItem.update({
            where: { id: item.id },
            data: { orderIndex: item.orderIndex, text: item.text },
          });
        } else {
          await tx.postItem.create({ data: { postId: existing.id, orderIndex: item.orderIndex, text: item.text } });
        }
      }

      await tx.postTarget.deleteMany({ where: { postId: existing.id } });
      await tx.postTarget.createMany({
        data: accounts.map((account) => ({ postId: existing.id, socialAccountId: account.id })),
      });

      return tx.post.update({ where: { id: existing.id }, data: {}, include: POST_INCLUDE });
    });

    await Promise.all(removedItems.flatMap((item) => item.media.map((media) => this.storage.delete(media.storageKey))));

    return this.toPostDetail(post);
  }

  async schedulePost(userId: string, input: SchedulePostInput): Promise<PostSummary> {
    const post = await this.findEditablePostOrThrow(userId, input.postId);

    const updated = await this.prisma.client.post.update({
      where: { id: post.id },
      data: { status: 'SCHEDULED', scheduledAt: new Date(input.scheduledAt) },
      include: POST_INCLUDE,
    });

    return this.toPostSummary(updated);
  }

  /** Immediate publication reuses scheduling with `scheduledAt = now`; the polling module (#20) picks it up. */
  async publishNow(userId: string, postId: string): Promise<PostSummary> {
    const post = await this.findEditablePostOrThrow(userId, postId);

    const updated = await this.prisma.client.post.update({
      where: { id: post.id },
      data: { status: 'SCHEDULED', scheduledAt: new Date() },
      include: POST_INCLUDE,
    });

    return this.toPostSummary(updated);
  }

  async cancelScheduled(userId: string, postId: string): Promise<PostSummary> {
    const post = await this.findOwnedPostOrThrow(userId, postId);
    if (post.status !== 'SCHEDULED') {
      throw new TRPCError({ code: 'CONFLICT', message: 'Only a scheduled post can be cancelled' });
    }

    const updated = await this.prisma.client.post.update({
      where: { id: post.id },
      data: { status: 'DRAFT', scheduledAt: null },
      include: POST_INCLUDE,
    });

    return this.toPostSummary(updated);
  }

  async deletePost(userId: string, postId: string): Promise<void> {
    const post = await this.findOwnedPostOrThrow(userId, postId);
    if (post.status === 'PUBLISHING') {
      throw new TRPCError({ code: 'CONFLICT', message: 'Cannot delete a post while it is publishing' });
    }

    await this.prisma.client.post.delete({ where: { id: post.id } });

    await Promise.all(post.items.flatMap((item) => item.media.map((media) => this.storage.delete(media.storageKey))));
  }

  async listPosts(userId: string, input: ListPostsInput): Promise<PostSummary[]> {
    const posts = await this.prisma.client.post.findMany({
      where: { userId, ...(input.status ? { status: input.status } : {}) },
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });

    return posts.map((post) => this.toPostSummary(post));
  }

  async getPost(userId: string, postId: string): Promise<PostDetail> {
    const post = await this.findOwnedPostOrThrow(userId, postId);
    return this.toPostDetail(post);
  }

  private async getOwnedAccountsOrThrow(userId: string, socialAccountIds: string[]) {
    const accounts = await this.prisma.client.socialAccount.findMany({
      where: { id: { in: socialAccountIds }, userId },
    });
    if (accounts.length !== socialAccountIds.length) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'One or more target accounts do not belong to you' });
    }
    return accounts;
  }

  private validateItems(items: CreateDraftInput['items'], capabilities: NetworkCapabilities): void {
    if (items.length > 1 && !capabilities.supportsThread) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'One or more selected networks do not support threads' });
    }
    for (const item of items) {
      if (item.text.length > capabilities.maxChars) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Item text exceeds the ${capabilities.maxChars} character limit for the selected networks`,
        });
      }
    }
  }

  private async findOwnedPostOrThrow(userId: string, postId: string): Promise<PostWithRelations> {
    const post = await this.prisma.client.post.findUnique({ where: { id: postId }, include: POST_INCLUDE });
    if (!post || post.userId !== userId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Post not found' });
    }
    return post;
  }

  private async findEditablePostOrThrow(userId: string, postId: string): Promise<PostWithRelations> {
    const post = await this.findOwnedPostOrThrow(userId, postId);
    if (post.status !== 'DRAFT' && post.status !== 'SCHEDULED') {
      throw new TRPCError({ code: 'CONFLICT', message: 'Only a draft or scheduled post can be edited' });
    }
    return post;
  }

  private async toPostDetail(post: PostWithRelations): Promise<PostDetail> {
    const items: PostItemDetail[] = await Promise.all(
      post.items.map(async (item) => ({
        id: item.id,
        orderIndex: item.orderIndex,
        text: item.text,
        media: await Promise.all(
          item.media.map(async (media) => ({
            id: media.id,
            postItemId: media.postItemId,
            url: await this.storage.getUrl(media.storageKey),
            mimeType: media.mimeType,
            orderIndex: media.orderIndex,
          }))
        ),
      }))
    );

    return { ...this.toPostSummary(post), items };
  }

  private toPostSummary(post: PostWithRelations): PostSummary {
    const targets: PostTargetSummary[] = post.targets.map((target) => ({
      id: target.id,
      socialAccountId: target.socialAccountId,
      network: target.socialAccount.network,
      status: target.status,
      errorMessage: target.errorMessage,
      publishedAt: target.publishedAt ? target.publishedAt.toISOString() : null,
    }));

    return {
      id: post.id,
      status: post.status,
      scheduledAt: post.scheduledAt ? post.scheduledAt.toISOString() : null,
      itemCount: post.items.length,
      targets,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    };
  }
}
