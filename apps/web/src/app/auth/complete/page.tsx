import { redirect } from "next/navigation";
import { getSignedInDestination } from "@/auth/server";

export default async function AuthCompletePage() {
  const destination = await getSignedInDestination();
  redirect(destination ?? "/login?error=google");
}
