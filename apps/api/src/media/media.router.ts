import { deleteMediaSchema, uploadMediaSchema } from '@sonskay/shared';
import { protectedProcedure, router } from '../trpc/trpc.js';
import type { MediaService } from './media.service.js';

export function createMediaRouter(mediaService: MediaService) {
  return router({
    upload: protectedProcedure
      .input(uploadMediaSchema)
      .mutation(({ input, ctx }) => mediaService.upload(ctx.user.id, input)),

    delete: protectedProcedure.input(deleteMediaSchema).mutation(async ({ input, ctx }) => {
      await mediaService.delete(ctx.user.id, input.mediaId);
      return { success: true as const };
    }),
  });
}
