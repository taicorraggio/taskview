import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthCard } from "@/components/auth-card";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  // Server-side gate: public signup is off unless explicitly enabled.
  if (process.env.SIGNUP_ENABLED !== "true") {
    return (
      <AuthCard title="Sign up">
        <p className="text-sm text-neutral-600">
          Public signups are disabled on this site.
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-lavender-700 hover:underline">
            Back to log in
          </Link>
        </p>
      </AuthCard>
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");
  return <SignupForm />;
}
