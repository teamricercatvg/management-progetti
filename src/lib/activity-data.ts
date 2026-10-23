import "server-only";
import { getSchedule } from "./schedule-data";
import type { SupabaseClient } from "@supabase/supabase-js";
export type Activity = {
  id: string;
  result_id: string | null;
  parent_activity_id: string | null;
  category: string;
  stakeholders: string | null;
  cancellation_reason: string | null;
  code: string;
  title: string;
  description: string | null;
  notes: string | null;
  output: string | null;
  status: string;
  priority: string;
  sort_order: number;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  row_version: number;
  planned_period_count?: number;
  plan_source?: string;
};
export async function getActivities(
  client: SupabaseClient,
  projectId: string,
): Promise<Activity[]> {
  const items: Activity[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from("activities")
      .select(
        "id,result_id,parent_activity_id,category,stakeholders,cancellation_reason,code,title,description,notes,output,status,priority,sort_order,planned_start_date,planned_end_date,actual_start_date,actual_end_date,row_version",
      )
      .eq("project_id", projectId)
      .order("sort_order")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Impossibile caricare le attività.");
    items.push(...(data as Activity[]));
    if (data.length < 500) break;
  }
  const schedule = await getSchedule(client, projectId);
  const source =
    schedule.state?.current_revision_id ??
    schedule.revisions.find((r) => r.status === "draft")?.id;
  const periods = schedule.periods.filter(
    (p) => p.revision_id === source && p.status === "planned",
  );
  return items.map((a) => {
    const own = periods.filter((p) => p.activity_id === a.id);
    return {
      ...a,
      planned_start_date: own.map((p) => p.start_date).sort()[0] ?? null,
      planned_end_date:
        own
          .map((p) => p.end_date)
          .sort()
          .at(-1) ?? null,
      planned_period_count: own.length,
      plan_source: schedule.state ? "Piano corrente" : "Bozza non pubblicata",
    };
  });
}
