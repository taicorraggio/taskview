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

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signIn.email({ email, password });
    setPending(false);
    if (error) {
      setError(error.message ?? "Sign in failed. Check your email and password.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard title="Log in to TaskView">
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthError message={error} />
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-neutral-700">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-neutral-700">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClassName}
          />
        </div>
        <button type="submit" disabled={pending} className={buttonClassName}>
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-600">
        <Link href="/forgot-password" className="text-lavender-700 hover:underline">
          Forgot password?
        </Link>
      </p>
    </AuthCard>
  );
}
