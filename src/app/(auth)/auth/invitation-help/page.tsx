import { recover } from "@/app/actions";
import { Submit } from "@/components/submit";
export const dynamic = "force-dynamic";
export default async function InvitationHelp({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  return <section>
    <h1>Completa l’impostazione della password</h1>
    <p>Il collegamento è già stato utilizzato, è scaduto oppure non è stato possibile confermarlo. Se la pagina per scegliere la password è già aperta in un’altra scheda, continua da lì.</p>
    <p>Altrimenti inserisci l’email dell’invito per ricevere un nuovo collegamento e scegliere la password.</p>
    {status === "sent" ? <p role="status">Se l’indirizzo è abilitato, riceverai un’email. Apri l’ultimo collegamento ricevuto e premi «Continua» per scegliere la password.</p> : <>
      {status && <p role="alert">{status === "email" ? "Inserisci un indirizzo email valido." : "Servizio temporaneamente non disponibile. Riprova più tardi."}</p>}
      <form action={recover}>
        <input type="hidden" name="context" value="invitation" />
        <label>Email dell’invito<input name="email" type="email" autoComplete="email" required maxLength={254} /></label>
        <Submit>Invia un nuovo collegamento</Submit>
      </form>
    </>}
    <p>Se l’email non arriva, chiedi all’amministratore di reinviare l’invito.</p>
  </section>;
}
