import { redirect } from "next/navigation";
import { getDashboardIdentity } from "@/auth/server";

export default async function AuthCompletePage() {
  const identity = await getDashboardIdentity();

  if (!identity) redirect("/login?error=google");
  if (identity.activeOrganization) redirect("/dashboard");

  redirect("/onboarding");
}
