# Milestone 4 — Autenticazione e profili

Data: 9 ottobre 2026. Rilascio in produzione autorizzato dall’utente dopo i
test automatici; collaudo manuale previsto direttamente sul sito pubblico.
Migration applicata, primo Admin predisposto e frontend pubblicato e verificato
su https://www.ariadne-hub.it.

## Funzionalità e confini

Scaffold Next.js 16 / React 19 / TypeScript / Tailwind 4. Accesso email/password,
logout della sessione corrente, recupero password, accettazione invito e pagina
account protetta. Password nuove di 12–128 caratteri; messaggi di recupero uguali
per indirizzi presenti/assenti. Registrazione pubblica disabilitata.

Il client SSR usa solo URL e anon key. Proxy conserva i cookie aggiornati;
le pagine e le azioni protette chiamano `getUser()` e poi `current_profile()`.
Le risposte Auth sono private/no-store. Il controllo di profilo attivo viene
ripetuto sul server; metadata modificabili dall’utente non decidono mai i ruoli.
Un utente senza membership non viene presentato come Manager.

La [migration](../supabase/migrations/20261009120000_auth_profiles.sql):

- crea il profilo al momento dell’inserimento in `auth.users`, nella stessa
  transazione, con nome limitato a 120 caratteri e fallback `Utente`;
- recupera i profili mancanti per utenti Auth precedenti, senza promozioni;
- conserva audit e vincoli della milestone 3;
- espone soltanto `current_profile()`, senza parametri, al ruolo authenticated:
  restituisce ID, nome e indicazione Admin del solo chiamante attivo;
- introduce `app_private.bootstrap_admin(uuid)`, SQL-only, per il primo utente
  attivo con email confermata; serializza il bootstrap e respinge ripetizioni.

Le due routine SECURITY DEFINER (trigger e lettura identità) hanno search_path
vuoto, SQL statico e ACL esplicite; sono possedute dal ruolo DB che applica la
migration, amministratore fidato. Nessun grant diretto alle tabelle, nessuna
policy progetti e nessuna esposizione del bootstrap via API. Nella milestone 5
andrà completato il modello di owner dedicati e privilegi minimi dell’audit.
La modifica del nome e la gestione utenti tramite UI restano a quella fase.

Gli inviti in questa fase sono un’operazione tecnica controllata, tramite
[scripts/invite-user.mjs](../scripts/invite-user.mjs). La service role è letta
soltanto da questo processo CLI, mai importata nell’applicazione. Il comando
richiede `--send` ed effettua realmente una richiesta di invio: eseguirlo solo
per un destinatario autorizzato. Nessuna email è stata inviata durante i test.

## Avvio localhost

```bash
npm ci
npm run dev
```

Aprire http://127.0.0.1:3000. Il server ascolta soltanto su loopback.
La pagina login e i redirect delle pagine protette sono già verificabili.
**Il file `.env.local` preesistente punta al backend operativo:** ogni accesso
e modifica da localhost usa quindi gli stessi account della produzione.
L’utente ha scelto di effettuare il collaudo direttamente sul sito pubblico.

