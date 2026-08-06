import { createTRPCRouter, authenticatedProcedure } from "../trpc";

export const currentUserRouter = createTRPCRouter({
  get: authenticatedProcedure.query(({ ctx }) => ({ user: ctx.session.user })),
});
