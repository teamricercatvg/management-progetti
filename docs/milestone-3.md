# Milestone 3 — Schema Supabase e migration fondative

Data: 7 ottobre 2026. Stato: **completata, verificata in ambiente isolato
e applicata al backend dedicato**.
Consegna su `main`; commit, push e applicazione remota autorizzati dall’utente.

## Consegna

Due migration, basate sul [modello approvato](data-model.md):

- [Tabelle e indici](../supabase/migrations/20261007160217_foundations.sql):
  `profiles`, `global_user_roles`, `organizations`, `projects`,
  `project_memberships`, `project_organizations`, `audit_log`.
- [Vincoli e audit](../supabase/migrations/20261007160218_foundation_guards.sql):
  autori/timestamp/versioni, identità immutabili, tutela ultimo Admin,
  composizione dei partenariati, archivio e audit transazionale.

Nomi inglesi snake_case, UUID e CHECK testuali; nessun enum PostgreSQL.
I vincoli sui codici richiedono input già normalizzato (maiuscolo e senza spazi
esterni), con unicità. Date finite e ordinate, testi obbligatori non vuoti,
FK RESTRICT e chiavi `(project_id,id)` pronte per le relazioni delle prossime
milestone. Nessuna cancellazione fisica di profili, enti, progetti e membership.
Revoche dei ruoli e rimozioni dei partenariati sono tracciate e vincolate.

RLS abilitata su tutte le sette tabelle, **nessuna policy di accesso** e grants
revocati a `PUBLIC`, `anon`, `authenticated` e `service_role`, anche se il server
assegna grant automatici. La service role non può accedere per il solo fatto
di bypassare RLS: in questa fase mancano anche i privilegi di tabella.
Nessuna funzione in `public`; helper in `app_private`, search_path vuoto,
EXECUTE revocato ai ruoli API, nessuna funzione SECURITY DEFINER.

## Vincoli transazionali

- Progetto attivo/completato: un ente sole oppure un lead con almeno un partner.
  L'indice parziale impedisce due sole/lead. Trigger differiti consentono di
  sostituire l'intera composizione nella stessa transazione, verificando lo
  stato finale. Le scritture sui figli bloccano prima la riga progetto.
- Nessun nuovo riferimento a un ente archiviato; un lock condiviso sull'ente
  serializza il controllo rispetto alla sua archiviazione.
- Progetto archiviato in sola lettura, inclusi membership e partenariati.
  Riapertura con un UPDATE del solo stato; eventuali modifiche successive sono
  operazioni distinte. Un progetto archiviato ancora incompleto può tornare
  draft, ma non active/completed senza composizione valida.
- Revoca/disabilitazione dell'ultimo Admin attivo vietata. Lock transazionale
  comune alle scritture su profili/ruoli; la fase prima del bootstrap può avere
  zero Admin, ma dopo non è consentito rimuovere l'ultimo attivo.
- Controlli tra righe supportati a READ COMMITTED. Snapshot REPEATABLE READ e
  SERIALIZABLE respinti nelle scritture che richiedono i lock, per evitare
  controlli su snapshot precedenti all'attesa. Eventuali protocolli alternativi
  saranno progettati e testati esplicitamente.
- Il DB assegna timestamp e autori da `auth.uid()`, preserva il creatore e
  incrementa `row_version`. Le future API devono usare
  `WHERE id = ... AND row_version = versione_letta` e trattare zero righe come
  conflitto; il solo incremento non sostituisce il confronto ottimistico.
- Identità e project_id immutabili; l'UPDATE che forza una versione differente
  da quella corrente viene respinto.

## Audit

Ogni scrittura sulle sei tabelle operative registra un evento nella stessa
transazione. Un errore dell'audit annulla la scrittura. Payload con allowlist
esplicita di ID, codici, stati, date, valuta e versione; non copia automaticamente
nuove colonne né nomi, descrizioni, note libere, email Auth o credenziali.
L'audit è una primitiva di tracciamento, non uno snapshot integrale dei testi.
`request_id` resta predisposto e nullo fino alle API applicative.

