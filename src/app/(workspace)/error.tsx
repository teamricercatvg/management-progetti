"use client";
import Link from "next/link";
export default function WorkspaceError({ retry }: { retry: () => void }) {
  return (
    <section role="alert">
      <h1>Non siamo riusciti a caricare la pagina</h1>
      <p>
        Riprova tra poco. Se il problema continua, contatta l’amministratore.
      </p>
      <div className="actions">
        <button onClick={retry}>Riprova</button>
        <Link href="/overview">Torna alla panoramica</Link>
      </div>
    </section>
  );
}
