import "server-only";

import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db, schema } from "@repo/db";
import { betterAuth } from "better-auth/minimal";
import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";
import { organization } from "better-auth/plugins/organization";
import { emailOTP } from "better-auth/plugins/email-otp";
import { sendSignInOtpEmail } from "./sign-in-otp-email";

const accessControl = createAccessControl(defaultStatements);

const owner = accessControl.newRole(ownerAc.statements);
const admin = accessControl.newRole(adminAc.statements);
const manager = accessControl.newRole({
  organization: ["update"],
  member: ["create", "update"],
  invitation: ["create", "cancel"],
});
const employee = accessControl.newRole(memberAc.statements);

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const resendApiKey = process.env.RESEND_API_KEY;
const authEmailFrom = process.env.AUTH_EMAIL_FROM;

if (Boolean(googleClientId) !== Boolean(googleClientSecret)) {
  throw new Error(
    "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be configured together",
  );
}

if (Boolean(resendApiKey) !== Boolean(authEmailFrom)) {
  throw new Error(
    "RESEND_API_KEY and AUTH_EMAIL_FROM must be configured together",
  );
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      organization: schema.organizations,
      member: schema.organizationMembers,
      invitation: schema.invitations,
    },
  }),
  advanced: {
    database: { generateId: "uuid" },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: false,
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
  },
  socialProviders:
    googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            prompt: "select_account",
          },
        }
      : {},
  plugins: [
    emailOTP({
      allowedAttempts: 5,
      disableSignUp: true,
      expiresIn: 600,
      otpLength: 6,
      storeOTP: "hashed",
      sendVerificationOTP: ({ email, otp, type }) => {
        if (type !== "email-verification" || !resendApiKey || !authEmailFrom)
          return Promise.resolve();

        void sendSignInOtpEmail({
          apiKey: resendApiKey,
          from: authEmailFrom,
          otp,
          to: email,
        }).catch((error: unknown) => {
          console.error("Sign-in code delivery failed", error);
        });
        return Promise.resolve();
      },
    }),
    organization({
      ac: accessControl,
      roles: { owner, admin, manager, employee },
      creatorRole: "owner",
    }),
  ],
});

export type Session = typeof auth.$Infer.Session;
export { sendEmployeeInvitationEmail } from "./employee-invitation-email";
