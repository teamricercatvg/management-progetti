/** Financial arithmetic stays in integer cents; percentages are display-only. */
export function cents(value) {
  if (value === null || value === undefined || value === "") return 0n;
  const match = String(value).match(/^(-?)(\d+)(?:\.(\d{1,2}))?$/);
  if (!match) throw new Error("Importo monetario non valido.");
  return (
    (BigInt(match[2]) * 100n + BigInt((match[3] ?? "").padEnd(2, "0"))) *
    (match[1] ? -1n : 1n)
  );
}
export function decimal(value) {
  const n = value < 0n ? -value : value;
  return `${value < 0n ? "-" : ""}${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
}
export function money(value, currency = "EUR") {
  if (value === null || value === undefined) return "—";
  const n = typeof value === "bigint" ? value : cents(value);
  const absolute = n < 0n ? -n : n;
  return `${n < 0n ? "−" : ""}${(absolute / 100n).toLocaleString("it-IT", { useGrouping: "always" })},${String(absolute % 100n).padStart(2, "0")}${currency ? ` ${currency}` : ""}`;
}
export function decimalLabel(value) {
  if (value === null || value === undefined) return "—";
  const [whole, fraction] = String(value).split(".");
  const digits = (fraction ?? "").replace(/0+$/, "");
  return `${BigInt(whole).toLocaleString("it-IT", { useGrouping: "always" })}${digits ? `,${digits}` : ""}`;
}
export function percent(part, total) {
  return total > 0n ? Number((part * 10000n) / total) / 100 : null;
}
export const entryKinds = {
  income: "Entrate",
  commitment: "Impegni",
  expense: "Spese",
  transfer: "Trasferimenti",
};
export const entryStates = {
  draft: "Bozza",
  confirmed: "Aperto",
  closed: "Chiuso",
  cancelled: "Annullato",
  posted: "Registrato",
  voided: "Annullato",
};
export const financeTabs = {
  "": "Situazione finanziaria",
  piano: "Piano e ripartizioni",
  entrate: "Entrate",
  impegni: "Impegni",
  spese: "Spese",
  trasferimenti: "Trasferimenti",
  conti: "Conti e cambi",
};
export const dateLabel = (value) =>
  value ? value.slice(0, 10).split("-").reverse().join("/") : "—";
export function todayRome() {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Rome" }).format(
    new Date(),
  );
}
function anniversary(start, offset) {
  const [y, m, d] = start.split("-").map(Number);
  const last = new Date(Date.UTC(y + offset, m, 0)).getUTCDate();
  return `${y + offset}-${String(m).padStart(2, "0")}-${String(Math.min(d, last)).padStart(2, "0")}`;
}
export function projectYears(start, end) {
  const years = [];
  for (let i = 0; i < 100 && anniversary(start, i) <= end; i++) {
    const next = new Date(`${anniversary(start, i + 1)}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() - 1);
    const finish = next.toISOString().slice(0, 10);
    years.push({
      value: i + 1,
      start: anniversary(start, i),
      end: finish < end ? finish : end,
      label: `Anno ${i + 1}`,
    });
  }
  return years;
}
export function projectYear(date, start, end) {
  return (
    projectYears(start, end).find((y) => date >= y.start && date <= y.end)
      ?.value ?? null
  );
}
export function elapsedPercent(start, end, today = todayRome()) {
  const first = Date.parse(`${start}T00:00:00Z`),
    last = Date.parse(`${end}T00:00:00Z`) + 86400000;
  return Math.min(
    100,
    Math.max(
      0,
      ((Date.parse(`${today}T00:00:00Z`) - first) / (last - first)) * 100,
    ),
  );
}
export function commitmentRemainders(entries) {
  const paid = new Map();
  for (const e of entries)
    if (e.kind === "expense" && e.status === "posted" && e.commitment_id)
      paid.set(
        e.commitment_id,
        (paid.get(e.commitment_id) ?? 0n) + cents(e.amount),
      );
  return new Map(
    entries
      .filter((e) => e.kind === "commitment")
      .map((e) => [
        e.id,
        {
          paid: paid.get(e.id) ?? 0n,
          remaining:
            e.status === "confirmed"
              ? cents(e.amount) - (paid.get(e.id) ?? 0n)
              : 0n,
        },
      ]),
  );
}
/** Each allocation is one joint slice (result × partner × year), never 3 amounts. */
export function planSlices(lines, allocations) {
  const byLine = new Map();
  for (const a of allocations) {
    if (!byLine.has(a.budget_line_id)) byLine.set(a.budget_line_id, []);
    byLine.get(a.budget_line_id).push(a);
  }
  return lines.flatMap((l) => {
    const slices = (byLine.get(l.id) ?? []).map((a) => ({
      ...a,
      line_item_id: l.line_item_id,
      category: l.category_name_snapshot,
      planned: cents(a.amount),
    }));
    const remaining =
      cents(l.planned_amount) - slices.reduce((s, a) => s + a.planned, 0n);
    if (remaining || !slices.length)
      slices.push({
        line_item_id: l.line_item_id,
        category: l.category_name_snapshot,
        partner_id: null,
        result_id: null,
        project_year: null,
        planned: remaining,
      });
    return slices;
  });
}
export function financialSummary(data, lines, filters = {}, dates) {
  const remaining = commitmentRemainders(data.entries);
  const years = projectYears(dates.start_date, dates.end_date);
  const matches = (row) =>
    (!filters.line_item_ids ||
      filters.line_item_ids.includes(row.line_item_id)) &&
    ["line_item_id", "partner_id", "result_id", "project_year"].every(
      (key) =>
        !filters[key] ||
        String(row[key] ?? "unassigned") === String(filters[key]),
    );
  let planned = 0n,
    spent = 0n,
    committed = 0n,
    received = 0n,
    incoming = 0n,
    outgoing = 0n;
  for (const s of planSlices(lines, data.allocations))
    if (matches(s)) planned += s.planned;
  for (const e of data.entries) {
    const row = {
      ...e,
      project_year:
        years.find((y) => e.entry_date >= y.start && e.entry_date <= y.end)
          ?.value ?? null,
    };
    if (matches(row)) {
      if (e.kind === "expense" && e.status === "posted")
        spent += cents(e.amount);
      if (e.kind === "commitment")
        committed += remaining.get(e.id)?.remaining ?? 0n;
    }
    // Receipts/transfers have no cost line/result. Cash is shown only by project/partner.
    if (
      !filters.line_item_id &&
      !filters.line_item_ids &&
      !filters.result_id &&
      !filters.project_year &&
      e.status === "posted"
    ) {
      if (
        e.kind === "income" &&
        (!filters.partner_id || e.partner_id === filters.partner_id)
      )
        received += cents(e.amount);
      if (e.kind === "transfer") {
        if (filters.partner_id === e.destination_partner_id)
          incoming += cents(e.amount);
        if (filters.partner_id === e.partner_id) outgoing += cents(e.amount);
      }
    }
  }
  const cashApplicable =
    !filters.line_item_id &&
    !filters.line_item_ids &&
    !filters.result_id &&
    !filters.project_year;
  return {
    planned,
    spent,
    committed,
    used: spent + committed,
    available: planned - spent - committed,
    received,
    incoming,
    outgoing,
    cash: cashApplicable ? received + incoming - outgoing - spent : null,
    freeCash: cashApplicable
      ? received + incoming - outgoing - spent - committed
      : null,
  };
}
export function accountBalances(data) {
  const balances = new Map(data.accounts.map((a) => [a.id, 0n]));
  const unassigned = new Map(data.partners.map((p) => [p.id, 0n]));
  const add = (account, partner, amount) =>
    account
      ? balances.set(account, (balances.get(account) ?? 0n) + amount)
      : unassigned.set(partner, (unassigned.get(partner) ?? 0n) + amount);
  for (const e of data.entries)
    if (e.status === "posted") {
      if (e.kind === "income") add(e.account_id, e.partner_id, cents(e.amount));
      if (e.kind === "expense")
        add(e.account_id, e.partner_id, -cents(e.amount));
      if (e.kind === "transfer") {
        add(e.account_id, e.partner_id, -cents(e.amount));
        add(
          e.destination_account_id,
          e.destination_partner_id,
          cents(e.amount),
        );
      }
    }
  return { balances, unassigned };
}
export function financeError(code, message = "") {
  if (code === "40001")
    return "I dati sono cambiati o il movimento è già registrato. Ricarica la pagina e verifica prima di riprovare.";
  if (code === "42501")
    return "Non puoi modificare questo progetto: verifica accesso e stato di archivio.";
  if (code === "23505")
    return "Codice, riferimento o nome già presente. Verifica il registro prima di riprovare.";
  if (code === "23503")
    return "Partner, conto, voce o risultato non appartengono al progetto o non sono più disponibili.";
  if (code === "23514" && !message.includes("constraint")) return message;
  if (["23514", "23502", "22P02", "22003", "22007", "22008"].includes(code))
    return "Verifica i campi obbligatori, gli importi, le date e i collegamenti del movimento.";
  return "Salvataggio non riuscito. Verifica il registro prima di riprovare.";
}

/** Revision snapshots own group labels; headers never become expense lines. */
export function financeHierarchy(lines) {
  const groups = new Map();
  for (const line of lines) {
    const key = line.macro_code
      ? `macro:${line.macro_code}`
      : `category:${line.category_name_snapshot}`;
    if (!groups.has(key))
      groups.set(key, {
        key,
        label: line.macro_code
          ? `${line.macro_code} · ${line.macro_name_snapshot}`
          : line.category_name_snapshot,
        categories: new Map(),
        lines: [],
      });
    const group = groups.get(key);
    group.lines.push(line);
    if (!group.categories.has(line.category_name_snapshot))
      group.categories.set(line.category_name_snapshot, []);
    group.categories.get(line.category_name_snapshot).push(line);
  }
  return [...groups.values()].sort((a, b) =>
    a.label.localeCompare(b.label, "it", { numeric: true }),
  );
}
