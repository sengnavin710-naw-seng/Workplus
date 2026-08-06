import type { AppRouter } from "@repo/api";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

export function createApiClient(baseUrl: string) {
  return createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: `${baseUrl}/api/trpc` })],
  });
}
