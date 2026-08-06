import { createTRPCRouter } from "./trpc";
import { currentUserRouter } from "./routers/current-user";
import { healthRouter } from "./routers/health";

export const appRouter = createTRPCRouter({
  currentUser: currentUserRouter,
  health: healthRouter,
});

export type AppRouter = typeof appRouter;
