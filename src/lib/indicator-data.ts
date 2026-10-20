import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
export type Indicator = {
  id: string;
  framework_item_id: string;
  code: string;
  title: string;
  type: string;
  unit: string;
  aggregation_method: string;
  direction: string;
  ratio_scale: number;
  status: string;
  row_version: number;
  baseline_date: string | null;
  target_date: string | null;
  baseline_value: number | null;
  baseline_numerator: number | null;
  baseline_denominator: number | null;
  target_value: number | null;
  target_numerator: number | null;
  target_denominator: number | null;
  description: string | null;
  verification_source: string;
  reference_code: string | null;
  measurement_period: string | null;
  numerator_definition: string | null;
  denominator_definition: string | null;
  baseline_note: string | null;
  target_note: string | null;
};
export async function getIndicators(client: SupabaseClient, projectId: string) {
  const items: Indicator[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from("indicators")
      .select(
        "id,framework_item_id,code,title,type,unit,aggregation_method,direction,ratio_scale,status,row_version,baseline_date,target_date,baseline_value,baseline_numerator,baseline_denominator,target_value,target_numerator,target_denominator,description,verification_source,reference_code,measurement_period,numerator_definition,denominator_definition,baseline_note,target_note",
      )
      .eq("project_id", projectId)
      .order("code")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error("Impossibile caricare gli indicatori.");
    items.push(...(data as Indicator[]));
    if (data.length < 500) return items;
  }
}
