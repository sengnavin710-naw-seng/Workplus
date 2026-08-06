import "server-only";

import { auth } from "@repo/auth";
import { initTRPC, TRPCError } from "@trpc/server";

export async function createTRPCContext(options: { headers: Headers }) {
  const session = await auth.api.getSession({ headers: options.headers });
  return { headers: options.headers, session };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;
const t = initTRPC.context<Context>().create();

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const authenticatedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({ ctx: { ...ctx, session: ctx.session } });
});

export const organizationProcedure = authenticatedProcedure.use(async ({ ctx, next }) => {
  const organizationId = ctx.session.session.activeOrganizationId;

  if (!organizationId) {
    throw new TRPCError({ code: "PRECONDITION_FAILED", message: "An active organization is required" });
  }

  const membership = await auth.api.getActiveMemberRole({
    headers: ctx.headers,
    query: { organizationId },
  });

  if (!membership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Organization membership is required" });
  }

  return next({
    ctx: {
      ...ctx,
      organization: { id: organizationId, role: membership.role },
      session: ctx.session,
    },
  });
});
