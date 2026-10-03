import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">TaskView</h1>
          <p className="text-sm text-neutral-500">
            Signed in as {session.user.email}
          </p>
        </div>
        <SignOutButton />
      </div>
      <div className="mt-12 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
        <p className="text-lg font-medium text-neutral-700">
          The timeline lives here.
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          Build step 4: timeline UI + slide-over panels (see README).
        </p>
      </div>
    </main>
  );
}
