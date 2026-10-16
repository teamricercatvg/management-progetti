import { validId, validDate } from "./projects.mjs";
export const activityStatuses = {
  planned: "Prevista",
  in_progress: "In corso",
  completed: "Conclusa",
  cancelled: "Annullata",
  archived: "Archiviata",
};
export const activityPriorities = {
  low: "Bassa",
  normal: "Normale",
  high: "Alta",
};
export function parseActivity(form) {
  const text = (key) =>
    typeof form.get(key) === "string" ? form.get(key).trim() : "";
  const data = {
    result_id: text("result_id"),
    code: text("code").toUpperCase(),
    title: text("title"),
    description: text("description") || null,
    notes: text("notes") || null,
    priority: text("priority"),
    sort_order: Number(text("sort_order")),
    planned_start_date: text("planned_start_date"),
    planned_end_date: text("planned_end_date"),
    actual_start_date: text("actual_start_date") || null,
    actual_end_date: text("actual_end_date") || null,
  };
  /** @type {Record<string,string>} */
  const errors = {};
  if (!validId(data.result_id))
    errors.result_id = "Seleziona un risultato valido.";
  if (!data.code || data.code.length > 80)
    errors.code = "Inserisci un codice di massimo 80 caratteri.";
  if (!data.title || data.title.length > 240)
    errors.title = "Inserisci un titolo di massimo 240 caratteri.";
  for (const field of ["description", "notes"])
    if ((data[field]?.length ?? 0) > 10000)
      errors[field] = "Usa al massimo 10000 caratteri.";
  if (!Object.hasOwn(activityPriorities, data.priority))
    errors.priority = "Seleziona una priorità valida.";
  if (
    !/^\d+$/.test(text("sort_order")) ||
    !Number.isSafeInteger(data.sort_order) ||
    data.sort_order > 2147483647
  )
    errors.sort_order = "Inserisci un ordine intero tra 0 e 2147483647.";
  if (!validDate(data.planned_start_date))
    errors.planned_start_date = "Inserisci una data di inizio prevista valida.";
  if (
    !validDate(data.planned_end_date) ||
    data.planned_end_date < data.planned_start_date
  )
    errors.planned_end_date =
      "La fine prevista deve essere una data valida non precedente all’inizio previsto.";
  if (data.actual_start_date && !validDate(data.actual_start_date))
    errors.actual_start_date = "Inserisci una data di inizio effettiva valida.";
  if (
    data.actual_end_date &&
    (!validDate(data.actual_end_date) ||
      !data.actual_start_date ||
      data.actual_end_date < data.actual_start_date)
  )
    errors.actual_end_date =
      "La fine effettiva richiede un inizio effettivo e non può precederlo.";
  return { data, errors };
}
export function activityError(code) {
  if (code === "23505")
    return "Il codice attività è già utilizzato nel progetto.";
  if (code === "23514" || code === "23503")
    return "Verifica le date e il risultato collegato. Il risultato deve essere attivo e appartenere al progetto; un progetto archiviato è in sola lettura.";
  if (code === "42501")
    return "Non hai più i permessi per modificare questa attività.";
  return "Salvataggio non riuscito. Ricarica la pagina e riprova.";
}
