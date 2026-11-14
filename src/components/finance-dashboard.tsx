"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { FinancialData } from "@/lib/finance-data";
import type { Project } from "@/lib/project-data";
import {
  elapsedPercent,
  financialSummary,
  money,
  percent,
  projectYears,
  todayRome,
  dateLabel,
} from "@/lib/finance.mjs";

type Summary = ReturnType<typeof financialSummary>;
const pct = (value: number | null) =>
  value === null
    ? "—"
    : `${value.toLocaleString("it-IT", { maximumFractionDigits: 1 })}%`;
function AmountCell({
  value,
  emphasis = false,
}: {
  value: bigint | null;
  emphasis?: boolean;
}) {
  return (
    <td
      className={`finance-number${value !== null && value < 0n ? " finance-negative" : ""}${emphasis ? " finance-emphasis" : ""}`}
    >
      {money(value, "").trim()}
    </td>
  );
}
function Utilization({ summary }: { summary: Summary }) {
  const used = percent(summary.used, summary.planned),
    spent = percent(summary.spent, summary.planned);
  return (
    <div className="finance-utilization">
      <span>{pct(used)}</span>
      <div className="finance-mini-bar" aria-hidden="true">
        <i style={{ width: `${Math.min(100, spent ?? 0)}%` }} />
        <b
          style={{
            width: `${Math.min(100 - Math.min(100, spent ?? 0), percent(summary.committed, summary.planned) ?? 0)}%`,
          }}
        />
      </div>
    </div>
  );
}
export function FinanceDashboard({
  project,
  data,
}: {
  project: Project;
  data: FinancialData;
}) {
  const [view, setView] = useState("line_item_id");
  const [partner, setPartner] = useState(""),
    [result, setResult] = useState(""),
    [year, setYear] = useState("");
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(0);
  const current = data.revisions.find(
    (r) => r.id === data.state?.current_revision_id,
  );
  const lines = useMemo(() => {
    const codes = new Map(data.items.map((item) => [item.id, item.code]));
    return data.lines
      .filter((line) => line.revision_id === current?.id)
      .sort((a, b) =>
        (codes.get(a.line_item_id) ?? "").localeCompare(
          codes.get(b.line_item_id) ?? "",
          "it",
          { numeric: true },
        ),
      );
  }, [data.lines, data.items, current?.id]);
  const dates = current?.project_snapshot ?? project;
  const filters = useMemo(
    () => ({ partner_id: partner, result_id: result, project_year: year }),
    [partner, result, year],
  );
  const summary = useMemo(
    () => financialSummary(data, lines, filters, dates),
    [data, lines, filters, dates],
  );
  const global = useMemo(
    () => financialSummary(data, lines, {}, dates),
    [data, lines, dates],
  );
  const years = projectYears(dates.start_date, dates.end_date);
  const elapsed = elapsedPercent(project.start_date, project.end_date);
  const base = `/projects/${project.id}/piano-finanziario`;
  const filtered = !!(partner || result || year);
  const rows = useMemo(() => {
    let groups: { id: string; label: string; sub?: string }[];
    if (view === "line_item_id")
      groups = lines.map((l) => ({
        id: l.line_item_id,
        label: `${data.items.find((i) => i.id === l.line_item_id)?.code ?? ""} · ${l.description}`,
        sub: l.category_name_snapshot,
      }));
    else if (view === "partner_id")
      groups = [
        ...data.partners.map((p) => ({ id: p.id, label: p.label })),
        { id: "unassigned", label: "Da ripartire per partner" },
      ];
    else if (view === "result_id")
      groups = [
        ...data.results.map((r) => ({ id: r.id, label: r.label })),
        { id: "unassigned", label: "Non attribuito a un risultato" },
      ];
    else
      groups = [
        ...projectYears(dates.start_date, dates.end_date).map((y) => ({
          id: String(y.value),
          label: y.label,
          sub: `${dateLabel(y.start)} — ${dateLabel(y.end)}`,
        })),
        { id: "unassigned", label: "Non ripartito / fuori periodo" },
      ];
    const active = filters[view as keyof typeof filters];
    return groups
      .filter(
        (g) =>
          (!active || active === g.id) &&
          `${g.label} ${g.sub ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
      .map((g) => ({
        ...g,
        summary: financialSummary(
          data,
          lines,
          { ...filters, [view]: g.id },
          dates,
        ),
      }));
  }, [data, lines, view, filters, query, dates]);
  const pages = Math.max(1, Math.ceil(rows.length / 30)),
    safePage = Math.min(page, pages - 1);
  if (!current)
    return (
      <section className="finance-empty">
        <span className="finance-kicker">IL PUNTO DI PARTENZA</span>
        <h2>Costruisci il piano finanziario del progetto</h2>
        <p>
          Inserisci le voci approvate dal donatore e ripartiscile tra risultati,
          partner e anni. Dopo l’approvazione potrai registrare entrate,
          impegni, spese e trasferimenti.
        </p>
        <Link className="button-link primary" href={`${base}/piano`}>
          {data.revisions.some((r) => r.status === "draft")
            ? "Completa la bozza"
            : "Crea il primo piano"}
        </Link>
      </section>
    );
  return (
    <>
      <div className="finance-section-heading finance-overview-heading">
        <div>
          <h2>Situazione finanziaria</h2>
          <p>
            Piano corrente n. {current.revision_number} · {current.title} · Dati
            registrati al {dateLabel(todayRome())}
          </p>
        </div>
        <Link className="button-link" href={`${base}/piano`}>
          Consulta piano e versioni
        </Link>
      </div>
      <div
        className="finance-filters"
        aria-label="Filtri situazione finanziaria"
      >
        <label>
          Partner
          <select
            value={partner}
            onChange={(e) => {
              setPartner(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tutti i partner</option>
            {data.partners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            <option value="unassigned">Da ripartire</option>
          </select>
        </label>
        <label>
          Risultato
          <select
            value={result}
            onChange={(e) => {
              setResult(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Tutti i risultati</option>
            {data.results.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
            <option value="unassigned">Non attribuito</option>
          </select>
        </label>
        <label>
          Anno di progetto
          <select
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Intero progetto</option>
            {years.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
            <option value="unassigned">Non ripartito / fuori periodo</option>
          </select>
        </label>
        {filtered && (
          <button
            className="secondary"
            onClick={() => {
              setPartner("");
              setResult("");
              setYear("");
              setPage(0);
            }}
          >
            Azzera filtri
          </button>
        )}
      </div>
      <div
        className="finance-metrics"
        aria-label={filtered ? "Riepilogo filtrato" : "Riepilogo progetto"}
      >
        <Metric
          label="Previsto"
          value={summary.planned}
          currency={project.currency_code}
          detail={
            filtered ? "Quote della selezione" : "Piano corrente approvato"
          }
        />
        <Metric
          label="Ricevuto dal donatore"
          value={result || year ? null : summary.received}
          currency={project.currency_code}
          detail={
            result || year
              ? "Disponibile per progetto / partner"
              : `${pct(percent(summary.received, summary.planned))} del previsto`
          }
        />
        <Metric
          label="Speso"
          value={summary.spent}
          currency={project.currency_code}
          detail="Pagamenti effettivi"
          tone="spent"
        />
        <Metric
          label="Impegni da pagare"
          value={summary.committed}
          currency={project.currency_code}
          detail="Al netto dei pagamenti collegati"
          tone="committed"
        />
        <Metric
          label="Residuo del piano"
          value={summary.available}
          currency={project.currency_code}
          detail="Previsto − speso − impegni aperti"
          tone="available"
        />
      </div>
      <div className="finance-secondary-grid">
        <section className="finance-progress">
          <div className="finance-section-heading">
            <h3>Tempo e avanzamento finanziario</h3>
            <span className="finance-subtle">Intero progetto</span>
          </div>
          <Progress label="Tempo trascorso" value={elapsed} tone="time" />
          <Progress
            label="Speso"
            value={percent(global.spent, global.planned)}
            tone="spent"
          />
          <Progress
            label="Speso + impegni da pagare"
            value={percent(global.used, global.planned)}
            tone="committed"
          />
          <p className="finance-help">
            Il tempo è un riferimento lineare, non un obiettivo di spesa.{" "}
            {filtered
              ? "Questo confronto resta riferito all’intero progetto."
              : ""}
          </p>
        </section>
        <section className="finance-cash">
          <div className="finance-section-heading">
            <h3>Fondi disponibili</h3>
            <span className="finance-subtle">
              {partner ? "Partner selezionato" : "Intero progetto"}
            </span>
          </div>
          <div className="finance-cash-values">
            <div>
              <span>Saldo dei fondi ricevuti</span>
              <strong
                className={
                  summary.cash !== null && summary.cash < 0n
                    ? "finance-negative"
                    : ""
                }
              >
                {money(summary.cash, project.currency_code)}
              </strong>
            </div>
            <div>
              <span>Dopo gli impegni da pagare</span>
              <strong
                className={
                  summary.freeCash !== null && summary.freeCash < 0n
                    ? "finance-negative"
                    : ""
                }
              >
                {money(summary.freeCash, project.currency_code)}
              </strong>
            </div>
          </div>
          <p className="finance-help">
            {result || year
              ? "I fondi ricevuti non sono attribuiti a risultati o annualità: azzera questi filtri per consultarli."
              : partner
                ? `Entrate + trasferimenti ricevuti (${money(summary.incoming, project.currency_code)}) − trasferimenti inviati (${money(summary.outgoing, project.currency_code)}) − spese.`
                : "Entrate del donatore − spese. I trasferimenti interni si compensano. Sono saldi di progetto, non estratti conto bancari."}
          </p>
        </section>
      </div>
      {(summary.available < 0n ||
        (summary.freeCash !== null && summary.freeCash < 0n)) && (
        <p className="finance-alert">
          {summary.available < 0n
            ? "Spese e impegni superano il piano della selezione. "
            : ""}
          {summary.freeCash !== null && summary.freeCash < 0n
            ? "I fondi ricevuti non coprono tutte le spese e gli impegni aperti."
            : ""}
        </p>
      )}
      <section className="finance-ledger">
        <div className="finance-table-toolbar">
          <div className="finance-segmented" aria-label="Vista del riepilogo">
            {[
              ["line_item_id", "Per voce"],
              ["partner_id", "Per partner"],
              ["result_id", "Per risultato"],
              ["project_year", "Per anno"],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={view === key}
                onClick={() => {
                  setView(key);
                  setPage(0);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="finance-search">
            <span className="sr-only">Cerca nella tabella</span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Cerca nella tabella…"
            />
          </label>
        </div>
        <div
          className="finance-table-scroll"
          role="region"
          tabIndex={0}
          aria-label="Riepilogo finanziario"
        >
          <table className="finance-table">
            <caption>
              Importi in {project.currency_code} · Impegni aperti al netto dei
              pagamenti
            </caption>
            <thead>
              <tr>
                <th scope="col">
                  {view === "line_item_id"
                    ? "Voce di spesa"
                    : view === "partner_id"
                      ? "Partner"
                      : view === "result_id"
                        ? "Risultato"
                        : "Anno di progetto"}
                </th>
                <th scope="col" className="finance-number">
                  Previsto
                </th>
                <th scope="col" className="finance-number">
                  Speso
                </th>
                <th scope="col" className="finance-number">
                  Da pagare
                </th>
                <th scope="col" className="finance-number">
                  Residuo piano
                </th>
                <th scope="col" className="finance-number">
                  Utilizzo
                </th>
                {view === "partner_id" && !result && !year && (
                  <>
                    <th scope="col" className="finance-number">
                      Entrate donatore
                    </th>
                    <th scope="col" className="finance-number">
                      Saldo fondi
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.slice(safePage * 30, safePage * 30 + 30).map((row) => (
                <tr key={row.id}>
                  <th scope="row">
                    <span>{row.label}</span>
                    {row.sub && <small>{row.sub}</small>}
                  </th>
                  <AmountCell value={row.summary.planned} />
                  <AmountCell value={row.summary.spent} />
                  <AmountCell value={row.summary.committed} />
                  <AmountCell value={row.summary.available} emphasis />
                  <td>
                    <Utilization summary={row.summary} />
                  </td>
                  {view === "partner_id" && !result && !year && (
                    <>
                      <AmountCell value={row.summary.received} />
                      <AmountCell value={row.summary.cash} />
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!rows.length && (
            <p className="finance-empty-inline">
              Nessuna voce corrisponde ai filtri.
            </p>
          )}
        </div>
        <div className="finance-table-footer">
          <span>
            {rows.length} righe · Totale selezione:{" "}
            <strong>{money(summary.planned, project.currency_code)}</strong>
            {query && " · ricerca applicata solo alle righe"}
          </span>
          <div>
            <button
              className="secondary"
              disabled={safePage === 0}
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
      <p className="finance-help">
        Il piano per risultato usa le ripartizioni approvate; il consuntivo usa
        solo le attribuzioni esplicite dei movimenti. Gli impegni residui
        ricadono nell’anno dell’impegno, i pagamenti nell’anno di uscita. Le
        quote non assegnate restano visibili.
      </p>
    </>
  );
}
function Metric({
  label,
  value,
  currency,
  detail,
  tone = "",
}: {
  label: string;
  value: bigint | null;
  currency: string;
  detail: string;
  tone?: string;
}) {
  return (
    <div className={`finance-metric ${tone}`}>
      <span>{label}</span>
      <strong
        className={value !== null && value < 0n ? "finance-negative" : ""}
      >
        {money(value, currency)}
      </strong>
      <small>{detail}</small>
    </div>
  );
}
function Progress({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null;
  tone: string;
}) {
  return (
    <div className={`finance-progress-row ${tone}`}>
      <span>{label}</span>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={value === null ? undefined : Math.min(100, value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={pct(value)}
      >
        <i style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
      </div>
      <strong>{pct(value)}</strong>
    </div>
  );
}