Per operazioni tecniche senza identità Auth occorre identificare il processo:

```sql
BEGIN;
SET LOCAL app.system_reason = 'bootstrap controllato / riferimento operazione';
-- Operazione tecnica autorizzata, soltanto sul database scelto consapevolmente.
COMMIT;
```

Questa impostazione non concede privilegi e non sostituisce l'autorizzazione.
UPDATE/DELETE/TRUNCATE dell'audit sono bloccati; INSERT è riservato al percorso
DB privilegiato, con nessun grant ai ruoli applicativi. Il proprietario DB resta
un amministratore fidato, non un ruolo applicativo.

## Configurazione e riproduzione

[Configurazione Supabase](../supabase/config.toml) generata con CLI **2.109.1** e
ridotta alle opzioni pertinenti: PostgreSQL 15, porte locali 55320–55324,
registrazione pubblica disabilitata, nessun seed, nessun collegamento remoto.
Con Docker locale disponibile:

```bash
supabase start
supabase db reset --local
```

Il reset riguarda solo l'ambiente locale usa-e-getta e ne elimina i dati.
Non usare `--linked` né il wrapper operativo `scripts/supabase-cli.py push`
per queste verifiche. Il Mac usato nella consegna non ha Docker: l'avvio dello
stack locale completo e i flussi Auth non sono stati esercitati.

La suite riproducibile usa invece il server verificato con un container isolato:

```bash
bash scripts/test-migrations.sh
```

Lo [script](../scripts/test-migrations.sh) invia solo migration, test e runner
tramite SSH. Il [runner](../scripts/test-migrations-server.sh) usa l'immagine
`supabase/postgres:15.8.1.085` già presente, `--network none`, nessuna porta o
volume del backend e un cluster fresco in tmpfs. Rimuove container e directory
al termine, anche in errore. Non legge credenziali, backup o dati operativi.

Le [fixture Auth](../supabase/tests/bootstrap.sql) contengono soltanto
`auth.users(id)`, `auth.uid()` e i ruoli API minimi. Sono oggetti sintetici per
provare FK e identità di sessione: **non verificano il servizio Supabase Auth**.
La suite esegue SQL tramite psql con stop al primo errore; non usa pgTAP né
scrive la cronologia delle migration nel database operativo.

## Verifiche eseguite

- Applicazione da zero delle due migration in due database; dump dello schema
  `public`/`app_private` confrontati e identici.
- [Test SQL](../supabase/tests/foundations.sql): struttura, CHECK, FK, univocità,
  composizione valida/invalida, sostituzione atomica, ultimo Admin,
  archiviazione, versione ottimistica, autori e rollback dopo errore audit.
- Accessi diretti anonimo/autenticato negati; verifica dei grant anche per
  service_role. Grant temporanei nel test dimostrano che RLS da sola filtra
  tutte le righe e impedisce INSERT; rollback rimuove fixture e grant.
- [Test concorrenti](../supabase/tests/concurrency.sh): disabilitazione e revoca
  di due Admin in sessioni diverse; rimozione concorrente di due partner.
  La seconda operazione attende e viene respinta, conservando uno stato valido.
- Rollback transazionale dell'intera catena: nessuna tabella applicativa residua.
- Sintassi shell, whitespace, collegamenti documentali e revisione dei nuovi file.
  Type-check/lint/build Next.js non applicabili: nessuno scaffold applicativo.

## Rollback

Ogni migration è atomica. Un errore prima del COMMIT ripristina lo stato iniziale
(di quella migration); la suite prova anche il rollback dell'intera catena.
Se la seconda fallisse dopo il commit della prima, le tabelle resterebbero vuote
con grants revocati e RLS senza policy: correggere prima di proseguire.

