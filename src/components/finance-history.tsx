"use client";
import { useState } from "react";
import type { FinancialData, FinancialEntry } from "@/lib/finance-data";
import type { Project } from "@/lib/project-data";
import { FinanceMovementDetail } from "./finance-movement-detail";
import { dateLabel, money } from "@/lib/finance.mjs";
export function FinanceHistory({ project, data, groups, selectedId, onClose }: {
  project: Project; data: FinancialData; groups: FinancialEntry[][];
  selectedId: string | null; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = groups.filter(versions => versions.some(e => `${e.reference} ${e.description}`.toLowerCase().includes(query.toLowerCase())));
  return <section className="finance-editor" id="movement-detail" aria-label="Cronologia del registro">
    <div className="finance-section-heading"><h3>Cronologia del registro</h3>
      <button type="button" className="secondary" onClick={onClose}>Chiudi cronologia</button>
    </div>
    <p>Le versioni precedenti sono conservate in sola lettura e non concorrono ai totali. La cronologia comprende tutti i movimenti corretti di questa sezione.</p>
    <label>Cerca nella cronologia<input type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Riferimento o descrizione, anche precedenti" /></label>
    {!filtered.length && <p>{groups.length ? "Nessuna versione corrisponde alla ricerca." : "Nessuna versione precedente in questo registro."}</p>}
    {filtered.map(versions => <section key={versions[0].id}>
    <h4>Versione corrente: {versions[0].reference}</h4>
    {versions.slice(1).map((entry, index) => <details key={entry.id} open={selectedId === entry.id || undefined}>
      <summary>Versione {versions.length - index - 1} · {entry.reference} · {dateLabel(entry.entry_date)} · {money(entry.amount, project.currency_code)}</summary>
      <FinanceMovementDetail project={{...project, status:"archived"}} data={data} kind={entry.kind} entry={entry} newId={entry.id} detailId={`history-${entry.id}`} onClose={onClose} />
    </details>)}
    </section>)}
  </section>;
}
