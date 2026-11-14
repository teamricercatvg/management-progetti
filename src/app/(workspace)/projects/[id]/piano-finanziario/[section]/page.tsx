import { FinancePlanTable } from "@/components/finance-plan-table";
import Link from "next/link";
import { randomUUID } from "node:crypto";
import { notFound } from "next/navigation";
import { getFinancePage } from "@/lib/finance-page";
import type { FinancialData, FinancialEntry } from "@/lib/finance-data";
import type { Project } from "@/lib/project-data";
import {
  accountBalances,
  cents,
  commitmentRemainders,
  dateLabel,
  decimalLabel,
  entryStates,
  money,
} from "@/lib/finance.mjs";
import {
  AccountForm,
  AllocationForm,
  EntryForm,
  EntryTransition,
  LineForm,
  RateForm,
  RevisionForm,
} from "@/components/finance-forms";
import { FinanceRegister } from "@/components/finance-register";
type Search = Record<string, string | string[] | undefined>;
export default async function FinancialSection({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; section: string }>;
  searchParams: Promise<Search>;
}) {
  const { id, section } = await params;
  if (
    ![
      "piano",
      "entrate",
      "impegni",
      "spese",
      "trasferimenti",
      "conti",
    ].includes(section)
  )
    notFound();
  const [{ project, data }, search] = await Promise.all([
    getFinancePage(id),
    searchParams,
  ]);
  if (section === "piano")
    return <Plan project={project} data={data} search={search} />;
  if (section === "conti")
    return <Accounts project={project} data={data} search={search} />;
  const kind = (
    {
      entrate: "income",
      impegni: "commitment",
      spese: "expense",
      trasferimenti: "transfer",
    } as const
  )[section as "entrate" | "impegni" | "spese" | "trasferimenti"];
  return (
    <Movements
      project={project}
      data={data}
      search={search}
      kind={kind}
      section={section}
    />
  );
}
function Plan({
  project,
  data,
  search,
}: {
  project: Project;
  data: FinancialData;
  search: Search;
}) {
  const base = `/projects/${project.id}/piano-finanziario/piano`,
    editable = project.status !== "archived";
  const draft = data.revisions.find((r) => r.status === "draft"),
    current = data.revisions.find(
      (r) => r.id === data.state?.current_revision_id,
    );
  const selected = search.revision
    ? data.revisions.find((r) => r.id === search.revision)
    : (draft ?? current);
  if (search.revision && !selected) notFound();
  const lines = data.lines
    .filter((l) => l.revision_id === selected?.id)
    .sort((a, b) =>
      (
        data.items.find((i) => i.id === a.line_item_id)?.code ?? ""
      ).localeCompare(
        data.items.find((i) => i.id === b.line_item_id)?.code ?? "",
        "it",
        { numeric: true },
      ),
    );
  const initial = data.lines.filter(
      (l) => l.revision_id === data.state?.initial_revision_id,
    ),
    total = lines.reduce((s, l) => s + cents(l.planned_amount), 0n);
  const isDraft = selected?.status === "draft" && editable;
  const editing = lines.find((l) => l.id === search.line),
    allocation = data.allocations.find(
      (a) => a.id === search.allocation && a.budget_line_id === editing?.id,
    );
  if ((search.line && !editing) || (search.allocation && !allocation))
    notFound();
  return (
    <>
      <div className="finance-section-heading">
        <div>
          <h2>Piano e ripartizioni</h2>
          <p>
            Voci per natura di spesa, versioni approvate e quote per risultato,
            partner e anno.
          </p>
        </div>
        {isDraft && (
          <Link
            className="button-link primary"
            href={`${base}?revision=${selected.id}&new=1#plan-editor`}
          >
            + Nuova voce
          </Link>
        )}
      </div>
      <section className="finance-version">
        <div className="finance-section-heading">
          <div>
            <span className={`finance-status ${selected?.status ?? "draft"}`}>
              {selected?.status === "approved" ? "Approvato" : "Bozza"}
            </span>
            <strong>
              {selected
                ? `Versione ${selected.revision_number} · ${selected.title}`
                : "Nessun piano inserito"}
            </strong>
          </div>
          <nav aria-label="Versioni del piano">
            {data.revisions.map((r) => (
              <Link
                key={r.id}
                href={`${base}?revision=${r.id}`}
                aria-current={r.id === selected?.id ? "page" : undefined}
              >
                V{r.revision_number}
                {r.status === "draft"
                  ? " · bozza"
                  : r.id === data.state?.current_revision_id
                    ? " · corrente"
                    : r.id === data.state?.initial_revision_id
                      ? " · iniziale"
                      : ""}
              </Link>
            ))}
          </nav>
        </div>
        {selected && (
          <p>
            {selected.reason}
            {selected.approved_at
              ? ` · Approvato il ${dateLabel(selected.approved_at)}`
              : ""}
          </p>
        )}
        {selected &&
          selected.id !== current?.id &&
          selected.status === "approved" && (
            <p className="finance-callout">
              Versione storica del piano. I movimenti e i saldi attuali sono
              consultabili nella situazione finanziaria.
            </p>
          )}
        {selected?.status === "draft" && (
          <p className="finance-callout">
            Questa bozza non modifica i saldi del piano approvato. Verifica voci
            e ripartizioni, poi approva la versione.
          </p>
        )}
        {editable && !draft && (
          <details open={!current}>
            <summary>
              {current
                ? "Crea una revisione dal piano corrente"
                : "Crea il primo piano"}
            </summary>
            <RevisionForm projectId={project.id} />
          </details>
        )}
        {isDraft && (
          <details>
            <summary>
              Approva la versione {selected.revision_number} ·{" "}
              {money(total, project.currency_code)}
            </summary>
            <RevisionForm projectId={project.id} draft={selected} />
          </details>
        )}
      </section>
      {isDraft && (search.new === "1" || editing) && (
        <section id="plan-editor" className="finance-editor">
          <div className="finance-section-heading">
            <h3>
              {editing
                ? `Modifica ${data.items.find((i) => i.id === editing.line_item_id)?.code}`
                : "Nuova voce del piano"}
            </h3>
            <Link href={`${base}?revision=${selected.id}`}>Chiudi</Link>
          </div>
          <LineForm
            key={editing?.id ?? "new"}
            projectId={project.id}
            draft={selected}
            line={editing}
            data={data}
          />
          {editing && (
            <>
              <div className="finance-divider" />
              <h3>Ripartizioni della voce</h3>
              <p className="finance-help">
                Inserisci una quota per ogni combinazione. Ad esempio: 3.000 EUR
                per Risultato 1 / Partner A / Anno 1 e 2.000 EUR per Risultato 1
                / Partner B / Anno 2.
              </p>
              <div className="finance-table-scroll">
                <table className="finance-table">
                  <thead>
                    <tr>
                      <th>Risultato</th>
                      <th>Partner</th>
                      <th>Anno</th>
                      <th className="finance-number">Importo</th>
                      <th>Modifica</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.allocations
                      .filter((a) => a.budget_line_id === editing.id)
                      .map((a) => (
                        <tr key={a.id}>
                          <td>
                            {data.results.find((r) => r.id === a.result_id)
                              ?.label ?? "Da attribuire"}
                          </td>
                          <td>
                            {data.partners.find((p) => p.id === a.partner_id)
                              ?.label ?? "Da attribuire"}
                          </td>
                          <td>
                            {a.project_year
                              ? `Anno ${a.project_year}`
                              : "Da attribuire"}
                          </td>
                          <td className="finance-number">
                            {money(a.amount, project.currency_code)}
                          </td>
                          <td>
                            <Link
                              href={`${base}?revision=${selected.id}&line=${editing.id}&allocation=${a.id}#allocation-editor`}
                            >
                              Modifica quota
                            </Link>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div id="allocation-editor">
                <h3>
                  {allocation
                    ? "Modifica quota (0 per rimuoverla)"
                    : "Aggiungi quota"}
                </h3>
                {allocation && (
                  <Link
                    href={`${base}?revision=${selected.id}&line=${editing.id}#allocation-editor`}
                  >
                    Aggiungi un’altra quota
                  </Link>
                )}
                <AllocationForm
                  key={allocation?.id ?? `new-${editing.id}`}
                  projectId={project.id}
                  draft={selected}
                  line={editing}
                  data={data}
                  allocation={allocation}
                  start={project.start_date}
                  end={project.end_date}
                />
              </div>
            </>
          )}
        </section>
      )}
      {selected && (
        <section className="finance-ledger">
          <div className="finance-table-toolbar">
            <h3>
              {lines.length} voci · {money(total, project.currency_code)}
            </h3>
            <span className="finance-help">
              Quote espresse nella valuta del progetto
            </span>
          </div>
          <div
            className="finance-table-scroll"
            role="region"
            aria-label="Voci del piano e ripartizioni"
            tabIndex={0}
          >
            <FinancePlanTable
              project={project}
              data={data}
              lines={lines}
              initial={initial}
              selected={selected}
              isDraft={!!isDraft}
              base={base}
            />
            {!lines.length && (
              <p className="finance-empty-inline">
                Aggiungi la prima voce del piano finanziario.
              </p>
            )}
          </div>
        </section>
      )}
    </>
  );
}
function Movements({
  project,
  data,
  search,
  kind,
  section,
}: {
  project: Project;
  data: FinancialData;
  search: Search;
  kind: FinancialEntry["kind"];
  section: string;
}) {
  const labels = {
    income: [
      "Entrate",
      "entrata",
      "Versamenti del donatore, con partner beneficiario e conto obbligatori.",
    ],
    commitment: [
      "Impegni di spesa",
      "impegno",
      "Ordini e contratti: l’importo ancora da pagare riduce il residuo disponibile.",
    ],
    expense: [
      "Spese",
      "spesa",
      "Pagamenti effettivi, collegati a un impegno oppure registrati come spese dirette.",
    ],
    transfer: [
      "Trasferimenti",
      "trasferimento",
      "Spostamenti di fondi tra partner o conti. Non incrementano le entrate complessive.",
    ],
  }[kind];
  const editable = project.status !== "archived",
    base = `/projects/${project.id}/piano-finanziario/${section}`;
  const entry = data.entries.find(
    (e) => e.id === search.entry && e.kind === kind,
  );
  if (search.entry && !entry) notFound();
  const remainders = commitmentRemainders(data.entries);
  const canCreate =
    editable &&
    !!data.state &&
    data.partners.length > 0 &&
    (kind !== "income" || data.accounts.some((a) => a.status === "active"));
  return (
    <>
      <div className="finance-section-heading">
        <div>
          <h2>{labels[0]}</h2>
          <p>{labels[2]}</p>
        </div>
        {canCreate && (
          <Link
            className="button-link primary"
            href={`${base}?new=1#movement-detail`}
          >
            + {kind === "income" || kind === "expense" ? "Nuova" : "Nuovo"}{" "}
            {labels[1]}
          </Link>
        )}
      </div>
      {!data.state && (
        <p className="finance-callout">
          Per registrare movimenti,{" "}
          <Link href={`/projects/${project.id}/piano-finanziario/piano`}>
            approva prima il piano finanziario
          </Link>
          .
        </p>
      )}
      {data.state && !data.partners.length && (
        <p className="finance-callout">
          Associa prima gli enti nella pagina del progetto.
        </p>
      )}
      {kind === "income" &&
        data.state &&
        !data.accounts.some((a) => a.status === "active") && (
          <p className="finance-callout">
            Per registrare un’entrata serve un{" "}
            <Link href={`/projects/${project.id}/piano-finanziario/conti`}>
              conto attivo del partner
            </Link>
            .
          </p>
        )}
      {((search.new === "1" && canCreate) || entry) && (
        <section className="finance-editor" id="movement-detail">
          <div className="finance-section-heading">
            <h3>
              {entry
                ? `${entry.reference} · ${entryStates[entry.status as keyof typeof entryStates]}`
                : `Inserisci ${labels[1]}`}
            </h3>
            <Link href={base}>Chiudi</Link>
          </div>
          {(!entry || entry.status === "draft") && canCreate ? (
            <EntryForm
              key={entry?.id ?? "new"}
              projectId={project.id}
              data={data}
              currency={project.currency_code}
              kind={kind}
              entry={entry}
              newId={randomUUID()}
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
              <details>
                <summary>
                  {entry.kind === "commitment" && entry.status === "confirmed"
                    ? "Chiudi o annulla impegno"
                    : "Annulla movimento"}
                </summary>
                <EntryTransition projectId={project.id} entry={entry} />
              </details>
            )}
        </section>
      )}
      <FinanceRegister
        projectId={project.id}
        data={data}
        kind={kind}
        currency={project.currency_code}
        start={project.start_date}
        end={project.end_date}
        readOnly={!editable}
      />
    </>
  );
}
function Accounts({
  project,
  data,
  search,
}: {
  project: Project;
  data: FinancialData;
  search: Search;
}) {
  const { balances, unassigned } = accountBalances(data),
    editable = project.status !== "archived",
    base = `/projects/${project.id}/piano-finanziario/conti`;
  const account = data.accounts.find((a) => a.id === search.account);
  if (search.account && !account) notFound();
  return (
    <>
      <div className="finance-section-heading">
        <div>
          <h2>Conti dei partner</h2>
          <p>
            Saldi dei soli movimenti di progetto, espressi in{" "}
            {project.currency_code}. Non rappresentano l’intero saldo bancario.
          </p>
        </div>
        {editable && data.partners.length > 0 && (
          <Link
            className="button-link primary"
            href={`${base}?new=1#account-editor`}
          >
            + Nuovo conto
          </Link>
        )}
      </div>
      {editable && (search.new === "1" || account) && (
        <section id="account-editor" className="finance-editor">
          <div className="finance-section-heading">
            <h3>{account ? "Modifica conto" : "Nuovo conto"}</h3>
            <Link href={base}>Chiudi</Link>
          </div>
          <AccountForm
            key={account?.id ?? "new"}
            projectId={project.id}
            data={data}
            account={account}
          />
        </section>
      )}
      {!data.partners.length && (
        <p className="finance-callout">
          Associa i partner nella{" "}
          <Link href={`/projects/${project.id}`}>pagina del progetto</Link> per
          aggiungere i conti.
        </p>
      )}
      <section className="finance-ledger">
        <div className="finance-table-scroll">
          <table className="finance-table">
            <caption>Conti e movimenti senza conto</caption>
            <thead>
              <tr>
                <th>Conto</th>
                <th>Partner</th>
                <th>Banca / riferimento</th>
                <th className="finance-number">Saldo progetto</th>
                <th>Stato</th>
                {editable && <th>Azioni</th>}
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((a) => (
                <tr key={a.id}>
                  <th scope="row">{a.name}</th>
                  <td>
                    {data.partners.find((p) => p.id === a.partner_id)?.label}
                  </td>
                  <td>
                    {a.bank_name ?? "—"}
                    <small>{a.account_reference}</small>
                  </td>
                  <td
                    className={`finance-number ${(balances.get(a.id) ?? 0n) < 0n ? "finance-negative" : ""}`}
                  >
                    {money(balances.get(a.id) ?? 0n, project.currency_code)}
                  </td>
                  <td>{a.status === "active" ? "Attivo" : "Archiviato"}</td>
                  {editable && (
                    <td>
                      <Link href={`${base}?account=${a.id}#account-editor`}>
                        Modifica
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
              {[...unassigned]
                .filter(([, amount]) => amount !== 0n)
                .map(([id, amount]) => (
                  <tr key={id}>
                    <th scope="row">Conto non indicato</th>
                    <td>{data.partners.find((p) => p.id === id)?.label}</td>
                    <td>Movimenti da riconciliare</td>
                    <td
                      className={`finance-number ${amount < 0n ? "finance-negative" : ""}`}
                    >
                      {money(amount, project.currency_code)}
                    </td>
                    <td>—</td>
                    {editable && <td />}
                  </tr>
                ))}
            </tbody>
          </table>
          {!data.accounts.length && (
            <p className="finance-empty-inline">Nessun conto registrato.</p>
          )}
        </div>
      </section>
      <section className="finance-version">
        <div className="finance-section-heading">
          <div>
            <h2>Cambi medi mensili</h2>
            <p>Le versioni utilizzate dalle spese restano immutabili.</p>
          </div>
        </div>
        {editable && (
          <details>
            <summary>Inserisci o correggi un cambio mensile</summary>
            <RateForm
              projectId={project.id}
              data={data}
              currency={project.currency_code}
            />
          </details>
        )}
        <div className="finance-table-scroll">
          <table className="finance-table">
            <caption>
              1 unità di valuta estera = tasso in {project.currency_code}
            </caption>
            <thead>
              <tr>
                <th>Valuta / mese</th>
                <th>Versione</th>
                <th className="finance-number">Tasso</th>
                <th>Fonte e metodo</th>
                <th>Rilevazione / motivo</th>
              </tr>
            </thead>
            <tbody>
              {data.rates.map((r) => (
                <tr key={r.id}>
                  <th scope="row">
                    {r.source_currency_code} · {r.rate_month.slice(0, 7)}
                  </th>
                  <td>V{r.version}</td>
                  <td className="finance-number">{decimalLabel(r.rate)}</td>
                  <td>
                    {r.source}
                    <small>{r.calculation_method}</small>
                    <small>{r.source_reference}</small>
                  </td>
                  <td>
                    {dateLabel(r.observed_at)}
                    <small>{r.reason}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.rates.length && (
            <p className="finance-empty-inline">
              Nessun cambio inserito. Le spese in {project.currency_code} non
              richiedono un cambio.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
