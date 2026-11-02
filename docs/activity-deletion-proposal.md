# Cestino attività e azioni — modello approvato il 30 ottobre 2026

Stato: regole approvate esplicitamente dall’utente il 30 ottobre 2026.
Implementazione e migration verificate in locale; non applicate in produzione.
Nessuna eliminazione operativa eseguita.

## Consegna Git e ordine di applicazione — 2 novembre 2026

La consegna riunisce le migliorie UI già pubblicate e il cestino ancora da
rilasciare. Il push non applica SQL. `vercel.json` sospende i deploy automatici
Git di `main` (`git.deploymentEnabled.main=false`) per evitare che le letture
`deleted_at`/`deleted_by` arrivino online prima delle colonne. Il deploy manuale
resta possibile e richiede la stessa verifica preventiva del backend.

Ordine completo su database nuovo (file in `supabase/migrations/`):

1. `20261007160217_foundations.sql`
2. `20261007160218_foundation_guards.sql`
3. `20261009120000_auth_profiles.sql`
4. `20261014120000_project_authorization.sql`
5. `20261015120000_logical_framework.sql`
6. `20261016120000_activities_dates.sql`
7. `20261020120000_activity_output.sql`
8. `20261020130000_archive_framework_branch.sql`
9. `20261020140000_indicators.sql`
10. `20261023100000_schedule.sql`
11. [20261030110000_activity_deletion.sql](../supabase/migrations/20261030110000_activity_deletion.sql)

Sul backend documentato come aggiornato al 23 ottobre serve soltanto l’ultima
migration: verificare prima la cronologia effettiva, senza rieseguire migration
registrate. Non sono necessarie altre nuove migration per questa consegna.
Il bootstrap e i file in `supabase/tests/` servono esclusivamente ai test isolati.

Per il rilascio: risolvere l’accesso SSH dedicato, verificare backup e cronologia,
applicare e registrare la migration del cestino, verificare colonne/RPC/RLS,
poi pubblicare il frontend e collaudare Admin/Manager. Rimuovere la sospensione
Git soltanto quando il database è compatibile e il rilascio è autorizzato.

File principali: componenti `activity-deletion.tsx` e `activity-trash.tsx`,
azioni server `quadro-logico/activity-actions.ts`, lettura `activity-data.ts`,
lista attività e pagine QL/cronoprogramma. I test SQL sono in
[activity-deletion.sql](../supabase/tests/activity-deletion.sql), il runner locale
in [test-activity-deletion-local.sh](../scripts/test-activity-deletion-local.sh),
le prove browser in [schedule.spec.ts](../tests/ui/schedule.spec.ts).
Esiti aggiornati e limiti nel [collaudo](collaudo-milestone-10-11.md).

## Interfaccia richiesta

- Conservare Archivia/Riattiva come operazione distinta dal cestino.
- Icona cestino per attività QL, autonome e azioni collegate.
- Cestino di progetto con ripristino; eliminazione definitiva disponibile solo
  all’Admin, con conferma esplicita e descrizione dei vincoli.
- Corretta l’icona archivio esistente, distinta dall’icona cestino.

## Modello e regole approvati

- Aggiungere `deleted_at` e `deleted_by` ad activities, entrambi null oppure
  entrambi valorizzati. Conservare status e date per il ripristino.
- Soft delete e ripristino consentiti ad Admin e Manager assegnato su progetti
  modificabili, con controllo versione e lock del progetto.
- Nessuna cascata implicita sulle azioni collegate: ciascuna resta un elemento
  autonomo. Un collegamento nuovo/ripristinato richiede il genitore non eliminato.
- Gli elementi eliminati escono dalle viste operative e dai selettori; restano
  consultabili nel cestino. Le revisioni pubblicate conservano gli snapshot.
- I periodi della bozza relativi all’elemento eliminato vengono annullati
  atomicamente, incrementando la versione della bozza. Il ripristino dell’attività
  non ripristina automaticamente i periodi: la pianificazione resta esplicita.
- La pubblicazione esclude attività eliminate dai nuovi snapshot e vieta periodi
  previsti su elementi eliminati. Non riscrive le revisioni già pubblicate.
- Eliminazione definitiva solo Admin, solo dal cestino, senza azioni figlie
  (anche nel cestino) né riferimenti in periodi o snapshot pubblicati. Non si
  modifica lo storico per consentire la cancellazione.
- Eventuali periodi presenti soltanto in bozza si eliminano nella stessa
  transazione, incrementando la versione della bozza e registrando l’audit.
- Audit minimale delle operazioni conservato anche dopo l’eliminazione fisica;
  nessun contenuto libero duplicato nell’audit.
- Scritture tramite RPC con owner dedicato senza BYPASSRLS; nessun privilegio
  DELETE diretto per i client. Controllo Admin nel database e nell’azione server.
  Non usare service role nell’applicazione per aggirare le regole.

## Verifiche eseguite

Migration `20261030110000_activity_deletion.sql` e test SQL isolati per Admin, Manager assegnato/estraneo,
anonimo; controlli di concorrenza e versione; blocco dei riferimenti storici;
ripristino e periodi di bozza; impossibilità di aggirare i controlli tramite API.
Tre test browser superati con fixture: revisioni/navigazione e cestino per
Manager/Admin (con annullamento della conferma, ripristino e cancellazione).
Typecheck, lint, 20 test unitari e build Webpack con Next.js 16.4.2 superati.
Test SQL eseguiti con `bash scripts/test-activity-deletion-local.sh`: cluster
PostgreSQL 15.19 temporaneo su socket Unix, schema ricreato due volte e
confrontato, regressione cronoprogramma e concorrenza. Cluster rimosso a fine
prova; nessun servizio PostgreSQL permanente avviato.
Deploy autorizzato dall’utente il 30 ottobre (“fai deploy quand’è pronto”).
Rilascio in attesa dell’accesso al backend: manca il file SSH indicato dai wrapper;
la chiave locale `~/.ssh/ariadne_ed25519` non è accettata per `root` sul server
verificato. Richiesti utente/configurazione corretti. Il frontend con il cestino
non deve essere pubblicato prima della migration, perché legge le nuove colonne.
Vercel resta accessibile con il profilo dedicato; pacchetto frontend preparato e
build verificata. Nessuna migration operativa o nuovo deploy eseguiti.


## Rinvio del cestino e rilascio UI

Successivamente l’utente ha richiesto il deploy del resto rinviando il cestino
definitivo. Per compatibilità con il database, il pacchetto pubblicato esclude
l’intero cestino e le relative letture/scritture; nessuna migration applicata.
Deployment UI `dpl_BWFHTkwk53aFWB9yYwz96g38PwiU` READY. Il lavoro del cestino
resta locale e richiede un futuro rilascio backend prima del relativo frontend.
