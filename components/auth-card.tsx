import type { ReactNode } from "react";

export const inputClassName =
  "w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 " +
  "placeholder:text-neutral-400 focus:border-lavender-600 focus:outline-none focus:ring-2 " +
  "focus:ring-lavender-600/30 disabled:opacity-50";

export const buttonClassName =
  "w-full rounded-md bg-lavender-700 px-3 py-2 font-medium text-white " +
  "hover:bg-lavender-600 focus:outline-none focus:ring-2 focus:ring-lavender-600/50 " +
  "disabled:opacity-50";

export function AuthCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-neutral-900">
          {title}
        </h1>
        {children}
      </div>
    </main>
  );
}

export function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}
