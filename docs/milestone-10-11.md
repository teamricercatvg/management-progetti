# Milestone 10–11 — Attività e cronoprogramma

## Riallineamento del repository — 2 novembre 2026

Consegna su `main` delle modifiche locali: UI già pubblicata il 28–30 ottobre,
cestino con ripristino e cancellazione definitiva Admin, migration, test e
documentazione. Lo stato descritto nelle sezioni precedenti per data resta
storico: il cestino non è attestato in produzione.

Confrontata una copia temporanea dei sorgenti con il manifest del rilascio
`dpl_HXbrEjByxmEM1NvRE6A6bR4nhe11`, applicando su quella copia la patch che
esclude il cestino: tutti i file `src/` e il lockfile coincidono. Le sole
differenze del manifest sono `.gitignore` e il generato `next-env.d.ts`.
Questa è una verifica delle evidenze locali di rilascio, non una nuova verifica
autenticata del sito. Manifest e patch sono versionati in
`verifiche/rilascio-ui-20261030/`; screenshot e SQL operativi locali sono esclusi.

Aggiunta in `vercel.json` la sospensione del deploy Git automatico di `main`,
necessaria finché manca la migration del cestino sul backend. Nessun deploy o
aggiornamento del database è parte di questo riallineamento. Ordine SQL e
procedura di riattivazione nel [modello del cestino](activity-deletion-proposal.md).
Verifiche del 2 novembre nel [collaudo](collaudo-milestone-10-11.md).

## Correzione navigazione pubblicata — 30 ottobre 2026

La navigazione comune nasconde il pulsante della sezione già aperta, mostrando
solo le altre destinazioni. Deploy richiesto ed eseguito:
`dpl_HXbrEjByxmEM1NvRE6A6bR4nhe11`, produzione READY, alias
`https://www.ariadne-hub.it`. Next.js 16.4.2, build remota completata in 8 s.
Typecheck, lint e test browser della navigazione superati prima del rilascio.
Pacchetto precedente senza cestino, con modifica soltanto a navigazione/CSS
oltre ai riferimenti generati in next-env.d.ts. Nessuna migration, commit o push.
Verifica produzione tramite stato e alias Vercel; browser autenticato non usato.

## Rilascio UI senza cestino — 30 ottobre 2026

Su richiesta dell’utente pubblicate soltanto le modifiche che non richiedono la
migration: versione aggiornata e storico con orologio, etichetta “Azione”,
navigazione comune tra sezioni e correzione dell’icona archivio. Conservate le
migliorie precedenti a dettagli espandibili e barre previsto/effettivo.

Deployment `dpl_BWFHTkwk53aFWB9yYwz96g38PwiU` READY in produzione, alias
`https://www.ariadne-hub.it`. Profilo `teamricercatvg-8749`, scope
`tor-vergata-igiene`, progetto `prj_pTLN65jStwKna0FdRKlrZVVQUdsW` verificati.
Build remota Next.js 16.4.2 completata (12 s); typecheck, lint, build locale e
scenario browser revisioni/navigazione sul pacchetto esatto superati.

Cestino, ripristino dal cestino, eliminazione definitiva e nuove colonne/RPC
esclusi dal pacchetto. Nessuna migration applicata, nessun commit/push. Il codice
del cestino resta nel checkout come lavoro locale non pubblicato: non eseguire
un deploy indiscriminato del checkout prima della migration.
Manifest SHA256 del pacchetto e patch di esclusione in
`verifiche/rilascio-ui-20261030/`. File env esclusi con `.vercelignore`.
Verifica UI autenticata in produzione non eseguita: accesso browser ancora
bloccato dall’impostazione salvata; conferma rilascio tramite stato Vercel.

## Ulteriori modifiche locali — 30 ottobre 2026

Versione aggiornata in evidenza (bozza se presente, altrimenti piano corrente),
versioni precedenti dietro l’icona orologio, avviso durante la consultazione
storica e collegamento di ritorno. Creazione revisione in un pannello espandibile.
“Sotto-attività” rinominata “Azione” nei form e “Azioni del QL” nella griglia;
nessuna modifica ai valori interni o al database.
Navigazione comune tra dettaglio progetto, quadro logico, cronoprogramma e
indicatori, disponibile anche dalla modifica progetto.

Richiesta aggiuntiva per cestino ed eliminazione definitiva Admin: modello
[approvato e implementato](activity-deletion-proposal.md), con migration
versionata e test SQL isolati per permessi, storico, audit e concorrenza.
Typecheck, lint, unit test, tre test browser e build superati. Il cestino resta locale; le modifiche UI sono pubblicate nel rilascio descritto sopra.

## Deploy verificato — 30 ottobre 2026

