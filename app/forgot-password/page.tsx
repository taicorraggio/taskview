import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");
  return <ForgotPasswordForm />;
}
