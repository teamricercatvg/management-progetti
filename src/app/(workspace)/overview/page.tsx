import Link from "next/link";
import { requireProfile } from "@/lib/auth";
export const metadata = { title: "Panoramica" };
export default async function Overview() {
  const { profile } = await requireProfile();
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">Panoramica</span>
        <h1>Benvenuto, {profile.display_name}</h1>
        <p>
          Uno spazio per pianificare, seguire e condividere il lavoro sui
          progetti.
        </p>
      </div>
      <div className="card-grid">
        <section>
          <span className="badge">In preparazione</span>
          <h2>I progetti</h2>
          <p>
            La gestione dei progetti sarà disponibile prossimamente. Qui
            troverai il punto di accesso ai tuoi progetti.
          </p>
          <Link href="/projects">Vai all’area progetti →</Link>
        </section>
        <section>
          <span className="badge">Il tuo profilo</span>
          <h2>Account e accesso</h2>
          <p>
            Consulta i dati del tuo account e aggiorna la password di accesso.
          </p>
          <Link href="/account">Gestisci il tuo account →</Link>
        </section>
      </div>
      {profile.is_admin ? (
        <section className="admin-card">
          <h2>Amministrazione</h2>
          <p>
            L’area dedicata alla gestione della piattaforma è in preparazione.
          </p>
          <Link href="/admin">Vai all’area amministrazione →</Link>
        </section>
      ) : null}
    </>
  );
}