Pubblicazione richiesta dall’utente ed eseguita con il profilo dedicato
`teamricercatvg-8749`, scope `tor-vergata-igiene`, progetto
`prj_pTLN65jStwKna0FdRKlrZVVQUdsW`.
Deployment `dpl_8xVx3g8fNEHfqwu2fBK48zFPrqYp` **READY**, target production;
alias `https://www.ariadne-hub.it` confermato da Vercel inspect.
Build remota Next.js **16.4.2** completata (28 s); Node selezionato da Vercel
26.x in base al vincolo già presente `>=22`.

Pacchetto isolato dal checkout locale, base `6e5f524` più le modifiche al
cronoprogramma; nessun commit/push. Esclusi documenti, screenshot, test e segreti;
`.vercelignore` esclude `.env` e `.env.*`, anche il file creato da Vercel link.
Installazione pulita con lockfile riparato per le dipendenze opzionali emnapi
mancanti, senza aggiornare le versioni già bloccate. Lockfile riportato nel
checkout; typecheck e lint sul pacchetto riusciti. Audit runtime: zero
vulnerabilità; resta una segnalazione high nelle dipendenze di sviluppo.
L’installazione node_modules del checkout originale non è stata modificata.

Verifica autenticata nel browser non eseguita: primo accesso negato; nuovo
tentativo richiesto dall’utente bloccato da un’impostazione di autorizzazione
salvata. Nessuna scrittura di dati operativi o modifica database.

## Modifica locale — 30 ottobre 2026

Su richiesta di collaudo, le righe del cronoprogramma mostrano inizialmente
solo codice/titolo e il pulsante “Mostra dettagli”. Il titolo apre il form
esistente dell’attività corrente quando modificabile; le revisioni pubblicate
continuano a mostrare gli snapshot e non vengono alterate dalla modifica.
I dettagli includono soggetti, descrizione, output, note, stato/date effettive,
riepilogo e singoli periodi con confronto iniziale e modifica della bozza.
L’elenco separato sotto la tabella è rimosso.

La griglia e la legenda hanno due sole barre: **previsto** (revisione selezionata)
e **effettivo** (date correnti). Conservate continuità, pause e selezione delle
revisioni. Nessuna migration o modifica ai dati operativi; nessun commit, push
o deploy eseguito per questa richiesta.

Verificati typecheck, lint, 20 test unitari, build Webpack e test browser
con fixture isolata: apertura/chiusura dettagli, titolo → form, modifica periodi,
revisioni e assenza di overflow a 1440/390 px. Screenshot locali in
`test-results/schedule-1440.png` e `test-results/schedule-390.png`.
La build locale usa Next.js 16.4.0 installato, mentre il manifest richiede
^16.4.2: il runtime ha emesso un avviso di sicurezza. Dipendenze non aggiornate
nell’ambito di questa modifica UI; riallineare l’installazione prima di un rilascio.

## Aggiornamento pubblicato — 28 ottobre 2026

La griglia usa barre continue nei mesi consecutivi, su quattro righe fisse
per iniziale, corrente, selezionato ed effettivo. Le lettere compaiono all’inizio
di ciascun tratto; i mesi vuoti interrompono le barre. Rimane una vista mensile,
con date esatte nell’elenco dei periodi. Nessuna modifica ai dati o alle revisioni.
Verificati typecheck, lint, 20 test unitari, build Webpack e anteprima browser
con fixture locale e pausa estiva. Screenshot:
`verifiche/barre-cronoprogramma-20261028/anteprima.jpg`.

Deploy richiesto dall’utente ed eseguito dopo autenticazione del profilo dedicato.
Account verificato `teamricercatvg-8749`, scope `tor-vergata-igiene`, progetto
`prj_pTLN65jStwKna0FdRKlrZVVQUdsW`. Wrapper aggiornato per usare la home
dell’utente corrente, mantenendo il profilo `vercel-teamricercatvg`.

Deployment `dpl_FAVyT5cSLr1E8kX6pCbSSZ4LFMSP` READY in produzione, alias
`https://www.ariadne-hub.it`. Build remota con Next.js 16.4.2 completata.
Pacchetto da checkout locale (base `6e5f524` più modifica a pagina e CSS),
senza commit/push; esclusi documenti locali, screenshot e file env dal caricamento.
Il primo tentativo è fallito per template Auth mancanti nel pacchetto; inclusi
`supabase/templates/`, il secondo tentativo è riuscito.
Verifica pubblica: login HTTP 200, CSS `schedule-bar`/`bar-start`/`bar-end`
presente, cronoprogramma anonimo reindirizzato al login, nessun riferimento
alla fixture locale nel bundle esaminato. Nessun host backend visibile nei chunk
del login: il client Supabase applicativo è inizializzato lato server; questa
verifica non attesta una nuova sessione autenticata in produzione.

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
