import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
export type FrameworkItem = {
  id: string;
  parent_id: string | null;
  type: string;
  code: string;
  title: string;
  description: string | null;
  assumptions: string | null;
  sort_order: number;
  status: string;
  row_version: number;
};
export async function getFramework(client: SupabaseClient, projectId: string) {
  // Explicit pages avoid silently truncating a tree at PostgREST's row limit.
  const items: FrameworkItem[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from("logical_framework_items")
      .select(
        "id,parent_id,type,code,title,description,assumptions,sort_order,status,row_version",
      )
      .eq("project_id", projectId)
      .order("sort_order")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Impossibile caricare il quadro logico.");
    items.push(...(data as FrameworkItem[]));
    if (data.length < 500) return items;
  }
}
