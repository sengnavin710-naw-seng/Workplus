import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export default function ForgotPasswordPage() {
  const emailDeliveryEnabled = Boolean(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM);

  return (
    <AuthShell
      description="Sign in to your WorkPlus account with an email code."
      hideHeader
      hideLogo
      title="Account recovery"
    >
      <ForgotPasswordForm emailDeliveryEnabled={emailDeliveryEnabled} />
    </AuthShell>
  );
}
