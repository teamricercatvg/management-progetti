"use client";
import { financialHistory } from "@/lib/finance-history.mjs";
import { ExpenseHistory } from "./expense-history";
import { UiIcon } from "./ui-icon";
import { FinanceMovementDetail } from "./finance-movement-detail";
import type { Project } from "@/lib/project-data";
import { useSearchParams } from "next/navigation";
import { Fragment, useMemo, useState } from "react";
import type { FinancialData, FinancialEntry } from "@/lib/finance-data";
import {
  cents,
  commitmentRemainders,
  dateLabel,
  decimalLabel,
  entryStates,
  money,
} from "@/lib/finance.mjs";
export function FinanceRegister({
  project, initialEntryId, creating, newId,
  projectId,
  data,
  kind,
  currency,
  start,
  end,
  readOnly,
}: {
  project: Project; initialEntryId?: string; creating: boolean; newId: string;
  projectId: string;
  data: FinancialData;
  kind: FinancialEntry["kind"];
  currency: string;
  start: string;
  end: string;
  readOnly: boolean;
}) {
  const searchParams = useSearchParams();
  const history = useMemo(() => financialHistory(data.entries.filter(e => e.kind === "expense")), [data.entries]);
  const visibleEntries: FinancialEntry[] = kind === "expense" ? history.current : data.entries;
  const requestedId = searchParams.get("entry");
  const selectedId = kind === "expense" && requestedId ? history.currentId(requestedId) : requestedId;
  const showHistory = kind === "expense" && (searchParams.get("history") === "1" || selectedId !== requestedId);
  function selectEntry(id?: string, historyOpen = false) {
    window.history.replaceState(null, "", id ? `${base}?entry=${id}${historyOpen ? "&history=1" : ""}#movement-detail` : base);
  }
  const [query, setQuery] = useState(""),
    [partner, setPartner] = useState(""),
    [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(() => Math.max(0, Math.floor(visibleEntries.filter(e => e.kind === kind).findIndex(e => e.id === (kind === "expense" && initialEntryId ? history.currentId(initialEntryId) : initialEntryId)) / 30)));
  const rows = useMemo(
    () =>
      visibleEntries.filter(
        (e) =>
          e.kind === kind &&
          (!partner ||
            e.partner_id === partner ||
            e.destination_partner_id === partner) &&
          (!status || e.status === status) &&
          (!from || e.entry_date >= from) &&
          (!to || e.entry_date <= to) &&
          `${e.reference} ${e.description}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [visibleEntries, kind, partner, status, from, to, query],
  );
  const remainder = commitmentRemainders(data.entries);
  const total = rows.reduce(
    (s, e) =>
      s +
      (e.status === "posted" ||
      e.status === "confirmed" ||
      e.status === "closed"
        ? cents(e.amount)
        : 0n),
    0n,
  );
  const pages = Math.max(1, Math.ceil(rows.length / 30)),
    safePage = Math.min(page, pages - 1);
  const base = `/projects/${projectId}/piano-finanziario/${{ income: "entrate", commitment: "impegni", expense: "spese", transfer: "trasferimenti" }[kind]}`;
  const names = new Map(data.partners.map((p) => [p.id, p.label]));
  const accounts = new Map(data.accounts.map((a) => [a.id, a.name]));
  const items = new Map(data.items.map((i) => [i.id, i.code]));
  return (
    <section className="finance-ledger finance-register">
      {creating && searchParams.get("new") === "1" && <FinanceMovementDetail project={project} data={data} kind={kind} newId={newId} onClose={() => selectEntry()} />}
      <div className="finance-register-filters">
        <label>
          Cerca
          <input
            type="search"
            value={query}
            placeholder="Riferimento o descrizione"
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          Partner
          <select
            value={partner}
            onChange={(e) => {
              setPartner(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tutti</option>
            {data.partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stato
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tutti</option>
            {(kind === "commitment"
              ? ["draft", "confirmed", "closed", "cancelled"]
              : ["draft", "posted", "voided", "cancelled"]
            ).map((s) => (
              <option key={s} value={s}>
                {entryStates[s as keyof typeof entryStates]}
                {s === "cancelled" && kind !== "commitment" ? " (bozza)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dal
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(0);
            }}
          />
        </label>
        <label>
          Al
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(0);
            }}
          />
        </label>
      </div>
      <div
        className="finance-table-scroll"
        role="region"
        aria-label="Registro movimenti"
        tabIndex={0}
      >
        <table className="finance-table">
          <caption>
            Registro {kind === "commitment" ? "impegni" : "movimenti"} · Importi
            in {currency}
          </caption>
          <thead>
            <tr>
              <th>Riferimento / descrizione</th>
              <th>Data</th>
              <th>Partner / conto</th>
              {kind === "transfer" ? (
                <th>Destinazione</th>
              ) : (
                kind !== "income" && <th>Voce / impegno</th>
              )}
              <th className="finance-number">Importo</th>
              {kind === "commitment" && (
                <>
                  <th className="finance-number">Pagato</th>
                  <th className="finance-number">Da pagare</th>
                </>
              )}
              <th>Stato</th>
              <th>
                <span className="sr-only">Dettaglio</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(safePage * 30, safePage * 30 + 30).map((e) => (
              <Fragment key={e.id}><tr>
                <th scope="row">
                  <button type="button" className="finance-row-link" aria-expanded={selectedId === e.id} onClick={() => selectEntry(selectedId === e.id ? undefined : e.id)}>
                    {e.reference}
                  </button>
                  <small>{e.description}</small>
                  {kind === "expense" && history.versions(e.id).length > 1 && <button type="button" className="secondary" title="Cronologia della spesa" aria-label={`Cronologia ${e.reference}`} aria-expanded={selectedId === e.id && showHistory} onClick={() => selectEntry(selectedId === e.id && showHistory ? undefined : e.id, true)}><UiIcon name="clock" /></button>}
                  {e.reminder_text && <span className={`finance-reminder-icon ${e.reminder_priority}`} title={e.reminder_text} role="img" aria-label={`Reminder ${e.reminder_priority === "red" ? "urgente" : e.reminder_priority === "orange" ? "da verificare" : "promemoria"}: ${e.reminder_text}`}>●</span>}
                </th>
                <td className="finance-date">
                  {dateLabel(e.entry_date)}
                  {(e.entry_date < start || e.entry_date > end) && (
                    <small className="finance-warning">
                      Fuori periodo progetto
                    </small>
                  )}
                </td>
                <td>
                  {names.get(e.partner_id)}
                  <small>
                    {accounts.get(e.account_id ?? "") ?? "Conto non indicato"}
                  </small>
                </td>
                {kind === "transfer" ? (
                  <td>
                    {names.get(e.destination_partner_id ?? "")}
                    <small>
                      {accounts.get(e.destination_account_id ?? "") ??
                        "Conto non indicato"}
                    </small>
                  </td>
                ) : (
                  kind !== "income" && (
                    <td>
                      {items.get(e.line_item_id ?? "")}
                      <small>
                        {e.commitment_id
                          ? data.entries.find((c) => c.id === e.commitment_id)
                              ?.reference
                          : kind === "expense"
                            ? "Spesa diretta"
                            : ""}
                      </small>
                    </td>
                  )
                )}
                <td className="finance-number">
                  {e.amount === null ? "Cambio non disponibile" : money(e.amount, currency)}
                  {e.original_currency_code !== currency && (
                    <small>
                      {decimalLabel(e.original_amount)}{" "}
                      {e.original_currency_code}
                    </small>
                  )}
                </td>
                {kind === "commitment" && (
                  <>
                    <td className="finance-number">
                      {money(remainder.get(e.id)?.paid ?? 0n, "").trim()}
                    </td>
                    <td className="finance-number">
                      {money(remainder.get(e.id)?.remaining ?? 0n, "").trim()}
                    </td>
                  </>
                )}
                <td>
                  <span className={`finance-status ${e.status}`}>
                    {entryStates[e.status as keyof typeof entryStates]}
                  </span>
                </td>
                <td>
                  <button type="button" className="finance-row-link" aria-expanded={selectedId === e.id} onClick={() => selectEntry(selectedId === e.id ? undefined : e.id)}>
                    {e.status === "draft" && !readOnly
                      ? "Modifica"
                      : "Dettagli"}
                  </button>
                </td>
              </tr>
              {selectedId === e.id && <tr className="finance-detail-row"><td colSpan={kind === "commitment" ? 9 : kind === "income" ? 6 : 7}>
                <>{showHistory ? <ExpenseHistory project={project} data={data} versions={history.versions(e.id)} selectedId={requestedId} onClose={() => selectEntry()} /> : <FinanceMovementDetail key={e.id} project={project} data={data} kind={kind} entry={e} newId={newId} onClose={() => selectEntry()} />}</>
              </td></tr>}
              </Fragment>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <div className="finance-empty-inline">
            Nessun movimento{" "}
            {query || partner || status || from || to
              ? "corrisponde ai filtri."
              : "inserito."}
          </div>
        )}
      </div>
      <div className="finance-table-footer">
        <span>
          {rows.length} movimenti ·{" "}
          {kind === "commitment"
            ? "Importi confermati e chiusi"
            : "Totale registrato"}
          : <strong>{money(total, currency)}</strong>
        </span>
        <div>
          <button
            className="secondary"
            disabled={!safePage}
            onClick={() => setPage(safePage - 1)}
          >
            ← Precedenti
          </button>
          <span>
            {safePage + 1} / {pages}
          </span>
          <button
            className="secondary"
            disabled={safePage >= pages - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Successive →
          </button>
        </div>
      </div>
    </section>
  );
}
