import "server-only";
import { notFound } from "next/navigation";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireProfile } from "@/lib/auth";

export async function requireAdmin() {
  const context = await requireProfile();
  if (!context.profile.is_admin) notFound();
  return context;
}
// Obtain this client only after checking the caller; never use it for public tables.
export async function adminAuth() {
  await requireAdmin();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Servizio utenti non configurato.");
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }).auth.admin;
}
export type AdminProfile = { id: string; display_name: string; is_active: boolean; row_version: number };
