import "server-only";
import { createClient } from "@supabase/supabase-js";
// Called only after successful password authentication or password update.
// The ID comes from Auth, never from a form; this metadata grants no permissions.
export async function recordPasswordEvidence(userId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  try {
    const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin;
    const { error } = await admin.updateUserById(userId, {
      app_metadata: { ariadne_password_verified_at: new Date().toISOString() },
    });
    if (error) console.warn("Password evidence could not be recorded");
  } catch { console.warn("Password evidence service unavailable"); }
}
