"use server";
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
  const version = String(form.get("row_version") ?? "");
  if (version && !/^\d{1,14}$/.test(version))
    return { message: "Versione non valida. Ricarica la pagina." };
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
