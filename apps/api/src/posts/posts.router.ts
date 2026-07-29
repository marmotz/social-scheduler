import {
  cancelScheduledSchema,
  createDraftSchema,
  deletePostSchema,
  getPostSchema,
  listPostsSchema,
  publishNowSchema,
  schedulePostSchema,
  updatePostSchema,
} from '@sonskay/shared';
import { protectedProcedure, router } from '../trpc/trpc.js';
import type { PostsService } from './posts.service.js';

export function createPostsRouter(postsService: PostsService) {
  return router({
    createDraft: protectedProcedure
      .input(createDraftSchema)
      .mutation(({ input, ctx }) => postsService.createDraft(ctx.user.id, input)),

    updatePost: protectedProcedure
      .input(updatePostSchema)
      .mutation(({ input, ctx }) => postsService.updatePost(ctx.user.id, input)),

    schedulePost: protectedProcedure
      .input(schedulePostSchema)
      .mutation(({ input, ctx }) => postsService.schedulePost(ctx.user.id, input)),

    publishNow: protectedProcedure
      .input(publishNowSchema)
      .mutation(({ input, ctx }) => postsService.publishNow(ctx.user.id, input.postId)),

    cancelScheduled: protectedProcedure
      .input(cancelScheduledSchema)
      .mutation(({ input, ctx }) => postsService.cancelScheduled(ctx.user.id, input.postId)),

    deletePost: protectedProcedure.input(deletePostSchema).mutation(async ({ input, ctx }) => {
      await postsService.deletePost(ctx.user.id, input.postId);
      return { success: true as const };
    }),

    listPosts: protectedProcedure
      .input(listPostsSchema)
      .query(({ input, ctx }) => postsService.listPosts(ctx.user.id, input)),

    getPost: protectedProcedure
      .input(getPostSchema)
      .query(({ input, ctx }) => postsService.getPost(ctx.user.id, input.postId)),
  });
}
