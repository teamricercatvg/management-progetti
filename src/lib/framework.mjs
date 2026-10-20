import { validId } from "./projects.mjs";
export const frameworkTypes = {
  general_objective: "Obiettivo generale",
  specific_objective: "Obiettivo specifico",
  expected_result: "Risultato atteso",
};
export const parentTypes = {
  specific_objective: "general_objective",
  expected_result: "specific_objective",
};
export function parseFramework(form) {
  const text = (key) => String(form.get(key) ?? "").trim();
  const data = {
    type: text("type"),
    parent_id: text("parent_id") || null,
    code: text("code").toUpperCase(),
    title: text("title"),
    description: text("description") || null,
    assumptions: null,
    sort_order: Number(text("sort_order")),
  };
  /** @type {Record<string, string>} */
  const errors = {};
  try {
    const risks = JSON.parse(text("risks") || "[]");
    if (!Array.isArray(risks) || risks.some((r) => !r || typeof r.risk !== "string" || typeof r.mitigation !== "string")) throw new Error();
    const entries = risks.map(({ risk, mitigation }) => ({ risk: risk.trim(), mitigation: mitigation.trim() })).filter((r) => r.risk || r.mitigation);
    if (entries.some((r) => !r.risk)) errors.risks = "Descrivi il rischio associato a ogni azione di mitigazione.";
    data.assumptions = entries.length ? JSON.stringify({ format: "risks-v1", entries }) : null;
    if (data.assumptions?.length > 10000) errors.risks = "L’elenco dei rischi è troppo lungo: riduci il testo.";
  } catch {
    errors.risks = "Elenco rischi non valido.";
  }
  if (!Object.hasOwn(frameworkTypes, data.type))
    errors.type = "Seleziona un livello valido.";
  if (
    data.type === "general_objective"
      ? data.parent_id !== null
      : !validId(data.parent_id)
  )
    errors.parent_id = "Seleziona il genitore del livello precedente.";
  for (const [key, max] of [
    ["code", 80],
    ["title", 240],
    ["description", 10000],
    ["assumptions", 10000],
  ]) {
    if (
      (["code", "title"].includes(key) && !data[key]) ||
      (data[key]?.length ?? 0) > max
    )
      errors[key] =
        `Campo obbligatorio o lunghezza superiore a ${max} caratteri.`;
  }
  if (
    !/^\d+$/.test(text("sort_order")) ||
    !Number.isSafeInteger(data.sort_order) ||
    data.sort_order > 2147483647
  )
    errors.sort_order = "Inserisci un intero tra 0 e 2147483647.";
  return { data, errors };
}
export function frameworkError(code) {
  if (code === "23505") return "Il codice è già utilizzato nel progetto.";
  if (code === "23514" || code === "23503")
    return "Gerarchia non valida: verifica livello e genitore attivo. Archivia prima i figli attivi e tutte le attività collegate; riattiva prima il genitore. Un elemento con figli o attività non può cambiare livello.";
  return "Salvataggio non riuscito. Verifica l’accesso al progetto e riprova.";
}

/** @param {string | null | undefined} value
 * @returns {{risk: string, mitigation: string}[]}
 */
export function readFrameworkRisks(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (parsed?.format === "risks-v1" && Array.isArray(parsed.entries) &&
        parsed.entries.every((r) => r && typeof r.risk === "string" && typeof r.mitigation === "string")) return parsed.entries;
  } catch { /* Historical plain text is preserved as a first editable entry. */ }
  return [{ risk: value, mitigation: "" }];
}
