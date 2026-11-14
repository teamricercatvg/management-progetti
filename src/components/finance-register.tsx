"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
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
  projectId,
  data,
  kind,
  currency,
  start,
  end,
  readOnly,
}: {
  projectId: string;
  data: FinancialData;
  kind: FinancialEntry["kind"];
  currency: string;
  start: string;
  end: string;
  readOnly: boolean;
}) {
  const [query, setQuery] = useState(""),
    [partner, setPartner] = useState(""),
    [status, setStatus] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [page, setPage] = useState(0);
  const rows = useMemo(
    () =>
      data.entries.filter(
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
    [data.entries, kind, partner, status, from, to, query],
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
    <section className="finance-ledger">
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
              <tr key={e.id}>
                <th scope="row">
                  <Link href={`${base}?entry=${e.id}#movement-detail`}>
                    {e.reference}
                  </Link>
                  <small>{e.description}</small>
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
                  {money(e.amount, "").trim()}
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
                  <Link href={`${base}?entry=${e.id}#movement-detail`}>
                    {e.status === "draft" && !readOnly
                      ? "Modifica"
                      : "Dettagli"}
                  </Link>
                </td>
              </tr>
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
