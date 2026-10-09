import { login, recover, logout } from "@/app/actions";
import { Submit } from "@/components/submit";
export const dynamic = "force-dynamic";
const messages: Record<string, string> = {
  invalid: "Email o password non valide.",
  email: "Inserisci un indirizzo email valido.",
  sent: "Se l’indirizzo è abilitato, riceverai un’email per reimpostare la password.",
  out: "Hai effettuato la disconnessione.",
  inactive: "Il profilo non è abilitato. Contatta l’amministratore.",
  unavailable: "Accesso temporaneamente non disponibile. Riprova più tardi.",
  expired: "Il collegamento non è valido o è scaduto. Richiedine uno nuovo.",
};
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return (
    <section>
      <h1>Benvenuto in Ariadne</h1>
      <p>Accedi con l’account che ti è stato assegnato.</p>
      {status && messages[status] ? (
        <p role="status" className="notice">
          {messages[status]}
        </p>
      ) : null}
      <form action={login}>
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        <Submit>Accedi</Submit>
      </form>
      <details>
        <summary>Hai dimenticato la password?</summary>
        <form action={recover}>
          <label>
            Email del tuo account
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
            />
          </label>
          <Submit>Richiedi il recupero</Submit>
        </form>
      </details>
      {status === "inactive" || status === "unavailable" ? (
        <form action={logout}>
          <Submit>Esci dalla sessione</Submit>
        </form>
      ) : null}
      <p>
        <small>
          L’accesso è riservato agli utenti invitati dall’amministratore.
        </small>
      </p>
    </section>
  );
}
