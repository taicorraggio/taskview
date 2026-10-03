"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  AuthCard,
  AuthError,
  buttonClassName,
  inputClassName,
} from "@/components/auth-card";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    setPending(false);
    if (error) {
      setError(
        error.message ??
          "Reset failed. The link may have expired — request a new one.",
      );
      return;
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <AuthCard title="Set a new password">
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthError message={error} />
        <div>
          <label htmlFor="rp-password" className="mb-1 block text-sm font-medium text-neutral-700">
            New password
          </label>
          <input
            id="rp-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
          />
          <p className="mt-1 text-xs text-neutral-500">At least 8 characters.</p>
        </div>
        <button type="submit" disabled={pending} className={buttonClassName}>
          {pending ? "Saving…" : "Set new password"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="text-lavender-700 hover:underline">
          Back to log in
        </Link>
      </p>
    </AuthCard>
  );
}
