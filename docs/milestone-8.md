# Milestone 8 — Quadro logico

Data: 15 ottobre 2026. Rilascio richiesto dall’utente su `main`.
Migration applicata al backend dedicato e frontend pubblicato in produzione.

## Consegna

Il dettaglio progetto apre `/projects/[id]/quadro-logico`: albero di obiettivi
generali, obiettivi specifici e risultati attesi. Admin e Manager assegnati
possono creare e modificare gli elementi, scegliere il genitore, impostare
l'ordine numerico tra fratelli, descrizione e ipotesi/condizioni, archiviare e
riattivare. Ordinamento crescente per `sort_order`, quindi UUID a parità.
Gli elementi archiviati restano visibili. Progetti archiviati in sola lettura.

Si applica il modello approvato nella milestone 2: generale senza genitore,
specifico con un generale, risultato con uno specifico, sempre nello stesso
progetto. Il tipo di un elemento con figli non può cambiare. È ammesso spostare
un elemento verso un altro genitore del livello appropriato nello stesso progetto.
Indicatori, attività e rapporti non esistono ancora: le milestone successive
dovranno estendere i controlli strutturali alle rispettive dipendenze.

Archiviazione dal basso verso l'alto, riattivazione dall'alto verso il basso:
un elemento attivo richiede un genitore attivo. Per modificare un elemento
archiviato occorre prima riattivarlo con un'operazione separata. Nessuna
cancellazione fisica né cascata implicita. La milestone usa audit incrementale,
senza introdurre snapshot o un flusso di pubblicazione delle revisioni.

## Database e sicurezza

Migration `20261015120000_logical_framework.sql`: tabella, FK composita,
vincoli, indici, grants di colonna, trigger e RLS. Tutte le operazioni applicative
usano la sessione utente, senza service role. Admin vede tutti i progetti;
Manager vede solo quelli assegnati con membership e profilo attivi.

Il lock sul progetto serializza modifiche gerarchiche e archiviazione del
progetto; i controlli usano READ COMMITTED. `project_id`, autore, timestamp e
versione non sono scrivibili dal client. Le Server Actions filtrano la versione
precedente: un conflitto conserva i campi e chiede di ricaricare. Anche le
transizioni di stato controllano la versione. Errori SQL non esposti.

Codice maiuscolo unico nel progetto (1–80 caratteri), titolo 1–240,
descrizione/ipotesi fino a 10.000 caratteri, ordine intero 0–2147483647.
Audit con progetto, attore, tipo, genitore, codice, stato, ordine e versione;
i testi liberi non vengono copiati nel payload, coerentemente con l'audit
esistente. Non costituisce una cronologia recuperabile del contenuto testuale.

## Verifiche

- `npm run typecheck`, `npm run lint`, `npm test`: superati, 7 test unitari.
- `npm run build -- --webpack`: superata, inclusa la nuova route dinamica.
- `bash scripts/test-migrations.sh`: superata la catena completa, applicazione
  da zero due volte con schemi coincidenti, rollback e test RLS con identità
  distinte; vincoli gerarchici, versioni, audit, revoca e profili disabilitati.
- Test SQL concorrente: archiviazione del genitore e inserimento di un figlio
  da due sessioni autenticate; il secondo inserimento viene respinto.
- Browser: 12 test precedenti superati nella suite completa; 4 casi milestone 8
  superati nell'esecuzione finale mirata. Copertura: tre livelli, modifica,
  duplicati e conservazione input, ordinamento tra fratelli dopo reload,
  cambio genitore, archivio/riattivazione, conflitto fra schede, progetto
  archiviato e utente senza assegnazioni. Il test del conflitto è stato corretto
  per attendere la navigazione al form prima di aprire la seconda scheda.
- Nessun overflow orizzontale a 1440, 390 e 320 px; schermate albero/form in
  `test-results/` (ignorata), controllo visivo desktop e mobile.
- Revisione React: autenticazione nelle azioni, query con sessione sul server,
  componenti client limitati ai form, campi controllati, etichette e messaggi
  accessibili, invio bloccato durante il salvataggio, nessuna cache condivisa.
- `git diff --check`: superato. Integrati in fast-forward i tre commit remoti
  preesistenti fino a `7622c3c`; preservate le modifiche locali infrastrutturali.

Test SQL in PostgreSQL 15 isolato, senza dati operativi; test browser con fixture
locale sintetica, separati dalla verifica reale di RLS nel database. Nessun
collaudo autenticato del nuovo flusso sul backend operativo.

## Rilascio — 15 ottobre 2026

- Backup `/var/backups/management-progetti/20261015T095457Z` completato:
  `pg_verifybackup` e checksum di tutti gli archivi superati.
- Tentativo con wrapper ordinario annullato atomicamente per i privilegi di
  trasferimento owner mancanti a `postgres`, già documentati nella milestone 5.
- Migration applicata via SSH con `supabase_admin`, registrando versione, nome
  e testo in `supabase_migrations.schema_migrations` nella stessa transazione;
  ricaricata la cache schema PostgREST. Nessun dato di collaudo inserito.
- Account GitHub `teamricercatvg`, Vercel `teamricercatvg-8749`, scope
  `tor-vergata-igiene`, progetto `management-progetti` verificati.
- Commit applicativo `6f58521` pubblicato su `origin/main`; stato GitHub Vercel
  `success`, deployment `dpl_oE6BNLdmL97EyKwHs8B2rFYwBUgS` READY in produzione.
  Alias `www.ariadne-hub.it`, apex e `management-progetti.vercel.app` verificati.
- Dry-run Supabase: database aggiornato. RLS attiva con quattro policy;
  nessun accesso anonimo, DELETE client o modifica dell'autore consentiti.
- Healthcheck Auth/REST e protezione gateway superati; signup pubblico e
  utenti anonimi disabilitati. Browser sul dominio pubblico: la nuova route
  senza sessione reindirizza a `/login`, visualizzato correttamente.
- Nessuna scrittura di dati applicativi di collaudo in produzione. I flussi
  autenticati completi sono coperti dalle suite locali/isolate descritte sopra.
- Modifiche preesistenti a `.env.example`, infrastruttura e accessi escluse
  dai commit e dal deploy Git. Nessuna modifica alle variabili Vercel.


## Chiusura definitiva — 20 ottobre 2026

Confermata dall’utente la conclusione della Milestone 8. Integrate le migliorie
approvate in localhost: rischi e mitigazioni facoltativi; output attività;
sidebar chiusa di default; testi su una riga con Altro; rischi richiusi;
albero espandibile per ramo o globalmente; azioni a icona e aggiunta contestuale
di risultati e attività. Archiviazione ramo atomica con conferma, RLS,
versione del nodo radice e lock del progetto; nessuna eliminazione definitiva.
Le migration `20261020120000` e `20261020130000` sono applicate e registrate
sul backend con backup preventivi (dettagli in activities-dates.md).
Test browser su fixture e SQL su PostgreSQL isolato verificano i flussi;
nessuna scrittura di collaudo sui progetti reali.

### Verifica rilascio finale

Commit applicativo `91317ab` pubblicato su main. Deployment Vercel
`dpl_665zNPYp3XSBNzThinvAfvhfoFyA` verificato READY in produzione il
20 ottobre 2026, con alias `www.ariadne-hub.it`, `ariadne-hub.it` e
`management-progetti.vercel.app`. Superati type-check, lint, 12 test unitari,
25 test browser e build di produzione; suite SQL isolata superata nella
stessa sessione. Verifiche live limitate a stato deploy, alias e schema/permessi:
nessuna scrittura autenticata di collaudo sui dati operativi.
