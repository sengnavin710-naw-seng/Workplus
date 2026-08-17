import { randomUUID } from "node:crypto";

export function requestIdFor(request: Request) {
  return request.headers.get("x-request-id")?.slice(0, 200) || randomUUID();
}

export function auditMetadata(value: Record<string, unknown>) {
  return JSON.stringify(value);
}
