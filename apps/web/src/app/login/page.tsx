import { redirect } from "next/navigation";
import { getDashboardIdentity } from "@/auth/server";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const identity = await getDashboardIdentity();
  const { error } = await searchParams;

  if (identity?.activeOrganization) redirect("/dashboard");
  if (identity) redirect("/onboarding");

  const googleAuthEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <AuthShell
      description="Sign in to your WorkPlus account."
      title="Welcome to WorkPlus"
    >
      <LoginForm
        googleAuthEnabled={googleAuthEnabled}
        initialError={error === "google" ? "Google sign-in was not completed. Please try again." : undefined}
      />
    </AuthShell>
  );
}
