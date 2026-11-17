"use client";
import { FinanceForm, Hidden } from "./finance-forms";
import { useEffect, useState } from "react";
import { todayRome } from "@/lib/finance.mjs";
import { inforEuroPage } from "@/lib/inforeuro.mjs";
export function FinanceInforEuro({projectId, initialCurrency = "", readOnly = false}: {projectId: string; initialCurrency?: string; readOnly?: boolean}) {
 const [currency, setCurrency] = useState(initialCurrency);
 const [month, setMonth] = useState(todayRome().slice(0,7));
 const [result, setResult] = useState<{rate?: string; error?: string; key?: string}>({});
 const key = `${currency}/${month}`;
 useEffect(() => {
  if (!/^[A-Z]{3}$/.test(currency) || currency === "EUR" || !month) return;
  const controller = new AbortController();
  fetch(`/projects/${projectId}/piano-finanziario/inforeuro?currency=${currency}&month=${month}`, {signal:controller.signal})
   .then(r => r.json()).then(value => setResult({...value, key:`${currency}/${month}`}))
   .catch(() => {if (!controller.signal.aborted) setResult({error:"InforEuro non raggiungibile. Riprova più tardi.", key:`${currency}/${month}`});});
  return () => controller.abort();
 }, [projectId,currency,month]);
 return <section className="finance-inforeuro">
  <h3>Cambio mensile InforEuro</h3>
  <p>Le spese in EUR non richiedono un cambio. Per spese in valuta locale seleziona la valuta (es. MWK per il Malawi).</p>
  <div className="finance-fields"><label>Valuta locale<input aria-label="Valuta locale InforEuro" value={currency} maxLength={3} placeholder="Es. MWK" onChange={e => setCurrency(e.target.value.toUpperCase())}/></label>
  <label>Mese InforEuro<input type="month" value={month} onChange={e => setMonth(e.target.value)}/></label></div>
  {currency.length === 3 && currency !== "EUR" && <p role="status">{result.key !== key ? "Caricamento cambio…" : result.error ?? `1 ${currency} = ${result.rate} EUR · ${month}`}</p>}
  {!readOnly && result.key === key && result.rate && <FinanceForm projectId={projectId} command="import_inforeuro">
   <Hidden name="source_currency_code" value={currency}/><Hidden name="month" value={month}/>
   <button type="submit">Salva cambio del mese</button>
  </FinanceForm>}
  <p className="finance-help">Il tasso del mese del pagamento viene acquisito alla registrazione della spesa estera, se non è già presente un cambio salvato. I cambi già utilizzati restano invariati.</p>
  <a href={inforEuroPage} target="_blank" rel="noreferrer">Fonte: Commissione europea · InforEuro</a>
 </section>;
}
