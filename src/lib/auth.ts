import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function requireProfile() {
  const client = await createClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) redirect("/login");
  const { data, error: profileError } = await client.rpc("current_profile");
  if (profileError) redirect("/login?status=unavailable");
  if (!data?.length) redirect("/login?status=inactive");
  return {
    client,
    user,
    profile: data[0] as { id: string; display_name: string; is_admin: boolean },
  };
}