Per una prova completa usare uno stack Supabase locale (Docker richiesto) oppure
uno staging dedicato, con URL/chiavi propri in `.env.local`. Le variabili sono:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `APP_URL` (origine
esatta dell’app, es. http://127.0.0.1:3000). `SUPABASE_URL` e
`SUPABASE_SERVICE_ROLE_KEY` servono solo al comando tecnico per gli inviti.
Non sostituire automaticamente i valori già presenti nel checkout.

Con Docker locale, `supabase start` e `supabase db reset --local` applicano le
migration al database locale usa-e-getta. Il reset elimina solo i dati di quello
stack locale: mai usare il wrapper operativo per un reset di collaudo.
La configurazione locale include i template e la casella di test su porta 55324.
Questo Mac non dispone attualmente di Docker: i test automatici usano container
isolati sul server, rimossi al termine, senza porte pubblicate né rete esterna.

## Configurazione Auth e riproduzione su altri ambienti

1. Applicare la migration al backend di collaudo e mantenere signup pubblico,
   utenti anonimi e autoconferma disabilitati. Password minima Auth: 12.
2. Impostare Site URL e allowlist esatta dei redirect:
   `http://127.0.0.1:3000/auth/accept` e `/auth/callback` per il collaudo;
   in produzione i corrispondenti URL su `https://www.ariadne-hub.it`.
3. Configurare i template [invito](../supabase/templates/invite.html) e
   [recupero](../supabase/templates/recovery.html). Usano `.RedirectTo`,
   `.TokenHash` e tipi distinti `invite`/`recovery`; i comandi applicativi
   passano sempre `/auth/accept`. I link standard impliciti con token nel
   frammento URL non sono supportati dal client SSR.
4. Configurare `APP_URL` nell’ambiente scelto. In produzione deve essere
   `https://www.ariadne-hub.it`, senza path; non derivarla da header del client.
5. Per un invito autorizzato:

   ```bash
   node --env-file=.env.local scripts/invite-user.mjs EMAIL "Nome Cognome" --send
   ```

La pagina del link non consuma il token con GET (scanner email): l’utente preme
Continua e il POST verifica token e origine. Token errati, riutilizzati o scaduti
portano a un messaggio neutro; non esistono redirect verso destinazioni arbitrarie.
`/auth/callback` gestisce anche codici PKCE con destinazione fissa.

## Bootstrap iniziale

Dopo accettazione invito e conferma email, un operatore DB autorizzato seleziona
l’UUID del destinatario corretto e, nello stesso backend, esegue:

```sql
BEGIN;
SET LOCAL app.system_reason = 'Bootstrap Admin iniziale / riferimento autorizzazione';
SELECT app_private.bootstrap_admin('UUID-UTENTE-CONFERMATO'::uuid);
COMMIT;
```

Non inserire un Admin da metadata, non creare un endpoint pubblico di bootstrap
né usare un indirizzo email hardcoded nelle migration. In questo rilascio il
bootstrap è stato eseguito per il solo account già esistente e confermato
`admin@ariadne-hub.it`; nessuna password è stata cambiata.

## Collaudo manuale della versione pubblicata

Per scelta dell’utente, eseguire sul sito pubblico con gli account autorizzati:

- aprire l’invito ricevuto, premere Continua, impostare una password; controllare
  nome/email della pagina account e assenza di Admin prima del bootstrap;
- logout, login corretto e login con password sbagliata; aggiornare la pagina
  e verificare che la sessione persista; dopo logout `/account` e `/password`
  devono tornare al login;
- richiedere recupero, aprire email, cambiare password; la precedente deve
  fallire e la nuova funzionare; riusare il link deve essere respinto;
- provare secondo utente e profilo disabilitato dal percorso DB di collaudo:
  niente profili altrui e nessun account protetto accessibile al disabilitato;
- provare invito su altro browser, navigazione da telefono e controlli tastiera.

Questi test includono consegna email e cookie nel browser; non sono sostituiti
dai test SQL. Non è ancora possibile collaudare progetti/budget o autorizzazioni
Manager: appartengono alle milestone successive.

## Verifiche automatiche — esito positivo

```bash
npm run lint
npm run typecheck
npm test
npm run build
bash scripts/test-migrations.sh
bash scripts/test-auth-service.sh
```

La suite SQL verifica tutte le regressioni della 3 prima di applicare la 4,
poi provisioning, audit, metadata ostili, profili disabilitati, bootstrap,
ACL, ripetibilità e rollback. La suite GoTrue usa la stessa versione Auth
installata (`v2.186.0`) e PostgreSQL 15 usa-e-getta, nessun volume operativo,
nessuna rete esterna; genera link senza inviare email. Copre invito, conferma,
password, login errato/corretto, recupero, logout e revoca del refresh token.

Eseguiti con esito positivo lint, typecheck, test, build, suite SQL e GoTrue.
Controllati nel browser layout login e redirect anonimi; POST di conferma con
origine estranea restituisce 403. La service role è assente dagli asset client.

`npm audit --omit=dev`: zero vulnerabilità al controllo. L’audit completo
segnala cinque voci correlate alla dipendenza transitiva `braces` del linter,
priva di versione corretta al controllo; non entra nel runtime. Nessun downgrade
incompatibile di Next.js è stato applicato per nascondere la segnalazione.

## Rilascio produzione — 9 ottobre 2026

- Backup `/var/backups/management-progetti/20261009T165147Z`, checksum e
  `pg_verifybackup` verificati, ripristino isolato riuscito.
- Migration `20261009120000` applicata; dry-run successivo senza operazioni.
- Profilo dell’account preesistente recuperato e bootstrap Admin eseguito
  transazionalmente con audit e motivazione esplicita; un Admin attivo.
- Coolify: template invito e recupero puntano a `/auth-templates/invite.html`
  e `/auth-templates/recovery.html` sul sito www; allowlist limitata ai due
  callback di produzione. Password minima Auth 12, oggetti email in italiano.
- La build copia i template canonici da `supabase/templates` negli asset pubblici
  con `scripts/prepare-auth-templates.mjs`; non contiene credenziali.
- Vercel: preset Next.js e `APP_URL=https://www.ariadne-hub.it` in production.
- Frontend: commit applicativo `bc07f65`, deployment Vercel
  `dpl_EHsQFjSfYvby294TDFcz4GEoFYMP` in stato READY, dominio www assegnato.
- Verifiche live: login e template HTTP 200, anonimi rimandati al login,
  POST da origine estranea negato, sessione Auth reale con pagina account Admin
  renderizzata via SSR e Cache-Control no-store. Accesso progetti negato.
- Recupero: conferma POST sul dominio pubblico, cookie di sessione e pagina
  password verificati; riutilizzo del token respinto. Nessuna password cambiata.
- Le sessioni tecniche temporanee sono state chiuse con logout locale;
  nessuna email di test inviata. Il test di ricezione email resta all’utente.
- Backend healthy dopo il riavvio Coolify; controlli gateway e signup chiuso
  superati. Nei log Vercel interrogati dopo il rilascio nessun errore rilevato.

Per iniziare il collaudo, usare l’account `admin@ariadne-hub.it`. Se la password
applicativa non è nota, utilizzare “Hai dimenticato la password?”: non presumere
che coincida con la password della casella Google Workspace. Nessuna email è
stata inviata automaticamente per questo rilascio.

Lo schema consente ancora solo la lettura dell’identità propria: progetti,
budget e gestione utenti tramite UI restano alle milestone successive.

Riferimenti: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[flusso token hash](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs),
[Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy).
