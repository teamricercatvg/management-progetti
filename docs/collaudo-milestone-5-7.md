# Collaudo milestone 5–7 — 15 ottobre 2026

**Stato aggiornato: collaudo funzionale Admin/Manager e SQL/RLS eseguito,
con il difetto applicativo M6-01 corretto e pubblicato.**
Il collaudo non è più bloccato da account, enti o accesso al backend.
La correzione di “Riprova” è in produzione dal commit `4a92317`.
Recupero/cambio password effettivi e telefono fisico
restano verifiche manuali non eseguite. Vedere la prosecuzione finale sotto.

Le sezioni iniziali conservano gli esiti della prima sessione; per lo stato
corrente prevalgono le sezioni “Identificazione diretta Vercel” e
“Prosecuzione con backend reale e Manager”.
Checkout `main` aggiornato in fast-forward a `3bd429c`; versione applicativa
indicata dalla consegna di rilascio: `e98c9a3`. Deployment corrente identificato
direttamente nel pannello Vercel: vedere la verifica sotto. Prove pubbliche eseguite su
https://www.ariadne-hub.it con il browser integrato Codex e sessione Admin.
Nessuna modifica allo schema, alle configurazioni o alle credenziali.
Commit, push e deploy richiesti dall’utente dopo il collaudo e completati.
Gli esiti seguenti descrivono anche le fasi precedenti; per il rilascio fa fede
la sezione finale “Rilascio della correzione”.

## Controlli locali ripetuti

| Controllo | Esito |
| --- | --- |
| Installazione pulita `npm ci` | Inizialmente fallita; riuscita dopo riparazione del lockfile |
| `npm run lint` | Superato, anche dopo modifica dei test |
| `npm run typecheck` | Superato dopo rigenerazione cache Next |
| `npm test` | 5/5 superati, ripetuti dopo le modifiche |
| `npm run build -- --webpack` | Superato |
| `npm run test:ui` | 10/10 superati con fixture sintetica |
| Caso Admin esteso a date e valuta invalida | Superato nella riesecuzione mirata |
| `git diff --check` | Superato |
| SQL/RLS e GoTrue reali | Non rieseguiti su questo Mac: manca accesso operatore |

La suite browser usa Chrome, fixture Auth/RPC locale e identità sintetiche.
Non dimostra il comportamento del backend reale. Copre Admin, Manager,
utente senza assegnazioni, profilo inattivo, URL negati, CRUD progetti,
conflitto, associazione/rimozione enti, logout, regressioni HTTP Auth e
responsive. I risultati SQL/GoTrue riportati nelle consegne precedenti
restano evidenze storiche, non verifiche ripetute in questa sessione.

## Collaudo autenticato sul sito pubblico

| Prova / ruolo | Esito osservato |
| --- | --- |
| Anonimo: `/projects` prima del collaudo | Redirect a login |
| Admin: `/admin` | Pagina iniziale riservata accessibile |
| Admin: ricarica e navigazione Progetti, Panoramica, Account | Sessione mantenuta, pagine disponibili |
| Admin: apertura modifica password | Modulo disponibile; nessuna password cambiata |
| Admin: creazione bozza A e B | Salvate, date e valuta corrette nel dettaglio |
| Admin: modifica note e ricarica | Modifica persistente |
| Admin: codice duplicato | Rifiutato con «Codice o associazione già presente. Usa un valore diverso.» |
| Admin: obbligatori vuoti | Browser impedisce invio: «Compila questo campo.» |
| Admin: fine precedente all’inizio | Rifiutata con messaggio pertinente |
| Admin: valuta `12!` | Rifiutata con richiesta di codice di tre lettere |
| Admin: attivazione senza enti | Rifiutata con spiegazione del partenariato necessario |
| Admin: ricerca enti `COLL` | Nessun risultato; non prova l’assenza di tutti gli enti nel DB |
| Admin: conflitto fra due schede | Seconda modifica rifiutata, testo delle note conservato nel form; ricarica della prima conferma assenza di sovrascrittura |
| Admin: archiviazione | Comandi di modifica e ricerca enti rimossi |
| Admin: URL `/edit` di archivio | Messaggio «Progetto archiviato: riaprilo dal dettaglio prima di modificarlo.»; nessun form |
| Admin: riapertura in bozza | Comando separato riuscito, modifica nuovamente disponibile |
| Admin: ricerca per codice e filtro Archiviato | Restituito solo A fra i due progetti |
| Admin: elenco e menu a 390×844 | Ispezione visiva positiva; scrollWidth 390, innerWidth 390 |
| Admin: logout | Conferma disconnessione; altra scheda su `/projects` rimandata a login |
| Anonimo dopo logout: `/admin`, `/projects/new` | Redirect a login |

