import { requireProfile } from "@/lib/auth";
export const metadata = { title: "Progetti" };
export default async function Projects() {
  const { profile } = await requireProfile();
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">Spazio di lavoro</span>
        <h1>Progetti</h1>
        <p>
          {profile.is_admin
            ? "Il punto di accesso ai progetti della piattaforma."
            : "Il punto di accesso ai progetti che ti vengono assegnati."}
        </p>
      </div>
      <section className="empty-state">
        <span className="badge">In preparazione</span>
        <h2>La gestione dei progetti sta arrivando</h2>
        <p>
          Elenco, dettaglio e modifica saranno disponibili in una fase
          successiva.
        </p>
        <p>Questa pagina non mostra ancora i dati dei progetti.</p>
      </section>
    </>
  );
}
