"use client";
import type { FinancialData, FinancialEntry } from "@/lib/finance-data";
import type { Project } from "@/lib/project-data";
import { FinanceMovementDetail } from "./finance-movement-detail";
import { dateLabel, money } from "@/lib/finance.mjs";
export function ExpenseHistory({ project, data, versions, selectedId, onClose }: {
  project: Project; data: FinancialData; versions: FinancialEntry[];
  selectedId: string | null; onClose: () => void;
}) {
  return <section className="finance-editor" id="movement-detail" aria-label="Cronologia della spesa">
    <div className="finance-section-heading"><h3>Cronologia della spesa</h3>
      <button type="button" className="secondary" onClick={onClose}>Chiudi cronologia</button>
    </div>
    <p>Versione corrente: <strong>{versions[0]?.reference}</strong>. Le versioni precedenti sono conservate in sola lettura e non concorrono ai totali.</p>
    {versions.slice(1).map((entry, index) => <details key={entry.id} open={selectedId === entry.id || undefined}>
      <summary>Versione {versions.length - index - 1} · {entry.reference} · {dateLabel(entry.entry_date)} · {money(entry.amount, project.currency_code)}</summary>
      <FinanceMovementDetail project={{...project, status:"archived"}} data={data} kind="expense" entry={entry} newId={entry.id} detailId={`history-${entry.id}`} onClose={onClose} />
    </details>)}
  </section>;
}