La verifica a 390 px è una simulazione, non una prova su telefono fisico.
La paginazione oltre 20 record non è stata collaudata in produzione.
Login con credenziali e ricezione email di recupero non sono stati eseguiti:
la sessione Admin era disponibile nel browser durante il collaudo.

## Problemi e correzioni

### Setup: lockfile incompleto — corretto solo localmente

- Ruolo: sviluppatore, installazione locale; Node 24.21.0, npm 11.19.0.
- Passaggi: checkout aggiornato, `npm ci`.
- Atteso: installazione riproducibile dal lockfile.
- Ottenuto: EUSAGE, mancano `@emnapi/runtime@1.11.3` e `@emnapi/core@1.11.3`.
- Correzione: rigenerato `package-lock.json` con `npm install --package-lock-only
  --ignore-scripts --no-audit --no-fund`; nessuna modifica a `package.json`.
- Ripetizione: installazione pulita riuscita; lint, test, build e browser superati.
- Stato: locale, non committato/pubblicato.

Il primo typecheck leggeva tipi generati per le vecchie route della milestone 4.
La cache `.next` è stata conservata in `/tmp/ariadne-next-pre-collaudo-20261015`
e rigenerata. Non è un difetto del codice corrente. Il file generato
`next-env.d.ts` è stato riportato al contenuto versionato dopo le prove.

### Conservazione date dopo errore — osservazione da approfondire

- Ruolo: Admin; pagina `/projects/new`, browser integrato Codex, sito pubblico.
- Passaggi: compilare codice/titolo e date con automazione browser; inviare
  fine anteriore all’inizio oppure valuta `12!`.
- Atteso: errore comprensibile e tutti i campi conservati.
- Ottenuto: messaggio corretto, codice/titolo conservati, ma input date vuoti
  dopo la risposta; per proseguire sono stati reinseriti.
- Il test locale in Chrome è stato ampliato con asserzioni esplicite sulle due
  date dopo entrambi gli errori e sulla valuta invalida: passa.
- Non è stabilito se la differenza dipenda dall’automazione dei campi date nel
  browser integrato o dalla versione/ambiente pubblico. Non è stata applicata
  una correzione applicativa senza una riproduzione affidabile.
- Prossimo controllo: inserimento manuale delle date in Chrome/Safari sul sito
  pubblico, errore e verifica conservazione, anche su telefono reale.

File test modificato: `tests/ui/projects.spec.ts`. Il nuovo errore valuta
rendeva ambiguo il selettore «Codice»; reso specifico al campo codice.
Il caso esteso è poi passato. Modifica soltanto locale.

## Dati di prova rimasti in produzione

| Codice | ID | Stato finale |
| --- | --- | --- |
| COLL-20261015-A | 8bbf7335-c5be-4008-b871-af9bac51a97f | Archiviato dopo archivio, riapertura e nuova archiviazione |
| COLL-20261015-B | 15de2f32-8366-4599-ac0c-b85de7d3069d | Bozza, disponibile per prosecuzione |

Titoli prefissati «COLLAUDO 15 ottobre 2026». Nessun ente o Manager assegnato.
Nessuna cancellazione fisica. A conserva la nota del primo salvataggio
concorrente; il secondo salvataggio non l’ha sovrascritta.

## Condizioni per completare il collaudo

