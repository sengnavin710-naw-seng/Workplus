import { redirect } from "next/navigation";
import { getDashboardIdentity } from "@/auth/server";
import { isAdminRole } from "@/lib/access-policy";
import { PrivacyPage } from "./privacy-page";

export default async function PrivacySettingsRoute() {
  const identity = await getDashboardIdentity();
  if (!identity) redirect("/login");
  if (!identity.activeOrganization) redirect("/onboarding");
  if (!isAdminRole(identity.role)) redirect("/employee");

  return (
    <PrivacyPage
      organizationName={identity.activeOrganization.name}
      role={identity.role ?? "Owner"}
      userEmail={identity.session.user.email}
      userName={identity.session.user.name}
    />
  );
}