Dopo un'applicazione completata, preferire una nuova migration correttiva.
Non prevedere un down automatico che elimini dati e audit. Solo in un ambiente
isolato senza dati si può ricreare il database da zero. Un eventuale rollback
operativo richiede backup verificato, analisi delle dipendenze, finestra dedicata
e autorizzazione separata; mai DROP CASCADE o reset sul backend per fare test.

## Confini e prossime milestone

Auth, inviti, creazione automatica del profilo e bootstrap Admin appartengono
alla milestone 4. Policy, helper di autorizzazione e grant per colonna alla 5.
Prima di aprire gli accessi, la 5 deve anche predisporre il percorso audit con
owner dedicato e privilegi minimi: il trigger attuale è SECURITY INVOKER e non
consente scritture da ruoli privi di accesso all'audit.

La valuta ha qui solo il controllo formale di tre lettere; l'elenco applicativo
ammesso arriva con le funzionalità, e il blocco del cambio valuta dopo il primo
movimento con le milestone economiche. Tabelle quadro logico, indicatori,
cronogramma, budget, cambi e rapporti restano alle rispettive milestone.
Nessun utente Auth creato o modificato dalle migration. Le sette tabelle
fondative sono presenti nel backend dedicato, con accesso API ancora negato.

All’avvio sono stati verificati stato, branch e remoto, poi eseguito fetch.
Durante il lavoro il checkout condiviso è stato aggiornato su `main` al commit
`f575d56`, che pubblica la milestone 2 e richiede lavoro diretto su main.
Le modifiche preesistenti estranee alla milestone sono conservate ed escluse
dal commit della milestone 3.

Riferimenti tecnici: [migration Supabase](https://supabase.com/docs/guides/local-development/database-migrations),
[vincoli concorrenti PostgreSQL 15](https://www.postgresql.org/docs/15/applevel-consistency.html).


## Applicazione al backend dedicato — 7 ottobre 2026

Su richiesta esplicita dell’utente, verificate istanza e porta dedicate:
`supabase-db-d4urni99thsq3vsnxxkckjzh`, PostgreSQL 15.8 su loopback 25432.
Prima dell’intervento lo schema public non aveva tabelle applicative e non
esisteva la cronologia Supabase delle migration.

Backup logico completo preventivo in
`/var/backups/management-progetti/pre-milestone-3-20261007T161320Z/postgres.dump`,
con indice pg_restore leggibile e checksum SHA-256 salvato accanto al dump.
Il contenuto del backup non è incluso nel repository.

Comandi eseguiti tramite il wrapper dedicato:

```bash
GODEBUG=netdns=go PGSSLMODE=disable python3 scripts/supabase-cli.py push --dry-run --yes
GODEBUG=netdns=go PGSSLMODE=disable python3 scripts/supabase-cli.py push --yes
GODEBUG=netdns=go PGSSLMODE=disable python3 scripts/supabase-cli.py push --dry-run --yes
```

`PGSSLMODE=disable` riguarda esclusivamente il collegamento PostgreSQL su
loopback all’interno del tunnel SSH cifrato; non disabilita HTTPS pubblico.
`GODEBUG=netdns=go` evita il timeout del resolver nativo osservato sul Mac
anche con GitHub CLI; nessuna configurazione globale è stata modificata.

Applicate entrambe le versioni `20261007160217` e `20261007160218`; il controllo
successivo della CLI restituisce **Remote database is up to date**.
Verifica SQL: sette tabelle con RLS attiva, zero policy e zero grant applicativi
a PUBLIC/anon/authenticated/service_role, nove funzioni private.
I test con fixture restano esclusivamente nell’ambiente isolato.

Controlli successivi via gateway dedicato: Auth health e REST HTTP 200,
Studio senza credenziali HTTP 401 e con credenziali HTTP 200, chiave errata
HTTP 401. Lettura REST di projects respinta: anon HTTP 401, service role
HTTP 403. Registrazione pubblica e accessi anonimi Auth restano disabilitati.
