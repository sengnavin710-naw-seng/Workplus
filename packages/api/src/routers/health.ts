import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const healthRouter = createTRPCRouter({
  check: publicProcedure.query(() =>
    z.object({ status: z.literal("ok") }).parse({ status: "ok" }),
  ),
});
