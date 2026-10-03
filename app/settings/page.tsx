import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SettingsApp } from "@/components/settings-app";

export default async function SettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <SettingsApp
      user={{
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? null,
      }}
    />
  );
}
