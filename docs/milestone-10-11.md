# Milestone 10–11 — Attività e cronoprogramma

## Stato del 23 ottobre 2026

Implementazione pubblicata su main e in produzione dopo autorizzazione
dell’utente del 23 ottobre 2026. Migration applicata e frontend READY verificato.
Le verifiche elencate sotto distinguono database isolato, interfaccia fixture e
produzione. Non dichiarare concluso il collaudo umano di Chiara prima del riscontro.

## Perimetro e decisioni

Richiesta del 23 ottobre: completare 10 e 11 con riferimento al cronoprogramma
Tirana e supportare attività QL, autonome, propedeutiche, amministrative e fasi
collegate a una attività QL. Questa richiesta estende il precedente rinvio delle
sotto-attività limitatamente al loro calendario; non introduce operatori,
assegnazioni personali, dipendenze automatiche, indicatori misurati o budget.

- Attività QL: stessa riga/ID esistente, collegata a un risultato.
- Attività autonome: nessun risultato obbligatorio; categoria propedeutica,
  generale/trasversale o amministrativa. Non appaiono come risultati fittizi.
- Sotto-attività: collegamento esplicito a un’attività QL dello stesso progetto,
  una sola profondità. Restano righe autonome nel calendario, con date effettive
  proprie; nessuna somma o propagazione automatica al genitore.
- Soggetti coinvolti: testo descrittivo, non conferisce accessi o assegnazioni.
- Annullamento con motivazione: conserva contenuti e date. Ripresa ricalcola lo
  stato dalle date effettive. Archivio/riattivazione preservano l’annullamento.
  Lo storico pubblicato resta invariato: la revisione successiva deve annullare
  i periodi delle attività archiviate/annullate prima di pubblicare.
- Archivio QL: conserva il comportamento di archiviazione del ramo; le righe
  autonome collegate come fasi restano distinguibili e non sono cancellate.

## Cronoprogramma e riferimento Tirana

Riferimento letto: cronoprogramma Tirana, estrazione della revisione 20 ottobre,
con mesi M1–M36, attività per risultato, fasi, soggetti e sezioni propedeutiche e
trasversali. Nessuna importazione o modifica dei documenti Tirana.

La griglia mostra mesi relativi al mese di avvio e mese/anno di calendario;
le date esatte restano visibili nei periodi. M1 è il mese di calendario che
contiene l’avvio, anche se parziale. Righe raggruppate per risultato o categoria.
Legenda testuale e cromatica: iniziale, corrente, selezionato e consuntivo.
Le attività iniziate senza fine effettiva sono visualizzate fino a oggi.

Ogni attività può avere più periodi, anche separati o sovrapposti. La sovrapposizione
sulla stessa attività è segnalata ma ammessa. La sintesi QL mostra min/max e numero
di periodi, esplicitando che l’intervallo include eventuali pause. Legge il piano
corrente, oppure la bozza prima della prima pubblicazione. Mai le vecchie date.

Una sola bozza per progetto. Creazione copia integralmente i periodi del corrente,
compresi quelli annullati, con `period_key` stabile. Ogni salvataggio incrementa
la versione della bozza. Una pubblicazione atomica fissa snapshot delle attività,
periodi e date progetto; la prima fissa anche il piano iniziale. La motivazione è
obbligatoria. Admin e Manager assegnati pubblicano senza secondo approvatore.

I periodi possono uscire dai confini in bozza (segnalazione), ma non alla
pubblicazione. Il progetto non può restringere le date escludendo periodi attivi
del piano corrente. Il consuntivo può oltrepassare la fine progetto.
Lo storico usa titoli e soggetti delle attività salvati alla pubblicazione;
lo stato attuale e il consuntivo sono esplicitamente dati correnti.

## Migrazione e conservazione

Migration: `20261023100000_schedule.sql`.
Censimento operativo iniziale: 9 attività, 0 archiviate, 0 annullate, 0 intervalli
fuori progetto. Tutti gli intervalli precedenti vengono copiati in bozze con
provenienza dichiarata, senza inventare un’approvazione storica. Per eventuali
attività archiviate/annullate vengono importati periodi annullati; date fuori
progetto restano identiche e devono essere corrette o annullate nella bozza.

Le colonne legacy restano in archivio, non modificabili dai client; le nuove
attività non le compilano. Le date effettive, ID, risultati e audit restano intatti.

