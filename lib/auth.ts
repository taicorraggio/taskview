import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    // v1: no verification email flow yet (needs Resend). Reset emails are
    // stubbed below until RESEND_API_KEY is configured.
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      if (!process.env.RESEND_API_KEY) {
        console.warn(
          `[auth] Password reset requested for ${user.email} but RESEND_API_KEY is not set. Reset URL (dev only): ${url}`,
        );
        return;
      }
      // TODO: send via Resend (build step 6 / settings work).
    },
  },
  // Falls back to BETTER_AUTH_SECRET / BETTER_AUTH_URL env vars automatically;
  // set explicitly here so misconfiguration fails loudly at startup.
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
