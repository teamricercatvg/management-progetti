import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
export type Activity = {
  id: string;
  result_id: string;
  code: string;
  title: string;
  description: string | null;
  notes: string | null;
  status: string;
  priority: string;
  sort_order: number;
  planned_start_date: string;
  planned_end_date: string;
  actual_start_date: string | null;
  actual_end_date: string | null;
  row_version: number;
};
export async function getActivities(client: SupabaseClient, projectId: string) {
  const items: Activity[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from("activities")
      .select(
        "id,result_id,code,title,description,notes,status,priority,sort_order,planned_start_date,planned_end_date,actual_start_date,actual_end_date,row_version",
      )
      .eq("project_id", projectId)
      .order("sort_order")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Impossibile caricare le attività.");
    items.push(...(data as Activity[]));
    if (data.length < 500) return items;
  }
}
