import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { logout } from "@/app/actions";
import { Submit } from "@/components/submit";
export const dynamic = "force-dynamic";
export default async function Account({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { user, profile } = await requireProfile();
  const { status } = await searchParams;
  return (
    <section>
      <h1>Ciao, {profile.display_name}</h1>
      <p>Il tuo account è collegato ad Ariadne Hub.</p>
      {status === "updated" ? (
        <p className="notice" role="status">
          Password aggiornata.
        </p>
      ) : null}
      <dl>
        <dt>Email</dt>
        <dd>{user.email}</dd>
        <dt>Profilo</dt>
        <dd>{profile.is_admin ? "Amministratore" : "Utente abilitato"}</dd>
      </dl>
      <p>
        Le funzionalità di gestione progetti saranno disponibili nelle prossime
        fasi.
      </p>
      <Link href="/password">Imposta o modifica la password</Link>
      <form action={logout}>
        <Submit>Esci</Submit>
      </form>
    </section>
  );
}
