"use server";
import { recordPasswordEvidence } from "@/lib/password-evidence";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { validEmail, validPassword, appOrigin } from "@/lib/validation.mjs";
export async function login(form: FormData) {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!validEmail(email) || !password || password.length > 128)
    redirect("/login?status=invalid");
  const client = await createClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?status=invalid");
  if (data.user) await recordPasswordEvidence(data.user.id);
  redirect("/overview");
}
export async function logout() {
  const client = await createClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) redirect("/login?status=unavailable");
  redirect("/login?status=out");
}
export async function recover(form: FormData) {
  const destination = form.get("context") === "invitation" ? "/auth/invitation-help" : "/login";
  const email = String(form.get("email") ?? "").trim();
  if (!validEmail(email)) redirect(`${destination}?status=email`);
  const client = await createClient();
  if (!process.env.APP_URL && process.env.NODE_ENV === "production")
    redirect(`${destination}?status=unavailable`);
  const origin = appOrigin(process.env.APP_URL || "http://127.0.0.1:3000");
  // Same public result for unknown, rate-limited and registered addresses.
  await client.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/accept`,
  });
  redirect(`${destination}?status=sent`);
}
export async function updatePassword(form: FormData) {
  const { client, user } = await requireProfile();
  const password = String(form.get("password") ?? "");
  if (!validPassword(password) || password !== form.get("confirm"))
    redirect("/password?status=invalid");
  const { error } = await client.auth.updateUser({ password });
  if (error) redirect("/password?status=failed");
  await recordPasswordEvidence(user.id);
  redirect("/account?status=updated");
}
