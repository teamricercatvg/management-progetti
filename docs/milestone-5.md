# Milestone 5 — Ruoli, membership e Row Level Security

Data: 14 ottobre 2026. Implementazione verificata in container PostgreSQL 15
e GoTrue isolati. Rilascio in produzione autorizzato dall’utente il 14 ottobre;
migration applicata al backend dedicato. Stato del rilascio in fondo.

## Ambito

Implementata la matrice MVP Admin/Manager approvata nella milestone 2 sulle
sette tabelle fondative esistenti. `project_memberships` esiste dalla milestone
3: viene ora esposta con policy e privilegi di colonna. Operator, viewer,
`activity_assignments` e tabelle operative future restano fuori ambito.
Non vengono aggiunte pagine o CRUD applicativi delle milestone successive.

Migration: [20261014120000_project_authorization.sql](../supabase/migrations/20261014120000_project_authorization.sql).

- Admin attivo: lettura globale, creazione/modifica di progetti e organizzazioni,
  assegnazione e revoca dei Manager tramite stato della membership.
- Manager attivo con membership attiva: lettura/modifica dei progetti assegnati,
  dei loro partenariati e lettura del relativo audit. Nessuna creazione progetto,
  modifica degli enti condivisi, gestione utenti o assegnazione Manager.
- Profilo: lettura propria e modifica del nome; Admin può leggere tutti i profili
  e modificarne i nomi. I nomi dei colleghi vengono esposti da RPC dedicata.
- Ruoli globali e attivazione profili: soltanto RPC Admin controllate, con audit
  e protezione transazionale dell'ultimo Admin attivo.
- Audit scritto soltanto dai trigger; nessun accesso anonimo o grant applicativo
  alla service role. La creazione/invito utenti resta il percorso Auth tecnico
  documentato nella milestone 4, da eseguire solo per destinatari autorizzati.

## Contratto API

Le normali query usano il token dell'utente e sono filtrate da RLS. I grants di
colonna escludono ID assegnati dal DB, autori, date tecniche e versioni. Per gli
UPDATE restano immutabili project_id, user_id delle membership e autore iniziale.
Gli UPDATE su righe invisibili/non autorizzate possono restituire zero righe:
il chiamante deve controllare il risultato, senza interpretarlo come successo.

RPC disponibili ad `authenticated`, ciascuna con controllo dell'identità DB:

| RPC | Contratto |
| --- | --- |
| `current_profile()` | Identità propria attiva, invariata rispetto alla milestone 4 |
| `set_profile_active(target_user, active)` | Solo Admin; disabilita/riattiva profilo applicativo |
| `set_admin_role(target_user, enabled)` | Solo Admin; aggiunge/rimuove ruolo globale; promozione solo di profili attivi |
| `search_organizations(query)` | Admin o Manager assegnato; ricerca letterale di 2–120 caratteri, massimo 20 enti attivi, solo id/codice/nome |
| `project_manager_names(project_id)` | Solo progetto accessibile; id/nome dei Manager attivi |
| `remove_draft_project_organization(target_project, target_link)` | Solo progetto accessibile in bozza; elimina il figlio con lock e audit |

I parametri target identificano l'oggetto dell'operazione, mai il chiamante.
L'identità viene sempre da `auth.uid()`. Metadata Auth non attribuiscono ruoli.

L'archiviazione conserva i vincoli della milestone 3: progetto e figli, incluse
le membership, sono in sola lettura fino alla riapertura separata. Per modificare
membership di un archivio l'Admin deve prima riaprire il progetto; la disabilitazione
globale del profilo rimane disponibile. La riapertura non può includere altre
modifiche nella stessa scrittura. Nessun DELETE diretto è concesso ai client.
La rimozione di un ente da un progetto attivo rimane vietata; modifiche complesse
al partenariato devono rispettare i vincoli differiti nella stessa transazione.