Ripristino del backup `20261023T011655Z` in container isolato senza rete:
backup verificato; migrazione sulla copia; hash di tutte le colonne preesistenti
delle attività identico prima/dopo; 9 attività e 9 periodi, 0 revisioni approvate.
La copia è stata rimossa al termine. Nessuna scrittura di collaudo in produzione.

## Sicurezza e verifiche

Tabelle con RLS e sola lettura per i client. Scritture tramite RPC con owner
NOLOGIN dedicato senza BYPASSRLS, controllo accesso dopo lock del progetto,
versione ottimistica e controllo della base corrente. Snapshot approvati
immutabili anche tramite trigger; cancellazione fisica vietata. Audit per
periodi, revisioni e pubblicazione; nessun testo libero duplicato nei log.

SQL isolato: catena da zero, rollback, attività indipendenti e riferimenti,
annullamento/ripresa/archivio, date effettive oltre progetto, RLS Admin/Manager,
manager estraneo, anon, snapshot, confronto chiavi, limiti date e conflitti.
Concorrenza: due creazioni simultanee producono una sola bozza; seconda richiesta rifiutata. Revoca membership verificata.

Verifiche finali: 20 test unitari, 30 test browser sulla build di produzione locale,
typecheck, lint e build Webpack superati. Test browser con fixture sintetica;
la sicurezza database è verificata dalla suite SQL, non simulata dai test UI.
Griglia controllata a 1440 e 390 px; form attività anche a 320 px.

Durante la build è stata rilevata una vulnerabilità di Next.js 16.4.0; aggiornato
Next.js ed eslint-config-next alla patch 16.4.2. Audit delle dipendenze runtime: 0 vulnerabilità. Restano 5 segnalazioni
transitive negli strumenti di sviluppo ESLint, fuori dal bundle di produzione.

## Collaudo per Chiara

1. Aprire un progetto → Cronoprogramma; controllare la bozza importata.
2. Creare una attività QL e ritrovarla sotto il risultato; creare una attività
   amministrativa senza risultato e una fase collegata a un’attività QL.
3. Compilare i soggetti coinvolti, inserire due periodi separati e verificare
   i mesi occupati e la pausa; provare una sovrapposizione.
4. Pubblicare il primo piano con motivazione, creare una revisione, spostare
   un periodo e annullarne un altro. Controllare iniziale/corrente/selezionato.
5. Registrare inizio/fine effettivi, anche in ritardo; verificare stato e griglia.
6. Annullare e riprendere un’attività; archiviare e riattivare verificando che
   contenuti e date rimangano. Revisionare i periodi prima della pubblicazione.
7. Provare due finestre aperte sulla stessa bozza: il secondo salvataggio
   obsoleto deve richiedere ricaricamento senza perdere i campi compilati.
8. Controllare la consultazione a schermo piccolo e lo scorrimento del calendario.


## Rilascio verificato — 23 ottobre 2026

- Backup aggiornato `/var/backups/management-progetti/20261023T124612Z`, verificato
  e ripristinato in isolamento; stessa prova di migrazione e confronto integrale
  delle colonne delle attività superata sulla copia aggiornata.
- Migration applicata come `supabase_admin` e registrata nello storico nella
  stessa transazione, con confronto dei valori prima/dopo e rollback automatico
  in caso di differenze. 9 attività, 9 periodi, 0 piani approvati.
- RLS attiva su tutte e tre le tabelle; healthcheck backend/Auth/REST superati.
- Commit `9dd691b` (patch Next.js) e `6c205fb` (M10–11) pubblicati su main.
- Deployment `dpl_DRtvz9oHv9uM8cUmEr2wJykbvLyk` READY e alias
  `www.ariadne-hub.it`, `ariadne-hub.it`, `management-progetti.vercel.app`
  verificati. Login HTTP 200; cronoprogramma anonimo reindirizzato al login.
- Mail inviata a Chiara nel thread «Sviluppo App», firmata Codex, con funzionalità,
  limiti e prove di collaudo. Gmail conferma SENT, ID `1a168cf11d1ae566`.
- Nessuna attività di prova scritta in produzione; il collaudo umano è richiesto,
  non attestato. Modifiche preesistenti a env, infrastruttura e accessi escluse.
