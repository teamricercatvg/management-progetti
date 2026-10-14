import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { updatePassword } from "@/app/actions";
import { Submit } from "@/components/submit";
export const dynamic = "force-dynamic";
export default async function Password({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireProfile();
  const { status } = await searchParams;
  return (
    <section>
      <h1>La tua password</h1>
      <p>Scegli una password di almeno 12 caratteri.</p>
      {status ? (
        <p role="alert" className="notice">
          {status === "invalid"
            ? "Le password devono coincidere e contenere da 12 a 128 caratteri."
            : "Aggiornamento non riuscito. Riprova o richiedi un nuovo collegamento."}
        </p>
      ) : null}
      <form action={updatePassword}>
        <label>
          Nuova password
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <label>
          Conferma password
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={128}
            required
          />
        </label>
        <Submit>Salva password</Submit>
      </form>
      <Link href="/account">Torna al profilo</Link>
    </section>
  );
}
