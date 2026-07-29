import { z } from 'zod';
import type { Network } from '../social-accounts/social-account-schemas.js';

export const postStatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHING', 'PUBLISHED', 'FAILED', 'PARTIAL']);
export type PostStatus = z.infer<typeof postStatusSchema>;

export const postTargetStatusSchema = z.enum(['PENDING', 'PUBLISHING', 'SUCCESS', 'FAILED']);
export type PostTargetStatus = z.infer<typeof postTargetStatusSchema>;

export const postItemInputSchema = z.object({
  /** Existing `PostItem` id, so `updatePost` can preserve its attached `Media` instead of recreating it. Omitted for a new item. */
  id: z.string().min(1).optional(),
  orderIndex: z.number().int().min(0),
  text: z.string().min(1),
});
export type PostItemInput = z.infer<typeof postItemInputSchema>;

export const createDraftSchema = z.object({
  items: z.array(postItemInputSchema).min(1),
  socialAccountIds: z.array(z.string().min(1)).min(1),
});
export type CreateDraftInput = z.infer<typeof createDraftSchema>;

export const updatePostSchema = z.object({
  postId: z.string().min(1),
  items: z.array(postItemInputSchema).min(1),
  socialAccountIds: z.array(z.string().min(1)).min(1),
});
export type UpdatePostInput = z.infer<typeof updatePostSchema>;

export const schedulePostSchema = z.object({
  postId: z.string().min(1),
  scheduledAt: z.iso.datetime(),
});
export type SchedulePostInput = z.infer<typeof schedulePostSchema>;

export const publishNowSchema = z.object({
  postId: z.string().min(1),
});
export type PublishNowInput = z.infer<typeof publishNowSchema>;

export const cancelScheduledSchema = z.object({
  postId: z.string().min(1),
});
export type CancelScheduledInput = z.infer<typeof cancelScheduledSchema>;

export const deletePostSchema = z.object({
  postId: z.string().min(1),
});
export type DeletePostInput = z.infer<typeof deletePostSchema>;

export const listPostsSchema = z.object({
  status: postStatusSchema.optional(),
});
export type ListPostsInput = z.infer<typeof listPostsSchema>;

export const getPostSchema = z.object({
  postId: z.string().min(1),
});
export type GetPostInput = z.infer<typeof getPostSchema>;

export interface MediaSummary {
  id: string;
  postItemId: string;
  url: string;
  mimeType: string;
  orderIndex: number;
}

export interface PostItemDetail {
  id: string;
  orderIndex: number;
  text: string;
  media: MediaSummary[];
}

export interface PostTargetSummary {
  id: string;
  socialAccountId: string;
  network: Network;
  status: PostTargetStatus;
  errorMessage: string | null;
  publishedAt: string | null;
}

export interface PostSummary {
  id: string;
  status: PostStatus;
  scheduledAt: string | null;
  itemCount: number;
  targets: PostTargetSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface PostDetail extends PostSummary {
  items: PostItemDetail[];
}
