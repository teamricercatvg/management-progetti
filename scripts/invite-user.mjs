// Explicit operator-only email action. Never imported by the Next.js application.
import { createClient } from "@supabase/supabase-js";
import { appOrigin, validEmail } from "../src/lib/validation.mjs";
const [email, displayName, confirmation] = process.argv.slice(2);
if (
  !validEmail(email) ||
  !displayName?.trim() ||
  displayName.length > 120 ||
  confirmation !== "--send"
) {
  console.error(
    'Uso: node --env-file=.env.local scripts/invite-user.mjs EMAIL "Nome" --send',
  );
  process.exit(1);
}
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const origin = appOrigin(process.env.APP_URL || "http://127.0.0.1:3000");
if (!url || !key) throw new Error("Configurazione operatore mancante.");
const client = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await client.auth.admin.inviteUserByEmail(email, {
  data: { display_name: displayName.trim() },
  redirectTo: `${origin}/auth/accept`,
});
if (error) {
  console.error(
    "Invito non completato. Verificare configurazione Auth, template e account nel pannello riservato.",
  );
  process.exit(1);
}
console.log(
  "Richiesta di invito accettata da Auth. Verificare la ricezione nella casella destinataria.",
);
