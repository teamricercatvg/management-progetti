# Milestone 7 — Gestione progetti

Data: 14 ottobre 2026. Implementazione verificata su `main`; commit, push e
deploy richiesti dall’utente. Stato del rilascio riportato in fondo. Nessuna migration necessaria:
riutilizza schema, trigger, grants e RLS delle milestone 3–5. Nessuna modifica
ai dati del backend operativo.

## Consegna

- `/projects`: elenco dei soli progetti visibili alla sessione, ricerca per
  codice/titolo, filtro per stato, ordinamento stabile e pagine da 20 elementi.
  Stati vuoti distinti per assenza di assegnazioni e filtri senza risultati.
- `/projects/new`: creazione riservata agli Admin, sempre in bozza.
- `/projects/[id]`: anagrafica, periodo, valuta, finanziatore, descrizione,
  note, Manager attivi, enti associati e cambi di stato.
- `/projects/[id]/edit`: modifica per Admin e Manager assegnati. Progetti
  archiviati in sola lettura; riapertura separata dal salvataggio dei campi.
- Stati del modello approvato: bozza, attivo, concluso, archiviato. Nessuna
  cancellazione fisica. L'archiviazione conserva i dati.
- Ricerca minima degli enti esistenti tramite RPC e associazione come ente
  unico, capofila o partner; rimozione controllata delle associazioni in bozza.
  Attivazione/conclusione subordinate ai vincoli del partenariato nel DB.
- Panoramica aggiornata per indicare che la gestione progetti è disponibile.

## Validazione e autorizzazione

Obbligatori: codice, titolo, inizio, fine, valuta principale. Codice e valuta
normalizzati in maiuscolo; date di calendario valide e fine non anteriore
all'inizio. Limiti del form: codice 80, titolo/finanziatore 240,
descrizione/note 10.000 caratteri; valuta di tre lettere secondo il contratto
attuale del DB (nessun catalogo ISO aggiunto). I limiti di lunghezza sono
applicativi, non nuovi vincoli sulle API dirette.

Server Actions autenticate con `requireProfile()`, controlli di input e
allowlist esplicita dei campi. Nessun autore, ruolo o attributo audit deriva dal
form. Nessuna service role: tutte le query usano la sessione utente e le RLS.
Creazione riservata agli Admin sia nella pagina sia nell'azione e nel DB.
URL di progetti assenti e non autorizzati producono la stessa pagina non disponibile.
Errori del backend non vengono mostrati con dettagli SQL.

Modifiche e cambi di stato filtrano anche `row_version`: zero righe aggiornate
segnalano un conflitto o una perdita di accesso. Il trigger incrementa la versione
ed esegue l'audit. Il form conserva i valori in caso di errore, incluso codice
duplicato e date non valide. L'archivio non può ricevere modifiche ai campi,
neppure da richieste manipolate.

## Confini

La milestone non introduce gestione globale degli enti, inviti o assegnazioni
di Manager. Usa gli enti e le membership già presenti: le relative operazioni
amministrative restano quelle autorizzate nelle milestone precedenti. Se manca
un ente nell'anagrafica, il progetto può essere salvato in bozza e deve attendere
la sua predisposizione prima dell'attivazione. Cambi strutturali del partenariato
che richiedono più operazioni possono essere preparati riportando il progetto
in bozza. Non viene aggiunta una modifica atomica dell'intero partenariato.
Budget, quadro logico, indicatori e report restano fuori ambito.

## Verifiche

- `npm run typecheck`, `npm run lint`, `npm test` (5 test), `npm run build`: superati.
- Suite browser: 10 casi superati (suite e riesecuzione mirata del test enti
  dopo correzione del selettore). `npm run test:ui` copre flussi Admin/Manager, utente senza assegnazioni, accessi
  tramite URL, creazione/modifica, ricerca, archiviazione/riapertura, errori di
  validazione e duplicato con conservazione input, conflitto tra due schede,
  associazione/rimozione ente e regressioni Auth/navigazione.
- Browser con fixture locale sintetica: nessuna email o scrittura operativa.
  La fixture prova il contratto UI; non sostituisce Supabase reale.
- `bash scripts/test-migrations.sh`: suite SQL completa in PostgreSQL 15
  temporaneo senza rete/dati operativi; RLS con identità distinte, revoca,
  vincoli partenariato, versioni, audit, archivio e concorrenza.
- Layout verificato a 1440, 390 e 320 pixel senza overflow orizzontale;
  schermate elenco, dettaglio e form salvate in `test-results/` (ignorata).
- Revisione React: query indipendenti parallele, dati e accessi sul server,
  componenti client limitati ai form, label e messaggi accessibili,
  blocco invio durante le operazioni e assenza di cache condivisa fra utenti.

Non è stato eseguito un collaudo autenticato del nuovo flusso sul backend
operativo. Dopo un rilascio autorizzato, verificare con Admin e Manager reali
creazione in bozza, associazione ente, attivazione, modifica, archivio,
riapertura e isolamento tra progetti.
