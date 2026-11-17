export const inforEuroPage = "https://commission.europa.eu/funding-and-tenders/procedures-guidelines-tenders/information-contractors-and-beneficiaries/exchange-rate-inforeuro_it";
export function inforEuroUrl(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Mese non valido.");
  const [year, number] = month.split("-");
  return `https://ec.europa.eu/budg/inforeuro/api/public/monthly-rates?year=${year}&month=${Number(number)}&lang=en`;
}
// InforEuro quotes foreign units per EUR; Ariadne stores EUR per foreign unit.
// Integer division rounds once at the database's 12-decimal rate precision.
export function inforEuroRate(rows, currency) {
  if (!Array.isArray(rows) || !/^[A-Z]{3}$/.test(currency) || currency === "EUR") throw new Error("Valuta non valida.");
  const matches = rows.filter(r => r.isoA3Code === currency);
  const value = String(matches[0]?.value ?? "");
  if (!/^\d+(\.\d{1,12})?$/.test(value) || matches.some(r => String(r.value) !== value)) throw new Error("Cambio InforEuro non disponibile per questa valuta e mese.");
  const [whole, decimals = ""] = value.split(".");
  const denominator = BigInt(whole + decimals);
  if (denominator <= 0n) throw new Error("Cambio InforEuro non valido.");
  const numerator = 10n ** BigInt(decimals.length + 12);
  const rounded = (numerator + denominator / 2n) / denominator;
  if (rounded === 0n) throw new Error("Cambio fuori precisione.");
  return `${rounded / 1000000000000n}.${String(rounded % 1000000000000n).padStart(12, "0")}`;
}

// Same positive-decimal rounding as SQL round(original_amount * rate, 2).
export function convertedCents(amount, rate) {
  const parse = (text, precision) => {
    if (!new RegExp(`^\\d+(\\.\\d{1,${precision}})?$`).test(text)) return null;
    const [whole, fraction = ""] = text.split(".");
    return { value: BigInt(whole + fraction), scale: 10n ** BigInt(fraction.length) };
  };
  const a = parse(String(amount).replace(",", "."), 6), r = parse(String(rate), 12);
  if (!a || !r || a.value <= 0n || r.value <= 0n) return null;
  const denominator = a.scale * r.scale;
  return (a.value * r.value * 100n + denominator / 2n) / denominator;
}