Revoca membership e disabilitazione profilo vengono rilette alla query successiva,
anche con lo stesso token. Non si promette l'interruzione retroattiva di query già
in esecuzione: valgono gli snapshot PostgreSQL. Le scritture fondative richiedono
READ COMMITTED, come nelle milestone precedenti.

## Funzioni privilegiate

Quattro owner dedicati, senza LOGIN, SUPERUSER, BYPASSRLS o membership:

- `ariadne_reader`: sole letture fondative per helper non ricorsivi e RPC minime;
- `ariadne_guard`: letture e lock per vincoli, più cancellazione controllata del
  solo collegamento a un ente in bozza;
- `ariadne_auditor`: solo INSERT audit e uso della sua sequenza;
- `ariadne_identity`: provisioning profili e operazioni controllate su profili/ruoli.

Nessuno possiede tabelle. Policy interne esplicite accompagnano i grants; ogni
SECURITY DEFINER usa search_path vuoto e SQL statico. Nessuna routine trigger
è invocabile dal client. Lo schema `app_private` deve restare escluso dagli
schemi esposti da PostgREST; USAGE/EXECUTE limitati servono alle policy.
Il bootstrap rimane un'operazione SQL tecnica non esposta.

La migration richiede un operatore DB fidato con facoltà di creare i ruoli e
trasferire le funzioni. Controlla i ruoli omonimi preesistenti e rifiuta quelli
con privilegi elevati o membri. Sono ruoli cluster-wide, da mantenere dedicati.

## Verifiche eseguite

Tutti i comandi seguenti hanno dato esito positivo:

```bash
bash scripts/test-migrations.sh
bash scripts/test-auth-service.sh
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

La suite migration conserva le regressioni delle milestone 3 e 4 prima di
applicare la 5. Verifica applicazione da zero in due database con confronto
schema e rollback transazionale dell'intera catena.

[authorization.sql](../supabase/tests/authorization.sql) usa identità sintetiche
distinte con `SET ROLE authenticated`, non la service role: separazione progetti,
scritture Manager ammesse e negate, ricerca enti minima, nomi colleghi, revoca,
disabilitazione, anti-escalation, attributi protetti, audit, archiviazione,
riapertura, rimozione controllata in bozza, promozione/revoca Admin e ACL.
[authorization-concurrency.sh](../supabase/tests/authorization-concurrency.sh)
usa due connessioni autenticate concorrenti e dimostra che disabilitazione e
revoca non eliminano l'ultimo Admin attivo.

La suite GoTrue reale applica anche la nuova migration e verifica provisioning,
invito senza invio email, conferma, login, recupero e logout. I container temporanei
non montano dati operativi e vengono rimossi al termine. Non è stato eseguito un
collaudo HTTP PostgREST della nuova API né un collaudo UI dei progetti, ancora assente.

## Rilascio produzione — 14 ottobre 2026

- Backup `/var/backups/management-progetti/20261014T110927Z`: checksum,
  `pg_verifybackup` e ripristino isolato verificati.
- Rehearsal sulla copia del database operativo: il ruolo `postgres` non dispone
  dei privilegi necessari per trasferire le funzioni. Ripetizione con
  `supabase_admin` riuscita, senza modificare le credenziali o i privilegi di postgres.
- Migration applicata via SSH con `supabase_admin`, insieme alla registrazione
  della versione/nome/testo in `supabase_migrations.schema_migrations`, nella
  stessa transazione. Dry-run del wrapper ordinario: database aggiornato.
- Pubblicazione GitHub e verifica deployment Vercel in corso.

## Collaudo manuale consigliato

Adesso: accesso Admin, indicazione “Amministratore” nella pagina account, logout
ed eventuale recupero password. La milestone 5 aggiunge autorizzazioni backend,
non schermate di amministrazione. La milestone 6 introduce layout/navigazione;
il primo collaudo funzionale completo dei progetti ha senso dopo la milestone 7,
con Admin e Manager assegnato/non assegnato. Le prove economiche e di pianificazione
vanno aggiunte quando sono disponibili le rispettive milestone.
