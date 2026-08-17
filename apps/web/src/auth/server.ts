import "server-only";

import { auth } from "@repo/auth";
import { db, schema } from "@repo/db";
import { and, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";
import { destinationForRole, isAdminRole } from "@/lib/access-policy";

export async function getDashboardIdentity() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) return null;

  const organizations = await auth.api.listOrganizations({ headers: requestHeaders });
  const explicitOrganization = organizations.find(
    (organization) => organization.id === session.session.activeOrganizationId,
  );
  const linkedEmployee =
    !explicitOrganization && organizations.length
      ? await db.query.employees.findFirst({
          columns: { organizationId: true },
          where: and(
            eq(schema.employees.linkedUserId, session.user.id),
            eq(schema.employees.status, "active"),
            inArray(
              schema.employees.organizationId,
              organizations.map((organization) => organization.id),
            ),
          ),
        })
      : null;
  const activeOrganization =
    explicitOrganization ??
    organizations.find(
      (organization) => organization.id === linkedEmployee?.organizationId,
    ) ??
    organizations[0] ??
    null;
  if (
    activeOrganization &&
    activeOrganization.id !== session.session.activeOrganizationId
  ) {
    await auth.api.setActiveOrganization({
      body: { organizationId: activeOrganization.id },
      headers: requestHeaders,
    });
  }
  const membership = activeOrganization
    ? await auth.api.getActiveMemberRole({
        headers: requestHeaders,
        query: { organizationId: activeOrganization.id },
      })
    : null;

  return {
    session,
    organizations,
    activeOrganization,
    role: membership?.role ?? null,
  };
}

export async function getAdminDashboardIdentity() {
  const identity = await getDashboardIdentity();
  if (!identity?.activeOrganization || !isAdminRole(identity.role)) return null;
  return identity;
}

export async function getSignedInDestination() {
  const identity = await getDashboardIdentity();
  if (!identity) return null;
  if (!identity.activeOrganization) return "/onboarding" as const;
  return destinationForRole(identity.role);
}
