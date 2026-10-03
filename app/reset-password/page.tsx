import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthCard } from "@/components/auth-card";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthCard title="Invalid reset link">
        <p className="text-sm text-neutral-600">
          This link is missing its token. Request a fresh one.
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/forgot-password" className="text-lavender-700 hover:underline">
            Forgot password
          </Link>
        </p>
      </AuthCard>
    );
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");
  return <ResetPasswordForm token={token} />;
}
