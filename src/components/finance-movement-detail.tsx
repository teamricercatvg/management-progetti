"use client";
import { UiIcon } from "./ui-icon";
import { useState } from "react";
import Link from "next/link";
import type { FinancialData, FinancialEntry } from "@/lib/finance-data";
import type { Project } from "@/lib/project-data";
import { commitmentRemainders, dateLabel, decimalLabel, entryStates, money } from "@/lib/finance.mjs";
import { EntryForm, EntryTransition, ExpenseReminderForm } from "@/components/finance-forms";
export function FinanceMovementDetail({ project, data, kind, entry, newId, onClose }: {
 project: Project; data: FinancialData; kind: FinancialEntry["kind"]; entry?: FinancialEntry; newId: string; onClose: () => void;
}) {
 const [editing, setEditing] = useState(false);
 const [deleting, setDeleting] = useState(false);
 const editable = project.status !== "archived";
 const canCreate = editable;
 const labels = ["", {income:"entrata",commitment:"impegno",expense:"spesa",transfer:"trasferimento"}[kind]];
 const remainders = commitmentRemainders(data.entries);
 return (
        <section className="finance-editor" id="movement-detail">
          <div className="finance-section-heading">
            <h3>
              {entry
                ? `${entry.reference} · ${entryStates[entry.status as keyof typeof entryStates]}`
                : `Inserisci ${labels[1]}`}
            </h3>
            <div className="finance-buttons">
            {entry && editable && ["draft", "posted", "confirmed"].includes(entry.status) && <>
             <button type="button" className="secondary" title="Modifica movimento" aria-label="Modifica movimento" onClick={() => setEditing(!editing)}><UiIcon name="edit" /></button>
             <button type="button" className="secondary" title="Elimina senza cancellare lo storico" aria-label="Elimina movimento" onClick={() => setDeleting(!deleting)}><UiIcon name="trash" /></button>
            </>}
            <button type="button" className="secondary" onClick={onClose}>Chiudi</button></div>
          </div>
          {entry?.kind === "commitment" && (remainders.get(entry.id)?.paid ?? 0n) > 0n && <p className="finance-help">Questo impegno ha pagamenti collegati: per correggerlo o annullarlo occorre prima gestire quei pagamenti. Puoi chiuderlo per liberare il residuo.</p>}
          {(!entry || entry.status === "draft" || editing) && canCreate ? (
            <EntryForm
              key={entry?.id ?? "new"}
              projectId={project.id}
              data={data}
              currency={project.currency_code}
              kind={kind}
              entry={entry}
              newId={newId}
            />
          ) : (
            entry && (
              <>
                <dl className="finance-details">
                  <div>
                    <dt>Descrizione</dt>
                    <dd>{entry.description}</dd>
                  </div>
                  <div>
                    <dt>Data</dt>
                    <dd>{dateLabel(entry.entry_date)}</dd>
                  </div>
                  <div>
                    <dt>Partner</dt>
                    <dd>
                      {
                        data.partners.find((p) => p.id === entry.partner_id)
                          ?.label
                      }
                    </dd>
                  </div>
                  <div>
                    <dt>Conto</dt>
                    <dd>
                      {data.accounts.find((a) => a.id === entry.account_id)
                        ?.name ?? "Non indicato"}
                    </dd>
                  </div>
                  {entry.line_item_id && (
                    <div>
                      <dt>Voce</dt>
                      <dd>
                        {
                          data.items.find((i) => i.id === entry.line_item_id)
                            ?.code
                        }{" "}
                        ·{" "}
                        {
                          data.lines.find(
                            (l) =>
                              l.revision_id ===
                                data.state?.current_revision_id &&
                              l.line_item_id === entry.line_item_id,
                          )?.description
                        }
                      </dd>
                    </div>
                  )}
                  {entry.result_id && (
                    <div>
                      <dt>Risultato</dt>
                      <dd>
                        {
                          data.results.find((r) => r.id === entry.result_id)
                            ?.label
                        }
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt>Importo {project.currency_code}</dt>
                    <dd>{money(entry.amount, project.currency_code)}</dd>
                  </div>
                  {entry.original_currency_code !== project.currency_code && (
                    <>
                      <div>
                        <dt>Importo originale</dt>
                        <dd>
                          {decimalLabel(entry.original_amount)}{" "}
                          {entry.original_currency_code}
                        </dd>
                      </div>
                      <div>
                        <dt>Cambio applicato</dt>
                        <dd>
                          {entry.applied_rate ?? "Non disponibile"} · versione{" "}
                          {data.rates.find(
                            (r) => r.id === entry.exchange_rate_id,
                          )?.version ?? "—"}
                        </dd>
                      </div>
                    </>
                  )}
                  {entry.commitment_id && (
                    <div>
                      <dt>Impegno collegato</dt>
                      <dd>
                        <Link
                          href={`/projects/${project.id}/piano-finanziario/impegni?entry=${entry.commitment_id}#movement-detail`}
                        >
                          {
                            data.entries.find(
                              (e) => e.id === entry.commitment_id,
                            )?.reference
                          }
                        </Link>
                      </dd>
                    </div>
                  )}
                  {entry.destination_partner_id && (
                    <div>
                      <dt>Destinatario / conto</dt>
                      <dd>
                        {
                          data.partners.find(
                            (p) => p.id === entry.destination_partner_id,
                          )?.label
                        }{" "}
                        /{" "}
                        {data.accounts.find(
                          (a) => a.id === entry.destination_account_id,
                        )?.name ?? "Conto non indicato"}
                      </dd>
                    </div>
                  )}
                  {entry.kind === "commitment" && (
                    <>
                      <div>
                        <dt>Pagamenti collegati</dt>
                        <dd>
                          {money(
                            remainders.get(entry.id)?.paid ?? 0n,
                            project.currency_code,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Impegno residuo</dt>
                        <dd>
                          {money(
                            remainders.get(entry.id)?.remaining ?? 0n,
                            project.currency_code,
                          )}
                        </dd>
                      </div>
                    </>
                  )}
                  <div>
                    <dt>Note</dt>
                    <dd>{entry.notes ?? "—"}</dd>
                  </div>
                  {entry.void_reason && (
                    <div>
                      <dt>Motivo chiusura / annullamento</dt>
                      <dd>{entry.void_reason}</dd>
                    </div>
                  )}
                </dl>
              </>
            )
          )}
          {entry &&
            editable &&
            ["draft", "confirmed", "posted"].includes(entry.status) && (
              <details open={deleting} onToggle={e => setDeleting(e.currentTarget.open)}>
                <summary>
                  {entry.kind === "commitment" && entry.status === "confirmed"
                    ? "Chiudi o annulla impegno"
                    : "Annulla movimento"}
                </summary>
                <EntryTransition projectId={project.id} entry={entry} />
              </details>
            )}
          {entry?.correction_of_id && <p>Correzione di {data.entries.find(e => e.id === entry.correction_of_id)?.reference ?? entry.correction_of_id}</p>}
          {entry && data.entries.some(e => e.correction_of_id === entry.id) && <p>Sostituito da {data.entries.find(e => e.correction_of_id === entry.id)?.reference}</p>}
          {entry?.kind === "expense" && <section className="finance-reminder"><h4>Reminder rendiconto</h4>
            {editable ? <ExpenseReminderForm projectId={project.id} entry={entry} /> : <p>{entry.reminder_text ?? "Nessun reminder"}</p>}
          </section>}
        </section>

 );
}
