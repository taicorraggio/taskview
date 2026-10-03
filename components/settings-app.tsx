"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import {
  useTokens,
  useCreateToken,
  useRevokeToken,
  type CurrentUser,
} from "@/lib/queries";

const inputClass =
  "w-full rounded-md border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-lavender-600 focus:outline-none focus:ring-2 focus:ring-lavender-600/30";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
      {description && (
        <p className="mt-1 text-sm text-neutral-600">{description}</p>
      )}
      <div className="mt-4 space-y-3">{children}</div>
    </section>
  );
}

function FormMessage({ message }: { message: { ok: boolean; text: string } | null }) {
  if (!message) return null;
  return (
    <p
      role={message.ok ? "status" : "alert"}
      className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}
    >
      {message.text}
    </p>
  );
}

export function SettingsApp({ user }: { user: CurrentUser }) {
  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <Link
            href="/"
            className="text-lg font-semibold text-neutral-900 focus-visible:outline-2 focus-visible:outline-lavender-600"
          >
            TaskView
          </Link>
          <span className="text-neutral-300">/</span>
          <h1 className="text-lg text-neutral-700">Settings</h1>
        </div>
      </header>
      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <ProfileSection user={user} />
        <PasswordSection />
        <TokensSection />
        <DangerZone user={user} />
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProfileSection({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await authClient.updateUser({ name: name.trim() || undefined });
    setSaving(false);
    if (error) {
      setMsg({ ok: false, text: error.message ?? "Couldn't save your name." });
    } else {
      setMsg({ ok: true, text: "Name updated." });
      router.refresh();
    }
  }

  return (
    <Section title="Profile" description={`Signed in as ${user.email}`}>
      <form onSubmit={onSave} className="flex flex-wrap items-end gap-2">
        <div className="min-w-52 flex-1">
          <label htmlFor="profile-name" className="mb-1 block text-sm font-medium text-neutral-700">
            Display name
          </label>
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            autoComplete="name"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-lavender-600 px-4 py-2 text-sm font-medium text-white hover:bg-lavender-700 focus-visible:outline-2 focus-visible:outline-lavender-600 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </form>
      <FormMessage message={msg} />
    </Section>
  );
}

// ---------------------------------------------------------------------------

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { error } = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });
    setSaving(false);
    if (error) {
      setMsg({ ok: false, text: error.message ?? "Couldn't change your password." });
    } else {
      setMsg({ ok: true, text: "Password changed. Other sessions were signed out." });
      setCurrentPassword("");
      setNewPassword("");
    }
  }

  return (
    <Section title="Password">
      <form onSubmit={onSave} className="grid max-w-md gap-3">
        <div>
          <label htmlFor="pw-current" className="mb-1 block text-sm font-medium text-neutral-700">
            Current password
          </label>
          <input
            id="pw-current"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            autoComplete="current-password"
            required
          />
        </div>
        <div>
          <label htmlFor="pw-new" className="mb-1 block text-sm font-medium text-neutral-700">
            New password
          </label>
          <input
            id="pw-new"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-lavender-600 px-4 py-2 text-sm font-medium text-white hover:bg-lavender-700 focus-visible:outline-2 focus-visible:outline-lavender-600 disabled:opacity-50"
          >
            {saving ? "Changing…" : "Change password"}
          </button>
        </div>
      </form>
      <FormMessage message={msg} />
    </Section>
  );
}

// ---------------------------------------------------------------------------

