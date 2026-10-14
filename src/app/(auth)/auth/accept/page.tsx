import { Submit } from "@/components/submit";
export const dynamic = "force-dynamic";
export default async function Accept({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash, type } = await searchParams;
  const valid =
    token_hash &&
    token_hash.length <= 512 &&
    (type === "invite" || type === "recovery");
  return (
    <section>
      <h1>Conferma l’accesso</h1>
      {valid ? (
        <>
          <p>Prosegui per impostare la tua password.</p>
          <form action="/auth/confirm" method="post">
            <input type="hidden" name="token_hash" value={token_hash} />
            <input type="hidden" name="type" value={type} />
            <Submit>Continua</Submit>
          </form>
        </>
      ) : (
        <p>Collegamento non valido. Richiedine uno nuovo all’amministratore.</p>
      )}
    </section>
  );
}
