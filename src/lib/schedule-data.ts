import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity } from "./activity-data";
export type Revision = {
  id: string;
  revision_number: number;
  title: string;
  reason: string;
  status: string;
  row_version: number;
  approved_at: string | null;
  activity_snapshot: Activity[];
  project_snapshot: { start_date: string; end_date: string } | null;
};
export type Period = {
  id: string;
  revision_id: string;
  activity_id: string;
  period_key: string;
  start_date: string;
  end_date: string;
  title: string;
  status: string;
  notes: string | null;
};
export async function getSchedule(client: SupabaseClient, projectId: string) {
  async function all(table: string) {
    const rows = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await client
        .from(table)
        .select("*")
        .eq("project_id", projectId)
        .order("id")
        .range(offset, offset + 499);
      if (error) throw new Error("Impossibile caricare il cronoprogramma.");
      rows.push(...data);
      if (data.length < 500) return rows;
    }
  }
  const [revisions, periods, state] = await Promise.all([
    all("schedule_revisions"),
    all("activity_schedule_periods"),
    client
      .from("project_schedule_state")
      .select("initial_revision_id,current_revision_id")
      .eq("project_id", projectId)
      .maybeSingle(),
  ]);
  if (state.error) throw new Error("Impossibile leggere il piano corrente.");
  return {
    revisions: revisions as Revision[],
    periods: periods as Period[],
    state: state.data,
  };
}