function TokensSection() {
  const { data: tokens, isLoading } = useTokens();
  const createMut = useCreateToken();
  const revokeMut = useRevokeToken();
  const [name, setName] = useState("");
  const [freshToken, setFreshToken] = useState<{ name: string; token: string } | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const t = await createMut.mutateAsync({ name: name.trim() });
      setFreshToken({ name: t.name, token: t.token });
      setName("");
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create the token.");
    }
  }

  async function onRevoke(id: string) {
    setError(null);
    try {
      await revokeMut.mutateAsync(id);
      setRevokingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't revoke the token.");
    }
  }

  async function copyToken() {
    if (!freshToken) return;
    try {
      await navigator.clipboard.writeText(freshToken.token);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Section
      title="API tokens"
      description="Personal tokens for scripts and assistants to call the TaskView API. Only the hash is stored — a token is shown once, at creation."
    >
      {freshToken && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">
            Copy this token now — it won&apos;t be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-white px-2 py-1.5 font-mono text-xs text-neutral-900">
              {freshToken.token}
            </code>
            <button
              type="button"
              onClick={copyToken}
              className="shrink-0 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-lavender-600"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              type="button"
              onClick={() => setFreshToken(null)}
              className="shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-lavender-600"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <form onSubmit={onCreate} className="flex flex-wrap items-end gap-2">
        <div className="min-w-52 flex-1">
          <label htmlFor="token-name" className="mb-1 block text-sm font-medium text-neutral-700">
            New token name
          </label>
          <input
            id="token-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. assistant access"
            className={inputClass}
            required
            maxLength={100}
          />
        </div>
        <button
          type="submit"
          disabled={createMut.isPending || !name.trim()}
          className="rounded-md bg-lavender-600 px-4 py-2 text-sm font-medium text-white hover:bg-lavender-700 focus-visible:outline-2 focus-visible:outline-lavender-600 disabled:opacity-50"
        >
          {createMut.isPending ? "Creating…" : "Generate token"}
        </button>
      </form>

      {isLoading ? (
        <p className="text-sm text-neutral-500" role="status">Loading tokens…</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {(tokens ?? []).map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-neutral-900">{t.name}</p>
                <p className="text-xs text-neutral-500">
                  Created {new Date(t.createdAt).toLocaleDateString()}
                  {t.lastUsedAt
                    ? ` · last used ${new Date(t.lastUsedAt).toLocaleDateString()}`
                    : " · never used"}
                </p>
              </div>
              {revokingId === t.id ? (
                <span className="inline-flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onRevoke(t.id)}
                    disabled={revokeMut.isPending}
                    className="rounded-md bg-red-700 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-700 disabled:opacity-50"
                  >
                    {revokeMut.isPending ? "Revoking…" : "Confirm revoke"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRevokingId(null)}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-lavender-600"
                  >
                    Cancel
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevokingId(t.id)}
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 focus-visible:outline-2 focus-visible:outline-red-700"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
          {(tokens ?? []).length === 0 && (
            <li className="px-3 py-4 text-sm text-neutral-500">No tokens yet.</li>
          )}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------

function DangerZone({ user }: { user: CurrentUser }) {
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = confirmText.trim() === user.email && password.length > 0;

  async function onDelete(e: React.FormEvent) {
    e.preventDefault();
    if (!canDelete) return;
    setDeleting(true);
    setError(null);
    const { error } = await authClient.deleteUser({
      password,
      callbackURL: "/login",
    });
    // On success Better Auth redirects to callbackURL; if we're still here it failed.
    setDeleting(false);
    if (error) {
      setError(error.message ?? "Couldn't delete your account.");
    }
  }

  return (
    <Section
      title="Danger zone"
      description="Deleting your account permanently removes your epics, tasks, and API tokens. This can't be undone."
    >
      <form onSubmit={onDelete} className="grid max-w-md gap-3">
        <div>
          <label htmlFor="delete-confirm" className="mb-1 block text-sm font-medium text-neutral-700">
            Type your email (<span className="font-mono">{user.email}</span>) to confirm
          </label>
          <input
            id="delete-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className={inputClass}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="delete-password" className="mb-1 block text-sm font-medium text-neutral-700">
            Password
          </label>
          <input
            id="delete-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            autoComplete="current-password"
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={!canDelete || deleting}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 focus-visible:outline-2 focus-visible:outline-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </form>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </Section>
  );
}
