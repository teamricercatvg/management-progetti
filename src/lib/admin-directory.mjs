export const directoryColumns = [
  ["name", "Utente"], ["email", "Email"], ["status", "Stato"],
  ["role", "Ruolo"], ["projectsText", "Progetti associati"],
];
const normalize = value => String(value ?? "").normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("it").trim();
const collator = new Intl.Collator("it", { numeric: true, sensitivity: "base" });
export function selectDirectoryRows(rows, query = "", filters = {}, sort = "name", direction = "asc") {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  const selected = rows.filter(row => {
    const haystack = normalize(`${row.name} ${row.email} ${row.projectsText}`);
    return terms.every(term => haystack.includes(term)) && directoryColumns.every(([key]) => normalize(row[key]).includes(normalize(filters[key])));
  });
  const key = directoryColumns.some(([column]) => column === sort) ? sort : "name";
  return selected.sort((a, b) => {
    const comparison = collator.compare(a[key] || "", b[key] || "");
    return (direction === "desc" ? -comparison : comparison) || collator.compare(a.name, b.name) || a.id.localeCompare(b.id);
  });
}
