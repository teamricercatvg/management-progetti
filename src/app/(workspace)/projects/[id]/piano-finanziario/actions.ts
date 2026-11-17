"use server";
import { getProject } from "@/lib/project-data";
import { getFinancialData } from "@/lib/finance-data";
import { getInforEuro } from "@/lib/inforeuro-server";
import { todayRome } from "@/lib/finance.mjs";
import { requireProfile } from "@/lib/auth";
import { validId } from "@/lib/projects.mjs";
import { financeError } from "@/lib/finance.mjs";
import { revalidatePath } from "next/cache";
export type FinanceActionState = { message: string; ok?: boolean };
const commands = [
  "create_revision",
  "save_line",
  "save_allocation",
  "publish",
  "save_account",
  "save_rate",
  "save_entry",
  "correct_entry",
  "save_reminder",
  "import_inforeuro",
  "close_commitment",
  "void_entry",
];
export async function financeAction(
  projectId: string,
  command: string,
  previous: FinanceActionState,
  form: FormData,
): Promise<FinanceActionState> {
  void previous;
  const { client } = await requireProfile();
  if (!validId(projectId) || !commands.includes(command))
    return { message: "Richiesta non valida." };
  const payload: Record<string, string> = {};
  for (const [key, value] of form.entries()) {
    if (key.startsWith("$ACTION") || key === "row_version") continue;
    if (typeof value !== "string" || value.length > 4000)
      return { message: "Campo troppo lungo o non valido." };
    payload[key] = value.trim();
  }
  for (const key of ["amount", "planned_amount", "original_amount", "rate"])
    if (payload[key]) {
      payload[key] = payload[key].replace(",", ".");
      if (!/^\d+(\.\d{1,12})?$/.test(payload[key]))
        return {
          message:
            "Inserisci un importo positivo, senza separatori delle migliaia.",
        };
    }
  if (command === "import_inforeuro") {
    const { project } = await getProject(projectId);
    if (project.currency_code !== "EUR") return {message: "Importazione InforEuro disponibile per progetti in EUR."};
    const snapshot = await getFinancialData(client, projectId);
    if (snapshot.rates.some(r => r.source_currency_code === payload.source_currency_code && r.rate_month === `${payload.month}-01`)) return {message: "Cambio già salvato per questa valuta e mese. Per correggerlo usa una nuova versione motivata."};
    try {
      const quote = await getInforEuro(payload.source_currency_code, payload.month);
      const {error} = await client.rpc("edit_financial_plan", {target_project: projectId, command:"save_rate", expected_version:0,
        payload:{source_currency_code: quote.currency, rate_month:`${quote.month}-01`, rate:quote.rate, source:"Commissione europea · InforEuro",
        calculation_method:"Tasso contabile mensile InforEuro: reciproco delle unità di valuta per 1 EUR, arrotondato a 12 decimali.", source_reference:quote.source, observed_at:todayRome()}});
      if(error) return {message:financeError(error.code,error.message)};
      revalidatePath(`/projects/${projectId}/piano-finanziario`, "layout");
      return {ok:true,message:"Cambio InforEuro salvato. Questa valuta sarà proposta automaticamente nei mesi successivi."};
    } catch {return {message:"InforEuro non disponibile. Riprova più tardi."};}
  }
  const version = String(form.get("row_version") ?? "");
  if (version && !/^\d{1,14}$/.test(version))
    return { message: "Versione non valida. Ricarica la pagina." };
  if (["save_entry", "correct_entry"].includes(command) && payload.kind === "expense" && payload.register === "true" && payload.original_currency_code !== "EUR") {
    const { project } = await getProject(projectId);
    if (project.currency_code === "EUR") {
      const month = payload.entry_date?.slice(0, 7);
      const snapshot = await getFinancialData(client, projectId);
      if (!snapshot.rates.some(r => r.source_currency_code === payload.original_currency_code && r.rate_month === `${month}-01`)) {
        try {
          const quote = await getInforEuro(payload.original_currency_code, month);
          const { error: rateError } = await client.rpc("edit_financial_plan", {
            target_project: projectId, command: "save_rate", expected_version: 0,
            payload: { source_currency_code: quote.currency, rate_month: `${month}-01`, rate: quote.rate,
              source: "Commissione europea · InforEuro", calculation_method: "Tasso contabile mensile InforEuro: reciproco delle unità di valuta per 1 EUR, arrotondato a 12 decimali.",
              source_reference: quote.source, observed_at: todayRome() }
          });
          if (rateError && rateError.code !== "40001") return {message: financeError(rateError.code, rateError.message)};
        } catch { return {message: "Cambio InforEuro non disponibile. Riprova, inserisci un cambio manuale oppure salva la spesa in bozza."}; }
      }
    }
  }
  const { error } = await client.rpc("edit_financial_plan", {
    target_project: projectId,
    command,
    expected_version: version ? Number(version) : null,
    payload,
  });
  if (error) return { message: financeError(error.code, error.message) };
  revalidatePath(`/projects/${projectId}/piano-finanziario`, "layout");
  revalidatePath(`/projects/${projectId}`);
  return {
    message:
      command === "publish"
        ? "Piano approvato. La situazione finanziaria usa questa versione."
        : "Operazione salvata.",
    ok: true,
  };
}
