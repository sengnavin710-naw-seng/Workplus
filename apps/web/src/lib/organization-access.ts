import { auth } from "@repo/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isAdminRole } from "./access-policy";

export async function getManageOrganizationContext() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) {
    return {
      error: NextResponse.json({ message: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  let organizationId = session.session.activeOrganizationId;
  if (!organizationId) {
    const organizations = await auth.api.listOrganizations({
      headers: requestHeaders,
    });
    organizationId = organizations[0]?.id;
  }
  if (!organizationId) {
    return {
      error: NextResponse.json(
        { message: "Active organization is required" },
        { status: 412 },
      ),
    } as const;
  }

  const membership = await auth.api.getActiveMemberRole({
    headers: requestHeaders,
    query: { organizationId },
  });
  if (!membership || !isAdminRole(membership.role)) {
    return {
      error: NextResponse.json({ message: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return { organizationId, role: membership.role, session } as const;
}
