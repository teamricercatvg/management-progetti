# Attività e date nel quadro logico

Richiesta del 16 ottobre 2026: anticipare attività e date previste/effettive
prima delle milestone 10–11. Rilascio autorizzato il 16 ottobre 2026.
Migration applicata al backend operativo e frontend pubblicato in produzione.

## Utilizzo

Nel quadro logico, ogni risultato attivo offre **Aggiungi attività a [codice]**.
Il risultato è preselezionato; il form consente di sceglierne un altro attivo
dello stesso progetto. Le attività compaiono sotto il risultato, ordinate per
ordine numerico e UUID a parità, con codice, titolo, descrizione, note e priorità.
Codice univoco tra le attività del progetto; non collide con i codici degli
obiettivi e risultati, che hanno un catalogo separato.

Le date di inizio/fine previste sono obbligatorie. Quelle effettive possono
restare vuote e vengono aggiunte durante l’esecuzione. Nessuna fine può precedere
il rispettivo inizio; la fine effettiva richiede anche l’inizio effettivo.
È possibile inserire una fine effettiva successiva alla fine prevista: il piano
non viene sovrascritto. Anche la correzione delle date effettive è consentita.

Il database ricava lo stato dalle date effettive: **Prevista**, **In corso**,
**Conclusa**. L’archiviazione è separata, mantiene tutte le date e rende l’attività
non modificabile fino alla riattivazione; riattivando, lo stato viene ricalcolato
dalle date conservate. Lo stato `cancelled` previsto dal modello rimane riservato
agli sviluppi successivi e non ha un comando nell’interfaccia attuale.

Per archiviare un risultato occorre archiviare tutte le attività collegate,
comprese quelle concluse. Per riattivare un’attività, prima riattivare il risultato.
Un risultato referenziato da attività non può cambiare tipo, neppure se le
attività sono archiviate. Non sono previste cancellazioni definitive.

## Confini e cronogramma futuro

La richiesta anticipa il collegamento attività–risultato e quattro date,
non tutta la milestone 10 o la 11. Nessun ruolo operatore, assegnazione operativa,
indicatore, report, Gantt o pubblicazione di revisioni viene aggiunto.

Per ora ogni attività ha un unico intervallo previsto, modificabile con audit.
Non è uno snapshot ufficiale: le date iniziali/correnti/effettive sono concetti
distinti. Quando sarà implementato il cronogramma, i periodi versionati diventeranno
la fonte del piano previsto, migrando i dati e preservando l’audit di questa fase.
Il controllo dei periodi rispetto alle date del progetto resta alla pubblicazione
del cronogramma. Qui si valida la coerenza dei due intervalli senza impedire la
registrazione degli scostamenti effettivi.

## Implementazione e sicurezza

Migration `20261016120000_activities_dates.sql`: tabella `activities`, FK composita
verso i risultati, indici, RLS, grants di colonna e trigger di integrità/audit.
Admin e Manager assegnati operano con sessione utente; nessuna service role.
Revoca membership e disabilitazione profilo seguono gli helper della milestone 5.
Progetti archiviati in sola lettura, anche per le chiamate dirette.

Lo stesso lock di progetto serializza modifiche delle attività e del quadro
logico; il controllo del risultato e dell’archivio avviene nel database, non
soltanto nel form. Il client non può riscrivere progetto, autore, timestamp o
versione. Le azioni di salvataggio/archiviazione controllano `row_version`;
i conflitti e gli errori mantengono i campi compilati. La riattivazione modifica
solo lo stato, preservando contenuti e date.

L’audit aggiunge collegamento al risultato, priorità, ordine, tutte le date e
stato precedente/successivo. Descrizioni e note non vengono duplicate nei log.
Il modello dati è aggiornato con la richiesta esplicita dell’utente.

## Verifiche

- Unit test: 10/10 superati.
- Suite browser completa: 20/20 superati; successiva verifica mirata superata
  dopo la correzione del reset delle selezioni in caso di codice duplicato.
- SQL su PostgreSQL isolato: migration ripetibile, schemi coincidenti, vincoli,
  RLS, audit, revoca accesso, concorrenza archiviazione/inserimento e rollback
  verificati con esito positivo.
- Typecheck, lint e build di produzione (`npm run build -- --webpack`) superati.
- Layout verificato a 1440, 390 e 320 px; controllo visivo finale del form e
  delle attività a 1440 e 320 px, inclusa conservazione dei campi dopo errore.

I test usano identità/dati sintetici e PostgreSQL temporaneo senza dati operativi.
La suite browser usa un backend fixture; la verifica delle autorizzazioni reali
è coperta dalla suite SQL isolata, non da una sessione sul sito in produzione.

## Rilascio

Frontend e migration vanno rilasciati insieme, applicando prima la migration
con backup e `supabase_admin` via SSH come per la milestone 8: il wrapper ordinario
non può trasferire l’ownership delle funzioni ai ruoli interni.
L’elenco del quadro logico interroga ora anche `activities`: non distribuire il
frontend senza la tabella.

- Backup verificato: `/var/backups/management-progetti/20261016T083421Z`.
- Migration applicata come `supabase_admin`, registrata nella stessa transazione;
  cache PostgREST ricaricata. Nessun dato di collaudo inserito in produzione.
- Commit applicativo `11052d0` pubblicato su `origin/main`. Deployment
  `dpl_7YsGNkXDU4vMHBCyXFAySxtYKkXC` READY in produzione; alias
  `www.ariadne-hub.it`, `ariadne-hub.it` e `management-progetti.vercel.app` verificati.
- RLS attiva con quattro policy: nessun SELECT anonimo, DELETE client o modifica
  di `created_by` consentiti. Healthcheck Auth/REST e protezione gateway superati.
- Pagina di accesso verificata nel browser sul dominio pubblico. Nessun collaudo
  autenticato con scritture di attività sul backend operativo.
- Modifiche preesistenti a infrastruttura, configurazione e accessi escluse.
