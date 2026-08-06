import { redirect } from "next/navigation";
import { getDashboardIdentity } from "@/auth/server";
import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const identity = await getDashboardIdentity();

  if (identity?.activeOrganization) redirect("/dashboard");
  if (identity) redirect("/onboarding");

  return (
    <AuthShell
      compact
      description="Get started with WorkPlus."
      title="Create your account"
    >
      <SignupForm />
    </AuthShell>
  );
}
