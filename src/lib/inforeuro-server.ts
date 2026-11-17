import "server-only";
import { inforEuroRate, inforEuroUrl } from "./inforeuro.mjs";
export async function getInforEuro(currency: string, month: string) {
  const source = inforEuroUrl(month);
  const response = await fetch(source, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("InforEuro temporaneamente non disponibile. Riprova o salva la spesa in bozza.");
  const rate = inforEuroRate(await response.json(), currency);
  return { rate, source, month, currency };
}