1. Rendere disponibile una sessione Manager dedicata e assegnarla soltanto a
   uno dei due progetti, riaprendo A se necessario prima di modificarne le
   membership. Verificare lettura/modifica e isolamento dall’altro progetto,
   menu nascosti e URL `/admin` e `/projects/new` negati.
2. Individuare o predisporre enti di prova; verificare associazione/rimozione,
   ente unico, capofila con partner, attivazione e conclusione.
3. Ripristinare accesso operatore per ripetere SQL/RLS/GoTrue isolati e verificare
   revoche, disabilitazioni, audit e ultimo Admin senza alterare utenti reali.
   Il wrapper `scripts/server.sh` punta a un profilo SSH di un altro Mac;
   qui mancano `.env.local`, directory privata Ariadne e configurazione SSH.
4. Completare recupero via email e cambio password con il titolare al browser;
   verificare riuso link, login con nuova password e telefono fisico.
5. Riprodurre manualmente l’osservazione sulle date; collaudare paginazione,
   stato errore/riprova e indisponibilità backend in ambiente isolato.

I file preesistenti `docs/collaudo-milestone-4.md` e `verifiche/` sono stati
preservati. Nessun risultato non eseguito viene considerato superato.

## Identificazione diretta Vercel — prosecuzione del 15 ottobre 2026

Verifica in lettura nel pannello autenticato Vercel, prima degli ulteriori
passi di collaudo, come richiesto dall’utente:

- Team: **Tor Vergata - Igiene**, scope `tor-vergata-igiene`.
- Progetto: `management-progetti`, repository `teamricercatvg/management-progetti`.
- Deployment corrente di produzione: `dpl_7iMTFtmEKK1ome43FVmPRgDnnRKL`.
- Stato: **Ready**, ambiente **Production**; build di 32 secondi,
  pannello con riferimento temporale 14 ottobre 2026, 16:20:06 CEST.
- URL deployment: `management-progetti-h41vbp2ed-tor-vergata-igiene.vercel.app`.
- L’Overview di produzione associa `www.ariadne-hub.it` e
  `management-progetti.vercel.app` a questo deployment.
- Sorgente: branch `main`, commit completo
  `3bd429cacbe49d94bde7d1256d40566e0322d650`.
- Confronto Git `e98c9a3..3bd429c`: soltanto README e documentazione di
  milestone/roadmap; nessuna differenza nel codice applicativo.
