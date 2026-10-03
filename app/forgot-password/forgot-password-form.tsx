"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import {
  AuthCard,
  AuthError,
  buttonClassName,
  inputClassName,
} from "@/components/auth-card";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    if (error) {
      setError(error.message ?? "Something went wrong. Try again.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthCard title="Check your email">
        <p className="text-sm text-neutral-600">
          If an account exists for <strong>{email}</strong>, a password reset
          link is on its way. It expires in one hour.
        </p>
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-lavender-700 hover:underline">
            Back to log in
          </Link>
        </p>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot password">
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthError message={error} />
        <div>
          <label htmlFor="fp-email" className="mb-1 block text-sm font-medium text-neutral-700">
            Email
          </label>
          <input
            id="fp-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
          />
        </div>
        <button type="submit" disabled={pending} className={buttonClassName}>
          {pending ? "Sending…" : "Send reset link"}
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
