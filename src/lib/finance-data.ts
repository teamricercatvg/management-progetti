import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
export type FinancialRevision = {
  id: string;
  revision_number: number;
  based_on_id: string | null;
  title: string;
  reason: string;
  status: string;
  row_version: number;
  approved_at: string | null;
  project_snapshot: {
    start_date: string;
    end_date: string;
    currency_code: string;
  } | null;
};
export type FinancialLine = {
  id: string;
  revision_id: string;
  line_item_id: string;
  category_id: string;
  category_name_snapshot: string;
  macro_code?: string | null;
  macro_name_snapshot?: string | null;
  description: string;
  planned_amount: number;
  notes: string | null;
};
export type Allocation = {
  id: string;
  budget_line_id: string;
  partner_id: string | null;
  result_id: string | null;
  project_year: number | null;
  amount: number;
  result_label: string | null;
  partner_label: string | null;
};
export type BankAccount = {
  id: string;
  partner_id: string;
  name: string;
  bank_name: string | null;
  account_reference: string | null;
  status: string;
  row_version: number;
};
export type ExchangeRate = {
  id: string;
  source_currency_code: string;
  rate_month: string;
  version: number;
  rate: string;
  source: string;
  calculation_method: string;
  source_reference: string | null;
  observed_at: string;
  reason: string | null;
};
export type FinancialEntry = {
  id: string;
  kind: "income" | "commitment" | "expense" | "transfer";
  reference: string;
  description: string;
  entry_date: string;
  partner_id: string;
  account_id: string | null;
  destination_partner_id: string | null;
  destination_account_id: string | null;
  line_item_id: string | null;
  result_id: string | null;
  commitment_id: string | null;
  original_currency_code: string;
  original_amount: string;
  exchange_rate_id: string | null;
  applied_rate: string | null;
  amount: number | null;
  status: string;
  posted_at: string | null;
  notes: string | null;
  void_reason: string | null;
  row_version: number;
};
export type FinancialData = {
  revisions: FinancialRevision[];
  lines: FinancialLine[];
  items: { id: string; code: string }[];
  categories: { id: string; code: string; name: string }[];
  allocations: Allocation[];
  accounts: BankAccount[];
  rates: ExchangeRate[];
  entries: FinancialEntry[];
  state: { initial_revision_id: string; current_revision_id: string } | null;
  partners: { id: string; label: string; role: string }[];
  results: { id: string; label: string; status: string }[];
};
export async function getFinancialData(
  client: SupabaseClient,
  projectId: string,
): Promise<FinancialData> {
  const { data, error } = await client.rpc("financial_snapshot", {
    target_project: projectId,
  });
  if (error || !data)
    throw new Error(
      "Impossibile caricare il piano finanziario. Riprova tra poco o contatta l’amministratore.",
    );
  return data as FinancialData;
}