- [Evidenza nel pannello deployment](https://vercel.com/tor-vergata-igiene/management-progetti/7iMTFtmEKK1ome43FVmPRgDnnRKL).

Il deployment `dpl_8vzuBnxHvB2bfWMvmAW8pcV9GuJ5` della consegna storica è
stato quindi seguito dal deploy del commit documentale. L’identificazione
Vercel è ora completata; nessun rilascio o cambiamento di configurazione.

Il wrapper CLI usa percorsi dell’altro Mac non disponibili qui; il connettore
Vercel espone soltanto lo scope personale, non quello del progetto. Il pannello
browser ha invece consentito la verifica nello scope corretto.

Passo successivo tentato: apertura di `https://supabase.ariadne-hub.it` per
predisporre le condizioni del collaudo completo. Il browser restituisce
`net::ERR_INVALID_AUTH_CREDENTIALS`: manca l’accesso Basic Auth a Studio.
Richiesta autenticazione diretta al titolare o percorso della configurazione
operatore su questo Mac, senza trasmissione di password in chat. Questo è un
blocco di accesso operativo, non un difetto funzionale dell’applicazione.

## Prosecuzione con backend reale e Manager — 15 ottobre 2026

Accesso a Supabase Studio riuscito nella sessione Chrome autenticata dal
proprietario. Conteggi preliminari: 3 profili, 1 Admin attivo, 0 membership,
0 enti. Il blocco Basic Auth è risolto.

L’utente ha scelto un account esistente, attivo e non Admin come Manager;
nessun nuovo account, invito, password o ruolo globale è stato creato.
È assegnato soltanto a `COLL-20261015-B`. Su successiva indicazione dell’utente,
l’assegnazione inizialmente predisposta per un altro account è stata revocata.
Le identità personali non sono riportate nel repository.

### SQL/RLS sul database reale

Due suite eseguite attraverso SQL Editor, con identità sintetiche,
`SET LOCAL ROLE authenticated` / `anon`, controllo JWT locale alla transazione,
`statement_timeout`, `lock_timeout` e `ROLLBACK` finale. La sessione operatore
prepara i dati; le verifiche dei permessi avvengono sotto il ruolo applicativo.
Nessuna modifica permanente dello schema o ai ruoli globali.

Esiti mostrati da Studio:

- `PASS: collaudo transazionale completato e rollback eseguito`.
- `PASS ultimo Admin, promozione/revoca sintetica e rollback`.
- `nessun_utente_sintetico_residuo = true`.
- `nessun_progetto_transazionale_residuo = true`.

Copertura verificata: lettura/scrittura sul solo progetto assegnato, nessuna
creazione Manager, attributi autore/ID/versione protetti, membership non
assegnabili dal Manager, anti-escalation, profili e audit limitati, audit
scritto dai trigger, DELETE negato, revoca e disabilitazione efficaci, ricerca
enti minima, nomi Manager, rimozione in bozza, attivazione negata senza enti e
con solo capofila, attivazione con partner, conclusione, archivio in sola
lettura, riapertura separata, salvataggio con versione obsoleta negato,
protezione ultimo Admin e promozione/revoca di un Admin sintetico.

I test SQL sono adattati dalle verifiche versionate in
`supabase/tests/authorization.sql` al database già popolato: nessuna modifica
ai progetti non sintetici durante le suite, nessun commit della transazione.
Non sostituiscono una nuova esecuzione delle suite di installazione migration,
GoTrue isolato o concorrenza su due connessioni SQL, che non sono state
rieseguite su questo Mac. La concorrenza di salvataggio è stata collaudata
anche con due schede reali nel primo giro Admin.

### Prove pubbliche con Manager reale

| Prova | Esito |
| --- | --- |
| Elenco con A e B esistenti | Visibile soltanto B, 1 progetto trovato |
| Menu Amministrazione e Nuovo progetto | Assenti |
| URL `/admin` e `/projects/new` | Pagina non disponibile |
| URL dettaglio e modifica di A | Pagina non disponibile |
| Modifica note/finanziatore di B e ricarica | Dati persistenti |
| Ricerca enti | Disponibili i due enti di collaudo |
| Associazione ente unico e rimozione in bozza | Riuscite |
| Attivazione con solo capofila | Negata con messaggio sul partenariato |
| Aggiunta partner e attivazione | Riuscite, stato Attivo dopo ricarica |
| Rimozione associazioni in Attivo | Comandi assenti |
| Conclusione | Stato Concluso |
| Archiviazione | Modifica assente, comando Riapri disponibile |
| Riapertura separata in bozza | Modifica nuovamente disponibile |
| Rimozione capofila/partner in bozza e associazione ente unico | Riuscite |
| Attivazione con ente unico | Riuscita |
| Revoca membership dal backend con sessione browser invariata | Alla ricarica B non disponibile |
| Ripristino membership | B di nuovo accessibile senza nuovo login |
| Archiviazione finale | Riuscita; dati e audit conservati |

### Osservazione sulle date risolta

Il riempimento automatico del controllo data tramite il bridge browser
modificava il valore DOM senza aggiornare il valore React: al successivo render
ritornava il valore iniziale. In modifica, dopo `fill` della fine al 14 ottobre,
il valore tornava al 31 dicembre.

La prova ripetuta con input da tastiera (`ArrowDown` e spostamento fra i segmenti)
ha aggiornato coerentemente valore e valore predefinito. Con fine
`2025-12-30`, il messaggio di data invertita è apparso e la data è rimasta
`2025-12-30`. Anche valuta `12!` è rimasta nel form con il messaggio corretto.
La prova browser locale con Playwright ordinario conferma la conservazione.
Non è stata necessaria una modifica applicativa alle date.

### Difetto M6-01: Riprova non recupera i dati server

- Ruolo: Admin sintetico; pagina `/projects`; ambiente locale con backend simulato.
- Passaggi: rispondere 503 alla lettura progetti, aprire Progetti, ripristinare
  il backend, premere Riprova.
- Atteso: nuova richiesta e ritorno all’elenco.
- Ottenuto prima della correzione: elenco ancora assente; test fallito dopo
  il ripristino del backend.
- Causa: `reset()` ricrea il sottoalbero senza richiedere nuovamente i dati.
- Correzione: in `src/app/(workspace)/error.tsx` usare la prop `retry`, già
  supportata da Next.js 16.4.0 installato, al posto di `reset`.
- Riferimento primario: [Next.js error.js, retry e reset](https://nextjs.org/docs/app/api-reference/file-conventions/error#retry).
- Riesecuzione: caso errore/ripristino superato; suite completa **12/12**.
- Stato al termine delle prove: **corretto localmente; rilascio ora autorizzato**. Non è
  stato provocato un guasto del backend operativo per riprodurre il problema.

La fixture `tests/ui/auth-fixture.mjs` ora supporta un errore 503 controllato,
25 progetti sintetici e applica offset/limit e ordinamento. In
`tests/ui/projects.spec.ts` aggiunti paginazione (20+5), filtri preservati,
navigazione avanti/indietro e recupero dopo errore. Restano le asserzioni
aggiunte sulla conservazione di date/valuta.

Verifiche finali dopo la correzione: `npm run test:ui` **12/12**, `npm test`
**5/5**, `npm run lint`, `npm run build -- --webpack` con verifica TypeScript:
**superati**. L’errore 503 nei log della suite è quello indotto dal test.

### Stato finale dei dati operativi di collaudo

| Progetto | Stato | Versione | Manager attivi | Enti | Audit progetto del Manager |
| --- | --- | --- | --- | --- | --- |
| COLL-20261015-A | archived | 5 | 0 | nessuno | 0 eventi |
| COLL-20261015-B | archived | 8 | 1 | ente unico COLL-ORG-20261015-A | 7 eventi |

Creati enti `COLL-ORG-20261015-A` e `COLL-ORG-20261015-B`, entrambi attivi,
con nomi chiaramente prefissati COLLAUDO. Il secondo rimane disponibile per
future prove. Nessuna cancellazione fisica; le assegnazioni sono revocabili
riaprendo il progetto archiviato secondo il contratto esistente.

### Verifiche che richiedono ancora intervento o rilascio

- Pubblicazione M6-01: completata, dettagli nella sezione seguente.
- Recupero via email, impostazione personale della nuova password, login e
  riuso del link: richiesta al titolare la scelta di effettuare questa prova;
  nessuna email inviata e nessuna password cambiata senza il suo intervento.
- Telefono fisico: le verifiche responsive eseguite coprono viewport simulate.

Il collaudo ha ora evidenze reali Admin/Manager/database; questi ultimi limiti
non vengono trasformati in prove superate.

### Rilascio della correzione

- Commit applicativo: `4a92317a0547af700b3b8492f190dbb835e151c0`, push su `main`.
- Vercel: scope `tor-vergata-igiene`, progetto `management-progetti`.
- [Deployment verificato](https://vercel.com/tor-vergata-igiene/management-progetti/4bJkbzM5XsJ4Y9PctRepfFzaLzJd):
  **Ready**, **Production / Current**, sorgente `4a92317`, build 17 secondi,
  15 ottobre 2026 alle 10:56 CEST; dominio `www.ariadne-hub.it` associato.
- Anche lo stato GitHub del commit conferma “Vercel — Deployment has completed”.
- Verifica dopo il deploy sul dominio pubblico: ricaricamento autenticato come
  Manager del progetto B riuscito; campi salvati, ente unico e stato archiviato
  conservati, navigazione senza comandi Admin e riapertura separata presenti.
- Il caso guasto/ripristino è verificato dalla regressione browser locale;
  non è stato provocato un guasto sul backend di produzione.
- Questa registrazione è un aggiornamento documentale successivo al commit
  applicativo; non modifica il comportamento già verificato.
