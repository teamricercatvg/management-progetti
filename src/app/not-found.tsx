import Link from "next/link";
export default function NotFound() {
  return (
    <main className="auth-layout">
      <section>
        <h1>Pagina non trovata</h1>
        <p>Il collegamento potrebbe non essere corretto.</p>
        <Link href="/overview">Torna ad Ariadne Hub</Link>
      </section>
    </main>
  );
}
