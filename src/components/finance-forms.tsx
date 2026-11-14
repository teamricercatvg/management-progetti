"use client";
import { useState, useTransition, type ReactNode, type FormEvent } from "react";
import {
  financeAction,
  type FinanceActionState,
} from "@/app/(workspace)/projects/[id]/piano-finanziario/actions";
import type {
  Allocation,
  BankAccount,
  FinancialData,
  FinancialEntry,
  FinancialLine,
  FinancialRevision,
} from "@/lib/finance-data";
import {
  commitmentRemainders,
  dateLabel,
  money,
  projectYears,
  todayRome,
} from "@/lib/finance.mjs";

export function FinanceForm({
  projectId,
  command,
  children,
  onSuccess,
  className = "",
}: {
  projectId: string;
  command: string;
  children: ReactNode;
  onSuccess?: () => void;
  className?: string;
}) {
  const [state, setState] = useState<FinanceActionState>({ message: "" });
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(
      event.currentTarget,
      (event.nativeEvent as SubmitEvent).submitter,
    );
    startTransition(async () => {
      try {
        const result = await financeAction(projectId, command, state, values);
        setState(result);
        if (result.ok) onSuccess?.();
      } catch {
        setState({
          message:
            "Connessione interrotta. Verifica il registro prima di riprovare.",
        });
      }
    });
  }
  return (
    <form onSubmit={submit} className={`finance-form ${className}`}>
      <fieldset disabled={pending}>{children}</fieldset>
      {pending && <p role="status">Salvataggio in corso…</p>}
      {state.message && (
        <p
          role={state.ok ? "status" : "alert"}
          className={state.ok ? "finance-success" : "finance-error"}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
export function Hidden({
  name,
  value,
}: {
  name: string;
  value: string | number | null | undefined;
}) {
  return <input type="hidden" name={name} value={value ?? ""} />;
}
function Amount({
  name = "amount",
  label = "Importo",
  value,
  min = "0.01",
  step = "0.01",
}: {
  name?: string;
  label?: string;
  value?: number | string | null;
  min?: string;
  step?: string;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        inputMode="decimal"
        type="number"
        min={min}
        max="999999999999.99"
        step={step}
        required
        defaultValue={value ?? ""}
      />
    </label>
  );
}
export function RevisionForm({
  projectId,
  draft,
}: {
  projectId: string;
  draft?: FinancialRevision;
}) {
  return (
    <FinanceForm
      projectId={projectId}
      command={draft ? "publish" : "create_revision"}
    >
      <Hidden name="revision_id" value={draft?.id} />
      <Hidden name="row_version" value={draft?.row_version} />
      <div className="finance-fields">
        <label>
          Titolo della versione
          <input
            name="title"
            required
            maxLength={240}
            defaultValue={draft?.title ?? "Piano finanziario approvato"}
          />
        </label>
        <label>
          Motivazione / riferimento approvazione
          <input
            name="reason"
            required
            maxLength={4000}
            defaultValue={draft?.reason}
          />
        </label>
      </div>
      {draft && (
        <p className="finance-help">
          L’approvazione rende immutabili importi e ripartizioni. Per ulteriori
          modifiche si crea una nuova revisione. Eventuali riduzioni rispetto a
          impegni e spese vanno motivate qui.
        </p>
      )}
      <button type="submit">
        {draft ? "Approva questa versione" : "Crea bozza del piano"}
      </button>
    </FinanceForm>
  );
}
export function LineForm({
  projectId,
  draft,
  line,
  data,
}: {
  projectId: string;
  draft: FinancialRevision;
  line?: FinancialLine;
  data: FinancialData;
}) {
  const category = data.categories.find((c) => c.id === line?.category_id);
  const code = data.items.find((i) => i.id === line?.line_item_id)?.code;
  return (
    <FinanceForm projectId={projectId} command="save_line">
      <Hidden name="revision_id" value={draft.id} />
      <Hidden name="row_version" value={draft.row_version} />
      <Hidden name="line_item_id" value={line?.line_item_id} />
      <div className="finance-fields">
        <label>
          Codice macrovoce (opzionale)
          <input
            name="macro_code"
            maxLength={40}
            defaultValue={line?.macro_code ?? ""}
            placeholder="1"
          />
        </label>
        <label>
          Nome macrovoce (opzionale)
          <input
            name="macro_name"
            maxLength={160}
            defaultValue={line?.macro_name_snapshot ?? ""}
            placeholder="Risorse umane per gestione e supporto generale"
          />
        </label>
      </div>
      <p className="finance-help">
        Macrovoce → categoria → voce. I totali si calcolano dalle sole voci. La
        macrovoce si applica a tutte le voci della categoria nella bozza.
      </p>
      <div className="finance-fields three">
        <label>
          Codice voce
          <input
            name="code"
            required
            maxLength={40}
            defaultValue={code}
            readOnly={!!line}
            placeholder="A.1"
          />
        </label>
        <label>
          Codice categoria
          <input
            name="category_code"
            required
            maxLength={40}
            defaultValue={category?.code}
            list="finance-categories"
            placeholder="A"
          />
          <datalist id="finance-categories">
            {data.categories.map((c) => (
              <option key={c.id} value={c.code}>
                {c.name}
              </option>
            ))}
          </datalist>
        </label>
        <label>
          Nome categoria
          <input
            name="category_name"
            required
            maxLength={160}
            defaultValue={category?.name}
            placeholder="Risorse umane"
          />
        </label>
      </div>
      <div className="finance-fields">
        <label>
          Descrizione voce
          <input
            name="description"
            required
            maxLength={500}
            defaultValue={line?.description}
          />
        </label>
        <Amount
          name="planned_amount"
          label="Importo previsto"
          value={line?.planned_amount}
          min="0"
        />
      </div>
      <label>
        Note
        <input name="notes" maxLength={4000} defaultValue={line?.notes ?? ""} />
      </label>
      <div className="finance-form-footer">
        <span className="finance-help">
          Una voce soppressa resta nel piano con importo zero, dopo aver
          azzerato le ripartizioni.
        </span>
        <button type="submit">Salva voce</button>
      </div>
    </FinanceForm>
  );
}
export function AllocationForm({
  projectId,
  draft,
  line,
  data,
  allocation,
  start,
  end,
}: {
  projectId: string;
  draft: FinancialRevision;
  line: FinancialLine;
  data: FinancialData;
  allocation?: Allocation;
  start: string;
  end: string;
}) {
  const fixed = !!allocation;
  return (
    <FinanceForm projectId={projectId} command="save_allocation">
      <Hidden name="revision_id" value={draft.id} />
      <Hidden name="row_version" value={draft.row_version} />
      <Hidden name="budget_line_id" value={line.id} />
      <div className="finance-fields four">
        <label>
          Risultato
          <select
            name="result_id"
            defaultValue={allocation?.result_id ?? ""}
            aria-readonly={fixed}
          >
            {!fixed && <option value="">Da attribuire</option>}
            {data.results
              .filter(
                (r) => r.status === "active" || r.id === allocation?.result_id,
              )
              .filter((r) => !fixed || r.id === allocation?.result_id)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            {fixed && !allocation.result_id && (
              <option value="">Da attribuire</option>
            )}
          </select>
        </label>
        <label>
          Partner
          <select
            name="partner_id"
            defaultValue={allocation?.partner_id ?? ""}
            aria-readonly={fixed}
          >
            {!fixed && <option value="">Da attribuire</option>}
            {data.partners
              .filter((p) => !fixed || p.id === allocation?.partner_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            {fixed && !allocation.partner_id && (
              <option value="">Da attribuire</option>
            )}
          </select>
        </label>
        <label>
          Anno di progetto
          <select
            name="project_year"
            defaultValue={allocation?.project_year ?? ""}
            aria-readonly={fixed}
          >
            {!fixed && <option value="">Da attribuire</option>}
            {projectYears(start, end)
              .filter((y) => !fixed || y.value === allocation?.project_year)
              .map((y) => (
                <option key={y.value} value={y.value}>
                  {y.label} · {dateLabel(y.start)} – {dateLabel(y.end)}
                </option>
              ))}
            {fixed && !allocation.project_year && (
              <option value="">Da attribuire</option>
            )}
            {fixed &&
              allocation.project_year &&
              !projectYears(start, end).some(
                (y) => y.value === allocation.project_year,
              ) && (
                <option value={allocation.project_year}>
                  Anno {allocation.project_year} · fuori dalla durata attuale
                </option>
              )}
          </select>
        </label>
        <Amount
          label="Importo della quota"
          value={allocation?.amount}
          min="0"
        />
      </div>
      <div className="finance-form-footer">
        <span className="finance-help">
          Ogni quota combina i tre criteri. La somma delle quote non può
          superare il totale della voce. Importo 0 rimuove la quota.
        </span>
        <button type="submit">
          {fixed ? "Aggiorna quota" : "Salva quota"}
        </button>
      </div>
    </FinanceForm>
  );
}
export function AccountForm({
  projectId,
  data,
  account,
}: {
  projectId: string;
  data: FinancialData;
  account?: BankAccount;
}) {
  return (
    <FinanceForm projectId={projectId} command="save_account">
      <Hidden name="id" value={account?.id} />
      <Hidden name="row_version" value={account?.row_version} />
      <div className="finance-fields three">
        <label>
          Partner del conto
          <select
            name="partner_id"
            required
            defaultValue={account?.partner_id ?? ""}
          >
            <option value="">Seleziona partner</option>
            {data.partners
              .filter((p) => !account || p.id === account.partner_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
          </select>
        </label>
        <label>
          Nome del conto
          <input
            name="name"
            maxLength={160}
            required
            defaultValue={account?.name}
            placeholder="Conto progetto"
          />
        </label>
        <label>
          Banca
          <input
            name="bank_name"
            maxLength={160}
            defaultValue={account?.bank_name ?? ""}
          />
        </label>
      </div>
      <div className="finance-fields">
        <label>
          Riferimento conto / IBAN (opzionale)
          <input
            name="account_reference"
            maxLength={100}
            defaultValue={account?.account_reference ?? ""}
          />
        </label>
        {account && (
          <label>
            Stato
            <select name="status" defaultValue={account.status}>
              <option value="active">Attivo</option>
              <option value="archived">Archiviato</option>
            </select>
          </label>
        )}
      </div>
      <button type="submit">Salva conto</button>
    </FinanceForm>
  );
}
export function RateForm({
  projectId,
  data,
  currency,
}: {
  projectId: string;
  data: FinancialData;
  currency: string;
}) {
  const [source, setSource] = useState("USD");
  const [month, setMonth] = useState(todayRome().slice(0, 7));
  const current = data.rates.find(
    (r) => r.source_currency_code === source && r.rate_month === `${month}-01`,
  );
  return (
    <FinanceForm projectId={projectId} command="save_rate">
      <Hidden name="row_version" value={current?.version ?? 0} />
      <Hidden name="rate_month" value={`${month}-01`} />
      <p className="finance-help">
        1 unità di valuta estera = cambio × {currency}. La nuova versione si
        applica ai prossimi pagamenti, senza riscrivere quelli registrati.
      </p>
      <div className="finance-fields four">
        <label>
          Valuta estera
          <input
            name="source_currency_code"
            required
            pattern="[A-Z]{3}"
            maxLength={3}
            value={source}
            onChange={(e) => setSource(e.target.value.toUpperCase())}
          />
        </label>
        <label>
          Mese
          <input
            type="month"
            required
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </label>
        <Amount
          name="rate"
          label={`Cambio medio in ${currency}`}
          step="0.000000000001"
          min="0.000000000001"
        />
        <label>
          Data rilevazione
          <input
            name="observed_at"
            type="date"
            required
            defaultValue={todayRome()}
          />
        </label>
      </div>
      <div className="finance-fields">
        <label>
          Fonte
          <input
            name="source"
            maxLength={500}
            required
            placeholder="Ente o pubblicazione di riferimento"
          />
        </label>
        <label>
          Metodo di calcolo
          <input
            name="calculation_method"
            maxLength={1000}
            required
            placeholder="Media mensile delle osservazioni"
          />
        </label>
      </div>
      <label>
        Riferimento della fonte
        <input
          name="source_reference"
          maxLength={1000}
          placeholder="Documento o URL"
        />
      </label>
      <label>
        Motivazione{" "}
        {current ? "(obbligatoria per correggere il cambio)" : "(opzionale)"}
        <input name="reason" maxLength={4000} required={!!current} />
      </label>
      <button type="submit">
        Salva {current ? `versione ${current.version + 1} del` : "nuovo"} cambio
      </button>
    </FinanceForm>
  );
}
export function EntryForm({
  projectId,
  data,
  currency,
  kind,
  entry,
  newId,
}: {
  projectId: string;
  data: FinancialData;
  currency: string;
  kind: FinancialEntry["kind"];
  entry?: FinancialEntry;
  newId: string;
}) {
  const [partner, setPartner] = useState(entry?.partner_id ?? "");
  const [destination, setDestination] = useState(
    entry?.destination_partner_id ?? "",
  );
  const [commitment, setCommitment] = useState(entry?.commitment_id ?? "");
  const [saved, setSaved] = useState(false);
  const [originalCurrency, setOriginalCurrency] = useState(
    entry?.original_currency_code ?? currency,
  );
  const linked = data.entries.find((e) => e.id === commitment);
  const currentLines = data.lines.filter(
    (l) => l.revision_id === data.state?.current_revision_id,
  );
  const remainders = commitmentRemainders(data.entries);
  const cost = kind === "commitment" || kind === "expense";
  const title = {
    income: "entrata",
    commitment: "impegno",
    expense: "spesa",
    transfer: "trasferimento",
  }[kind];
  if (saved)
    return (
      <div className="finance-success" role="status">
        {title[0].toUpperCase() + title.slice(1)} salvato. Il registro è
        aggiornato.{" "}
        <a
          href={`/projects/${projectId}/piano-finanziario/${{ income: "entrate", commitment: "impegni", expense: "spese", transfer: "trasferimenti" }[kind]}?new=1`}
        >
          Inserisci un altro movimento
        </a>
      </div>
    );
  return (
    <FinanceForm
      projectId={projectId}
      command="save_entry"
      onSuccess={() => setSaved(true)}
    >
      <Hidden name="id" value={entry?.id ?? newId} />
      <Hidden name="row_version" value={entry?.row_version} />
      <Hidden name="kind" value={kind} />
      {kind === "expense" && (
        <label>
          Collegamento a un impegno
          <select
            name="commitment_id"
            value={commitment}
            onChange={(e) => {
              setCommitment(e.target.value);
              const c = data.entries.find((x) => x.id === e.target.value);
              if (c) setPartner(c.partner_id);
            }}
          >
            <option value="">Spesa diretta, senza impegno</option>
            {data.entries
              .filter(
                (e) => e.kind === "commitment" && e.status === "confirmed",
              )
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.reference} · {e.description} · residuo{" "}
                  {money(remainders.get(e.id)?.remaining ?? 0n, currency)}
                </option>
              ))}
          </select>
        </label>
      )}
      {linked && (
        <p className="finance-callout">
          Il pagamento riduce il residuo di questo impegno. Voce, partner e
          risultato sono ripresi dal contratto.
        </p>
      )}
      <div className="finance-fields three">
        <label>
          Riferimento
          <input
            name="reference"
            required
            maxLength={100}
            defaultValue={entry?.reference}
            placeholder="Es. CONTR-2026-01"
          />
        </label>
        <label>
          Data{" "}
          {kind === "income"
            ? "accredito"
            : kind === "expense"
              ? "pagamento"
              : kind === "transfer"
                ? "trasferimento"
                : "impegno"}
          <input
            name="entry_date"
            required
            type="date"
            defaultValue={entry?.entry_date ?? todayRome()}
          />
        </label>
        <label>
          {kind === "transfer" ? "Partner mittente" : "Partner"}
          <select
            name="partner_id"
            required
            value={linked?.partner_id ?? partner}
            onChange={(e) => setPartner(e.target.value)}
          >
            {!linked && <option value="">Seleziona partner</option>}
            {data.partners
              .filter((p) => !linked || p.id === linked.partner_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
          </select>
        </label>
      </div>
      <label>
        Descrizione
        <input
          name="description"
          required
          maxLength={500}
          defaultValue={entry?.description}
        />
      </label>
      {cost && (
        <div className="finance-fields">
          <label>
            Voce del piano finanziario
            <select
              key={linked?.id ?? "direct"}
              name="line_item_id"
              required
              defaultValue={linked?.line_item_id ?? entry?.line_item_id ?? ""}
            >
              {!linked && <option value="">Seleziona voce</option>}
              {currentLines
                .filter(
                  (l) => !linked || l.line_item_id === linked.line_item_id,
                )
                .map((l) => (
                  <option key={l.id} value={l.line_item_id}>
                    {data.items.find((i) => i.id === l.line_item_id)?.code} ·{" "}
                    {l.description}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Risultato (opzionale)
            <select
              key={`result-${linked?.id ?? "direct"}`}
              name="result_id"
              defaultValue={linked?.result_id ?? entry?.result_id ?? ""}
            >
              {(!linked || !linked.result_id) && (
                <option value="">Non attribuito</option>
              )}
              {data.results
                .filter((r) =>
                  linked ? r.id === linked.result_id : r.status === "active",
                )
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.label}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
      <div className="finance-fields three">
        <label>
          {kind === "transfer" ? "Conto mittente" : "Conto"}{" "}
          {kind === "income" ? "(obbligatorio)" : "(opzionale)"}
          <select
            key={partner}
            name="account_id"
            required={kind === "income"}
            defaultValue={
              entry?.partner_id === partner ? (entry.account_id ?? "") : ""
            }
          >
            <option value="">
              {kind === "income" ? "Seleziona conto" : "Conto non indicato"}
            </option>
            {data.accounts
              .filter((a) => a.partner_id === partner && a.status === "active")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </select>
        </label>
        <Amount
          name="original_amount"
          label={`Importo ${originalCurrency}`}
          value={entry?.original_amount}
          step={originalCurrency !== currency ? "0.000001" : "0.01"}
          min={originalCurrency !== currency ? "0.000001" : "0.01"}
        />
        {kind === "expense" ? (
          <label>
            Valuta del pagamento
            <input
              name="original_currency_code"
              value={originalCurrency}
              onChange={(e) =>
                setOriginalCurrency(e.target.value.toUpperCase())
              }
              pattern="[A-Z]{3}"
              maxLength={3}
              required
            />
          </label>
        ) : (
          <Hidden name="original_currency_code" value={currency} />
        )}
      </div>
      {originalCurrency !== currency && (
        <p className="finance-callout">
          La spesa sarà convertita con l’ultima versione del cambio medio del
          mese del pagamento. Senza cambio può essere salvata solo in bozza.
        </p>
      )}
      {kind === "transfer" && (
        <div className="finance-fields">
          <label>
            Partner destinatario
            <select
              name="destination_partner_id"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">Seleziona partner</option>
              {data.partners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Conto destinatario (opzionale)
            <select
              key={destination}
              name="destination_account_id"
              defaultValue={
                entry?.destination_partner_id === destination
                  ? (entry.destination_account_id ?? "")
                  : ""
              }
            >
              <option value="">Conto non indicato</option>
              {data.accounts
                .filter(
                  (a) => a.partner_id === destination && a.status === "active",
                )
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
      <label>
        Note{" "}
        {cost ? " / motivazione di eventuale superamento del previsto" : ""}
        <textarea
          name="notes"
          maxLength={4000}
          rows={2}
          defaultValue={entry?.notes ?? ""}
        />
      </label>
      <div className="finance-form-footer">
        <span className="finance-help">
          La bozza non entra nei saldi. Dopo la registrazione le correzioni
          richiedono un annullamento motivato.
        </span>
        <div className="finance-buttons">
          <button
            className="secondary"
            name="register"
            value="false"
            type="submit"
          >
            Salva bozza
          </button>
          <button name="register" value="true" type="submit">
            {kind === "commitment" ? "Conferma impegno" : `Registra ${title}`}
          </button>
        </div>
      </div>
    </FinanceForm>
  );
}
export function EntryTransition({
  projectId,
  entry,
}: {
  projectId: string;
  entry: FinancialEntry;
}) {
  const [command, setCommand] = useState(
    entry.kind === "commitment" && entry.status === "confirmed"
      ? "close_commitment"
      : "void_entry",
  );
  return (
    <FinanceForm projectId={projectId} command={command}>
      <Hidden name="id" value={entry.id} />
      <Hidden name="row_version" value={entry.row_version} />
      {entry.kind === "commitment" && entry.status === "confirmed" && (
        <label>
          Operazione
          <select value={command} onChange={(e) => setCommand(e.target.value)}>
            <option value="close_commitment">
              Chiudi e libera l’importo non pagato
            </option>
            <option value="void_entry">Annulla (solo senza pagamenti)</option>
          </select>
        </label>
      )}
      <label>
        Motivazione
        <input name="reason" required maxLength={4000} />
      </label>
      <button className="secondary" type="submit">
        {command === "close_commitment"
          ? "Chiudi impegno"
          : "Annulla movimento"}
      </button>
    </FinanceForm>
  );
}
