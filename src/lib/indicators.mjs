import { validId, validDate } from "./projects.mjs";
export const indicatorTypes = {
  absolute: "Valore numerico",
  ratio: "Rapporto / percentuale",
};
export const indicatorStatuses = {
  draft: "Bozza",
  active: "Attivo",
  archived: "Archiviato",
};
export const aggregations = {
  sum: "Somma dei contributi",
  last: "Ultimo valore",
  mean: "Media aritmetica",
  ratio_of_sums: "Rapporto fra le somme",
};
export const indicatorTextFields = {
  description: "Definizione e metodologia di calcolo",
  reference_code: "Codifica esterna (es. SDG, OMS)",
  measurement_period: "Periodo, frequenza e popolazione di riferimento",
  numerator_definition: "Definizione del numeratore",
  denominator_definition: "Definizione del denominatore",
  verification_source: "Fonti di verifica",
  baseline_note:
    "Note sulla baseline (motivazione dello zero o dato non disponibile)",
  target_note: "Note sul target (soglia, scadenza e motivazione)",
};
export function parseIndicator(form) {
  const text = (key) =>
    typeof form.get(key) === "string" ? form.get(key).trim() : "";
  const data = Object.fromEntries(
    Object.keys(indicatorTextFields).map((key) => [key, text(key) || null]),
  );
  /** @type {Record<string,string>} */
  const errors = {};
  for (const key of [
    "framework_item_id",
    "code",
    "title",
    "type",
    "unit",
    "aggregation_method",
    "direction",
    "status",
  ])
    data[key] = text(key);
  data.code = data.code.toUpperCase();
  data.ratio_scale = Number(text("ratio_scale"));
  if (!validId(data.framework_item_id))
    errors.framework_item_id = "Seleziona un obiettivo o risultato.";
  for (const [key, max] of [
    ["code", 80],
    ["title", 240],
    ["unit", 120],
  ])
    if (!data[key] || data[key].length > max)
      errors[key] = `Campo obbligatorio, massimo ${max} caratteri.`;
  for (const key of Object.keys(indicatorTextFields))
    if ((data[key]?.length ?? 0) > 10000)
      errors[key] = "Usa al massimo 10000 caratteri.";
  if (!data.verification_source)
    errors.verification_source = "Indica le fonti di verifica.";
  if (!Object.hasOwn(indicatorTypes, data.type))
    errors.type = "Tipo non valido.";
  if (!["draft", "active"].includes(data.status))
    errors.status = "Stato non valido.";
  if (!["increase", "decrease"].includes(data.direction))
    errors.direction = "Direzione non valida.";
  const methods =
    data.type === "ratio" ? ["ratio_of_sums", "last"] : ["sum", "last", "mean"];
  if (!methods.includes(data.aggregation_method))
    errors.aggregation_method = "Metodo incompatibile con il tipo.";
  if (
    ![1, 100].includes(data.ratio_scale) ||
    (data.type === "absolute" && data.ratio_scale !== 1)
  )
    errors.ratio_scale = "Scala incompatibile con il tipo.";
  for (const group of ["baseline", "target"]) {
    data[`${group}_date`] = text(`${group}_date`) || null;
    for (const suffix of ["value", "numerator", "denominator"]) {
      const key = `${group}_${suffix}`,
        raw = text(key).replace(",", ".");
      data[key] = raw || null; // Keep decimal strings: no rounding through JS Number before persistence.
      if (raw && !/^-?\d{1,14}(\.\d{1,6})?$/.test(raw))
        errors[key] =
          "Numero valido con massimo 14 cifre intere e 6 decimali; senza separatori delle migliaia.";
    }
    const keys = ["date", "value", "numerator", "denominator"].map(
      (s) => `${group}_${s}`,
    );
    if (keys.some((k) => data[k] !== null) || data.status === "active") {
      if (!validDate(data[`${group}_date`] ?? ""))
        errors[`${group}_date`] = "Completa la data di riferimento.";
      if (data.type === "absolute") {
        if (data[`${group}_value`] === null)
          errors[`${group}_value`] = "Inserisci il valore (zero è un valore).";
        if (
          data[`${group}_numerator`] !== null ||
          data[`${group}_denominator`] !== null
        )
          errors[`${group}_value`] =
            "Un valore numerico non usa numeratore e denominatore.";
      } else {
        if (data[`${group}_numerator`] === null)
          errors[`${group}_numerator`] = "Inserisci il numeratore.";
        if (
          data[`${group}_denominator`] === null ||
          !(Number(data[`${group}_denominator`]) > 0)
        )
          errors[`${group}_denominator`] =
            "Il denominatore deve essere maggiore di zero.";
        if (data[`${group}_value`] !== null)
          errors[`${group}_value`] =
            "Per un rapporto inserisci numeratore e denominatore.";
      }
    }
  }
  if (
    data.baseline_date &&
    data.target_date &&
    data.target_date < data.baseline_date
  )
    errors.target_date = "Il target non può precedere la baseline.";
  return { data, errors };
}
export function indicatorValue(item, group) {
  const value =
    item.type === "ratio"
      ? item[`${group}_numerator`] != null &&
        item[`${group}_numerator`] !== "" &&
        Number(item[`${group}_denominator`]) > 0
        ? (Number(item[`${group}_numerator`]) /
            Number(item[`${group}_denominator`])) *
          Number(item.ratio_scale)
        : null
      : item[`${group}_value`];
  return value == null
    ? "Non disponibile"
    : `${Number(value).toLocaleString("it-IT", { maximumFractionDigits: 6 })}${item.type === "ratio" && Number(item.ratio_scale) === 100 ? "%" : ""}`;
}
export function indicatorError(code) {
  if (code === "23505")
    return "Codice indicatore già utilizzato nel progetto, anche tra gli archiviati.";
  if (["23514", "23503", "23502", "22003"].includes(code))
    return "Verifica baseline, target e collegamento: l’elemento deve essere attivo nello stesso progetto. Ripristina prima l’elemento; i progetti archiviati sono in sola lettura.";
  if (code === "42501") return "Non hai più i permessi per questa operazione.";
  return "Salvataggio non riuscito. Ricarica la pagina e riprova.";
}
