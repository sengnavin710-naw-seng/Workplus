interface EmployeeInvitationEmailOptions {
  apiKey: string;
  from: string;
  inviteUrl: string;
  employeeName: string;
  isResend?: boolean;
  idempotencyKey: string;
  to: string;
}

export async function sendEmployeeInvitationEmail({
  apiKey,
  from,
  inviteUrl,
  employeeName,
  isResend = false,
  idempotencyKey,
  to,
}: EmployeeInvitationEmailOptions): Promise<{ id: string }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "User-Agent": "WorkPlus/1.0",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: isResend
        ? "WorkPlus invitation — new link"
        : "You are invited to WorkPlus",
      text: [
        `Hi ${employeeName},`,
        "",
        "You have been invited to join your team on WorkPlus.",
        `Accept your invitation: ${inviteUrl}`,
        "",
        "This invitation expires in 7 days. If you did not expect it, you can ignore this email.",
      ].join("\n"),
    }),
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Resend rejected the employee invitation (${response.status}): ${details}`,
    );
  }

  const body: unknown = await response.json();
  if (
    typeof body !== "object" ||
    body === null ||
    !("id" in body) ||
    typeof body.id !== "string"
  ) {
    throw new Error("Resend returned an invalid email identifier");
  }

  return { id: body.id };
}
