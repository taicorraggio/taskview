import { createAuthClient } from "better-auth/react";

// Client-side auth helpers (signIn / signUp / signOut / forgetPassword …).
// baseURL defaults to the current origin, which is what we want on Vercel.
export const authClient = createAuthClient();
