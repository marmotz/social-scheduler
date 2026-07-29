import { completeConnectSchema, disconnectSchema, startConnectSchema } from '@sonskay/shared';
import { protectedProcedure, router } from '../trpc/trpc.js';
import type { SocialAccountsService } from './social-accounts.service.js';

export function createSocialAccountsRouter(socialAccountsService: SocialAccountsService) {
  return router({
    listAccounts: protectedProcedure.query(({ ctx }) => socialAccountsService.listAccounts(ctx.user.id)),

    startConnect: protectedProcedure
      .input(startConnectSchema)
      .mutation(({ input }) => socialAccountsService.startConnect(input.network, input.redirectUri)),

    completeConnect: protectedProcedure
      .input(completeConnectSchema)
      .mutation(({ input, ctx }) =>
        socialAccountsService.completeConnect(ctx.user.id, input.network, input.credentials)
      ),

    disconnect: protectedProcedure.input(disconnectSchema).mutation(async ({ input, ctx }) => {
      await socialAccountsService.disconnect(ctx.user.id, input.accountId);
      return { success: true as const };
    }),
  });
}
