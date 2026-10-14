export const statuses = {
  draft: "Bozza",
  active: "Attivo",
  completed: "Concluso",
  archived: "Archiviato",
};
export const organizationRoles = {
  sole: "Ente unico",
  lead: "Capofila",
  partner: "Partner",
};
export const validId = (value) =>
  typeof value === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const validVersion = (value) =>
  typeof value === "string" && /^[1-9]\d{0,14}$/.test(value);
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith("0000"))
    return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function parseProject(form) {
  const data = Object.fromEntries(
    [
      "code",
      "title",
      "description",
      "start_date",
      "end_date",
      "donor",
      "currency_code",
      "notes",
    ].map((key) => [
      key,
      typeof form.get(key) === "string" ? form.get(key).trim() : "",
    ]),
  );
  data.code = data.code.toUpperCase();
  data.currency_code = data.currency_code.toUpperCase();
  /** @type {Record<string, string>} */
  const errors = {};
  if (!data.code || data.code.length > 80)
    errors.code = "Inserisci un codice di massimo 80 caratteri.";
  if (!data.title || data.title.length > 240)
    errors.title = "Inserisci un titolo di massimo 240 caratteri.";
  if (!validDate(data.start_date))
    errors.start_date = "Inserisci una data di inizio valida.";
  if (!validDate(data.end_date) || data.end_date < data.start_date)
    errors.end_date = "La fine deve essere uguale o successiva all’inizio.";
  if (!/^[A-Z]{3}$/.test(data.currency_code))
    errors.currency_code =
      "Inserisci il codice valuta di tre lettere, ad esempio EUR.";
  for (const [key, max] of [
    ["description", 10000],
    ["notes", 10000],
    ["donor", 240],
  ]) {
    if (data[key].length > max)
      errors[key] = `Usa al massimo ${max} caratteri.`;
  }
  return { data, errors };
}
export function projectError(code) {
  if (code === "23505")
    return "Codice o associazione già presente. Usa un valore diverso.";
  if (code === "23514")
    return "Operazione non consentita: verifica le date, lo stato e gli enti. Per attivare o concludere serve un ente unico oppure un capofila con almeno un partner.";
  if (code === "42501") return "Non hai più i permessi per questa operazione.";
  return "Salvataggio non riuscito. Riprova; se il problema persiste ricarica la pagina.";
}
