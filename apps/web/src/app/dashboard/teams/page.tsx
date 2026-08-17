import { redirect } from "next/navigation";
import { getDashboardIdentity } from "@/auth/server";
import { isAdminRole } from "@/lib/access-policy";
import { TeamsPage } from "./teams-page";

export default async function TeamsRoute() {
  const identity = await getDashboardIdentity();
  if (!identity) redirect("/login");
  if (!identity.activeOrganization) redirect("/onboarding");
  if (!isAdminRole(identity.role)) redirect("/employee");

  return <TeamsPage organizationName={identity.activeOrganization.name} role={identity.role ?? "Owner"} userEmail={identity.session.user.email} userName={identity.session.user.name} />;
}
