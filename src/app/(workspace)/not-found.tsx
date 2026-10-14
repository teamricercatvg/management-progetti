import Link from "next/link";
export default function NotFound() {
  return (
    <section>
      <h1>Pagina non disponibile</h1>
      <p>
        La pagina richiesta non esiste oppure non è disponibile per il tuo
        profilo.
      </p>
      <Link href="/overview">Torna alla panoramica</Link>
    </section>
  );
}
