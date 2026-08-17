import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processPendingInvitationEmails } from "../../../../lib/invitation-email-outbox";

function authorized(request: Request) {
  const secret = process.env.INVITATION_OUTBOX_SECRET;
  const authorization = request.headers.get("authorization");
  if (!secret || !authorization?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(authorization.slice(7));
  const expected = Buffer.from(secret);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function POST(request: Request) {
  if (!authorized(request))
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const results = await processPendingInvitationEmails();
  return NextResponse.json({ processed: results.length, results });
}
