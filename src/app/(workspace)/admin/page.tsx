import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
export const metadata = { title: "Amministrazione" };
export default async function Admin() {
  const { profile } = await requireProfile();
  if (!profile.is_admin) notFound();
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">Area riservata</span>
        <h1>Amministrazione</h1>
        <p>Uno spazio dedicato agli amministratori della piattaforma.</p>
      </div>
      <section className="empty-state">
        <span className="badge">In preparazione</span>
        <h2>Gestione della piattaforma</h2>
        <p>
          Le funzioni amministrative saranno disponibili nelle prossime fasi.
        </p>
      </section>
    </>
  );
}
