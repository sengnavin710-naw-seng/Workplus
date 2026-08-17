import { redirect } from "next/navigation";
import { getSignedInDestination } from "@/auth/server";
import { safeInternalReturnTo } from "@/lib/access-policy";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "./login-form";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; invitation?: string; returnTo?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const destination = await getSignedInDestination();
  const { error, invitation, returnTo } = await searchParams;
  const safeReturnTo = safeInternalReturnTo(returnTo);

  if (destination) redirect(safeReturnTo ?? destination);

  const googleAuthEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

  return (
    <AuthShell
      description="Sign in to your WorkPlus account."
      title="Welcome to WorkPlus"
    >
      <LoginForm
        googleAuthEnabled={googleAuthEnabled}
        initialError={error === "google" ? "Google sign-in was not completed. Please try again." : undefined}
        initialMessage={invitation === "accepted" ? "Invitation accepted. Sign in to continue." : undefined}
        returnTo={safeReturnTo ?? undefined}
      />
    </AuthShell>
  );
}
