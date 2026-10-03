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

export function SignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const { error } = await authClient.signUp.email({ email, password, name });
    setPending(false);
    if (error) {
      setError(error.message ?? "Sign up failed. Try a different email.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <AuthCard title="Create your account">
      <form onSubmit={onSubmit} className="space-y-4">
        <AuthError message={error} />
        <div>
          <label htmlFor="signup-name" className="mb-1 block text-sm font-medium text-neutral-700">
            Name
          </label>
          <input
            id="signup-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="signup-email" className="mb-1 block text-sm font-medium text-neutral-700">
            Email
          </label>
          <input
            id="signup-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClassName}
          />
        </div>
        <div>
          <label htmlFor="signup-password" className="mb-1 block text-sm font-medium text-neutral-700">
            Password
          </label>
          <input
            id="signup-password"
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
          {pending ? "Creating account…" : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-600">
        Already have an account?{" "}
        <Link href="/login" className="text-lavender-700 hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
