import "server-only";

import { auth } from "@repo/auth";
import { headers } from "next/headers";

export async function getDashboardIdentity() {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });

  if (!session) return null;

  const organizations = await auth.api.listOrganizations({ headers: requestHeaders });
  const activeOrganization =
    organizations.find((organization) => organization.id === session.session.activeOrganizationId) ?? organizations[0] ?? null;
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
