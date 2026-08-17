import { db, schema } from "@repo/db";
import { startDeviceEnrollmentSchema } from "@repo/validation";
import { NextResponse } from "next/server";
import {
  agentCorsHeaders,
  agentJson,
  agentOptions,
  allowEnrollmentStart,
  createOpaqueToken,
  hashOpaqueToken,
  authenticatedDevice,
} from "@/lib/agent-api";

export function OPTIONS(request: Request) {
  return agentOptions(request);
}

export async function POST(request: Request) {
  if (!allowEnrollmentStart(request)) {
    return agentJson(request, { message: "Try again in a minute" }, { status: 429 });
  }
  const parsed = startDeviceEnrollmentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return agentJson(request, { message: "Invalid device information" }, { status: 400 });
  }

  const pollToken = createOpaqueToken("wpe");
  const existingCredential = await authenticatedDevice(request);
  const [enrollment] = await db
    .insert(schema.deviceEnrollmentSessions)
    .values({
      ...parsed.data,
      deviceId: existingCredential?.deviceId,
      pollTokenHash: hashOpaqueToken(pollToken),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    })
    .returning({
      id: schema.deviceEnrollmentSessions.id,
      expiresAt: schema.deviceEnrollmentSessions.expiresAt,
    });
  if (!enrollment) {
    return agentJson(request, { message: "Enrollment could not be started" }, { status: 500 });
  }

  const configuredBaseUrl = process.env.BETTER_AUTH_URL ?? new URL(request.url).origin;
  const authorizationUrl = new URL("/agent/connect", configuredBaseUrl);
  authorizationUrl.searchParams.set("enrollment", enrollment.id);

  return NextResponse.json(
    {
      enrollmentId: enrollment.id,
      pollToken,
      authorizationUrl: authorizationUrl.toString(),
      expiresAt: enrollment.expiresAt,
    },
    { status: 201, headers: agentCorsHeaders(request) },
  );
}
