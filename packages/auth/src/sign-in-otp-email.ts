interface SignInOtpEmailOptions {
  apiKey: string;
  from: string;
  otp: string;
  to: string;
}

export async function sendSignInOtpEmail({ apiKey, from, otp, to }: SignInOtpEmailOptions) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "WorkPlus/1.0",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Your WorkPlus sign-in code",
      text: [
        "Use this 6-digit code to sign in to your WorkPlus account:",
        "",
        otp,
        "",
        "This code expires in 10 minutes. Your password will not be changed.",
        "If you did not request this code, you can ignore this email.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const responseMessage = await response.text();
    throw new Error(`Resend rejected the sign-in code with status ${response.status}: ${responseMessage}`);
  }
}
