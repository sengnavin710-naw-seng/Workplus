import "server-only";

import { db, schema } from "@repo/db";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hashOpaqueToken } from "./agent-token";

export { createOpaqueToken, hashOpaqueToken } from "./agent-token";

const allowedAgentOrigins = new Set([
  "http://localhost:1420",
  "http://tauri.localhost",
  "https://tauri.localhost",
  "tauri://localhost",
]);

const enrollmentWindowMs = 60_000;
const enrollmentLimit = 10;
const enrollmentRequests = new Map<string, { count: number; resetAt: number }>();

export function agentCorsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const headers = new Headers({
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  });
  if (origin && allowedAgentOrigins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }
  return headers;
}

export function agentJson(
  request: Request,
  body: unknown,
  init?: { status?: number },
) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: agentCorsHeaders(request),
  });
}

export function agentOptions(request: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: agentCorsHeaders(request),
  });
}

export function allowEnrollmentStart(request: Request) {
  const key =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  const now = Date.now();
  const current = enrollmentRequests.get(key);
  if (!current || current.resetAt <= now) {
    enrollmentRequests.set(key, {
      count: 1,
      resetAt: now + enrollmentWindowMs,
    });
    return true;
  }
  if (current.count >= enrollmentLimit) return false;
  current.count += 1;
  return true;
}

export function bearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  return token.length >= 32 ? token : null;
}

export async function authenticatedEnrollment(
  request: Request,
  enrollmentId: string,
) {
  const token = bearerToken(request);
  if (!token) return null;
  return db.query.deviceEnrollmentSessions.findFirst({
    where: and(
      eq(schema.deviceEnrollmentSessions.id, enrollmentId),
      eq(schema.deviceEnrollmentSessions.pollTokenHash, hashOpaqueToken(token)),
    ),
  });
}

export async function authenticatedDevice(request: Request) {
  const token = bearerToken(request);
  if (!token?.startsWith("wpd_")) return null;
  const credential = await db.query.deviceCredentials.findFirst({
    where: eq(
      schema.deviceCredentials.credentialHash,
      hashOpaqueToken(token),
    ),
    with: { device: { with: { employee: true, organization: true } } },
  });
  if (
    !credential ||
    credential.revokedAt ||
    credential.expiresAt <= new Date() ||
    credential.device.status !== "active" ||
    credential.device.employee.status !== "active"
  ) {
    return null;
  }
  return credential;
}

export function isExpired(expiresAt: Date) {
  return expiresAt <= new Date();
}
