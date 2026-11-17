"use client";
import { useEffect, useState } from "react";
import type { ExchangeRate } from "@/lib/finance-data";
import { decimalLabel, money } from "@/lib/finance.mjs";
import { convertedCents, inforEuroPage } from "@/lib/inforeuro.mjs";

export function ExpenseConversion({ projectId, currency, amount, date, rates }: {
  projectId: string; currency: string; amount: string; date: string; rates: ExchangeRate[];
}) {
  const month = date.slice(0, 7);
  const valid = /^[A-Z]{3}$/.test(currency) && /^\d{4}-(0[1-9]|1[0-2])$/.test(month);
  const saved = rates.filter(r => r.source_currency_code === currency && r.rate_month === `${month}-01`)
    .sort((a, b) => b.version - a.version)[0];
  const [quote, setQuote] = useState<{key: string; rate?: string; error?: string}>();
  const key = `${currency}/${month}`;
  useEffect(() => {
    if (!valid || saved) return;
    const controller = new AbortController();
    fetch(`/projects/${projectId}/piano-finanziario/inforeuro?currency=${currency}&month=${month}`, { signal: controller.signal })
      .then(r => r.json())
      .then(value => { if (!controller.signal.aborted) setQuote({ ...value, key }); })
      .catch(() => { if (!controller.signal.aborted) setQuote({ key, error: "InforEuro non raggiungibile. Puoi salvare la spesa in bozza." }); });
    return () => controller.abort();
  }, [projectId, currency, month, key, valid, saved]);
  const current = quote?.key === key ? quote : undefined;
  const rate = saved?.rate ?? current?.rate;
  const total = rate ? convertedCents(amount, rate) : null;
  return <section className="finance-callout" aria-label="Conversione in euro" aria-live="polite">
    <h4>Importo in valuta locale e in euro</h4>
    {!valid ? <p>Indica una valuta a tre lettere e la data del pagamento.</p>
      : !rate ? <p>{current?.error ?? "Caricamento del cambio mensile InforEuro…"}</p>
      : <>
        <p>Cambio di {month}: 1 {currency} = {decimalLabel(rate)} EUR</p>
        <p><strong>{total === null ? "Inserisci un importo valido per vedere il controvalore." : `${decimalLabel(amount.replace(",", "."))} ${currency} = ${money(total, "EUR")}`}</strong></p>
        <p className="finance-help">{saved ? `Fonte salvata: ${saved.source} · versione ${saved.version}.` : "Fonte: Commissione europea · InforEuro."} Anteprima: l’importo definitivo sarà calcolato alla registrazione con il cambio disponibile per il mese del pagamento.</p>
        <a href={inforEuroPage} target="_blank" rel="noreferrer">Consulta InforEuro</a>
      </>}
  </section>;
}
