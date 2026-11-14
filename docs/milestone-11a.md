# Milestone 11A — Gestione utenti e accessi

8 novembre 2026. Implementazione pubblicata in produzione dopo richiesta
esplicita dell’utente. Nessuna nuova migration né modifica al modello dati.
Deployment READY; collaudo email e verifica autenticata in produzione pendenti.

## Funzioni e decisioni

- `/admin`: elenco profili con ricerca letterale per nome, ordinamento stabile e
  pagine di 25 utenti; invito con nome ed email.
- `/admin/[id]`: modifica del solo nome (massimo 120 caratteri), email e stato Auth,
  attivazione/disattivazione, promozione/revoca Admin e assegnazioni Manager.
- Le assegnazioni possono precedere l’accettazione dell’invito. Un profilo
  disabilitato non riceve nuove assegnazioni; conserva quelle già presenti.
  Riattivarlo ripristina gli accessi precedenti, come spiegato nell’interfaccia.
- Progetti ricercabili per titolo e paginati a 25 elementi. Gli archivi sono
  consultabili ma le membership non sono modificabili prima della riapertura.
- Inviti in attesa: reinvio dalla pagina del profilo attivo, dopo almeno un minuto.
  Email confermate usano il recupero password già disponibile. Non si deduce
  una scadenza da un TTL presunto: l’interfaccia espone lo stato in attesa e
  propone il reinvio quando il collegamento è scaduto; Auth verifica il token.
- Prima di un nuovo invito si cerca l’email nelle pagine Auth per evitare di
  reinvitare implicitamente account esistenti o disabilitati. Il controllo non
  costituisce un lock; eventuali richieste concorrenti dipendono anche dai
  vincoli e dal rate limit Auth. Massimo 100.000 account verificati, poi errore
  esplicito senza invio. Questa scansione è adeguata alla scala attuale; una
  ricerca indicizzata richiederebbe una successiva specifica backend.
- Nessuna modifica email, cancellazione account, ruolo globale Manager o ruolo
  Operator/Viewer. Le azioni sugli accessi richiedono conferma nell’interfaccia.

## Autorizzazioni e audit

Pagine e ogni server action richiedono un profilo attivo con ruolo Admin.
Le query applicative usano sempre il client con sessione utente e RLS.
`set_profile_active` e `set_admin_role` mantengono audit, lock e protezione
transazionale dell’ultimo Admin. Aggiornamenti nome/membership controllano la
versione e le righe effettivamente aggiornate. Gli ID e i comandi sono validati
sul server. La revoca è riletta dalle policy alle operazioni successive anche
con una sessione già aperta.

Il client service role è costruito solo sul server dopo il controllo Admin e
usato esclusivamente per Auth (`getUserById`, `listUsers`, `inviteUserByEmail`).
Non viene usato per aggirare le RLS delle tabelle pubbliche. Nessun token o
metadato Auth completo viene passato ai componenti client o scritto nei log.
Gli inviti usano `APP_URL` validato e il flusso `/auth/accept` esistente.
Riferimento API: https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail

L’audit applicativo esistente copre nomi, stato, ruoli e membership. Creazione
Auth e reinvii dipendono dai log Auth; non è aggiunta una nuova tabella audit per
correlare il richiedente applicativo di un invito. Per una traccia dedicata
occorre approvare una modifica al modello.

## Configurazione e collaudo

`SUPABASE_SERVICE_ROLE_KEY` (server only), `NEXT_PUBLIC_SUPABASE_URL` e `APP_URL`
sono necessari alle funzioni Auth. Nessuna variabile operativa è stata cambiata.
Se Auth non è disponibile, il dettaglio segnala il problema e conserva i
controlli applicativi; il fallimento degli inviti non viene mostrato come successo.

Verifiche eseguite in questa sessione:

- `npm test`: 20 test passati.
- `bash scripts/test-auth-service.sh`: GoTrue reale isolato, provisioning,
  conferma, token monouso, password, recupero e logout passati; nessuna email reale.
- `bash scripts/test-migrations.sh`: catena migration, RLS, audit, revoca con
  sessione esistente e concorrenza ultimo Admin passati su database temporanei.
- `npm run typecheck`, `npm run lint`, `npm run build`: passati.
- `npx playwright test tests/ui/admin.spec.ts tests/ui/workspace.spec.ts`: 10 test
  passati, inclusa ripetizione di una server action Admin con sessione Manager
  (negata), duplicati, conservazione dei dati del modulo dopo errore, ruoli,
  membership, disattivazione/riattivazione e responsive a 320/390/1440 pixel.
- `git diff --check`: passato. Nessun riferimento alla variabile service role
  nei bundle JavaScript client prodotti dalla build.

Il primo typecheck ha rilevato duplicati preesistenti dei tipi generati in
`.next`; sono stati spostati in una directory temporanea, senza toccare sorgenti
utente. Il server UI ha richiesto un timeout di avvio più ampio (180 secondi).
Le verifiche finali sopra sono state ripetute dopo queste correzioni.

Il test UI usa un servizio locale sintetico: verifica schermate e azioni ma non
sostituisce i test RLS reali sopra. Invio SMTP, ricezione email, reinvio sul
GoTrue operativo e collaudo umano restano da verificare dopo un rilascio
esplicitamente autorizzato, con destinatari concordati. Non sono stati creati
utenti o inviate email nel sistema operativo.

## Revisione interfaccia — 8 novembre 2026

Il modulo di invito è ora un dialogo nativo aperto dal pulsante «Invita un
utente», con chiusura esplicita e tasto Escape. Consente di scegliere Admin
oppure Manager; il Manager richiede almeno un progetto non archiviato (massimo
100 per invito). Admin usa la RPC esistente, Manager un inserimento atomico
batch delle membership con sessione e RLS del chiamante. Nessun ruolo viene
attribuito tramite metadata Auth.

L’invio Auth e l’assegnazione non sono una singola transazione: se l’email è
partita ma gli accessi non sono stati completati, viene mostrato un messaggio
esplicito con collegamento al profilo e senza un nuovo pulsante di invio.
Il reinvio di un invito esistente non modifica ruoli o progetti.

La lista utenti espone colonne Utente, Stato, Ruolo e Progetti associati.
Mostra le membership attive, includendo l’indicazione dei progetti archiviati;
per gli Admin espone inoltre l’accesso globale. Profili senza ruolo Admin né
membership attive risultano «Nessun ruolo assegnato». Errori nella lettura degli
accessi sono segnalati senza mostrare falsi «nessun progetto».

Verifica della revisione: TypeScript, lint e build superati; 12 test browser
passati, inclusi apertura/chiusura dialogo, scelta Admin, obbligo progetti per
Manager, colonne ruolo/assegnazioni e segnalazione di invito con accessi incompleti.

## Email, ricerca e ordinamento della directory

La tabella include l’email letta da Auth, disponibile esclusivamente agli Admin.
La ricerca unica combina nome, email e codice/titolo dei progetti associati;
ignora maiuscole e accenti, tratta i caratteri come testo letterale e richiede
che tutti i termini inseriti siano presenti. Ogni colonna dispone inoltre di
un filtro indipendente e di ordinamento crescente/decrescente dall’intestazione.
Filtri e ricerca si combinano; «Azzera filtri» ripristina l’elenco.

Profili, ruoli, membership attive, progetti ed email Auth vengono letti in
pagine complete prima di filtrare, ordinare e paginare a 25 utenti. Al client
Admin arrivano solo i campi visualizzati, mai token o metadata Auth. Se una
fonte fallisce o è incompleta viene mostrato un errore, senza risultati parziali
che potrebbero essere scambiati per assenza di utenti o assegnazioni. Limite
operativo di 100.000 record per fonte; una scala superiore richiederebbe una
ricerca backend dedicata. I filtri sono locali alla pagina e si azzerano
ricaricandola. La versione pubblicata inizialmente considera le assegnazioni esplicite; per gli
Admin l’accesso globale è indicato separatamente. La correzione locale descritta
sotto estende anche la ricerca all’accesso globale.

Verifiche: 22 test unitari e 13 test browser passati; lint e build con TypeScript
superati. Inclusi ricerca email/progetto, filtri combinati, ordinamento email,
tutte le colonne e ricerca oltre i primi 25 record su un insieme sintetico di
60 utenti. Nessuna modifica al database operativo o invio email di collaudo.


## Rilascio produzione — 8 novembre 2026

- Commit applicativo `6f2c38d` pubblicato su `origin/main` con il profilo
  GitHub dedicato `teamricercatvg`.
- Account Vercel `teamricercatvg-8749`, scope `tor-vergata-igiene`, progetto
  `management-progetti` verificati. Variabili production previste presenti;
  nessuna modifica ai valori o alle impostazioni dell’infrastruttura.
- Pacchetto estratto dal commit con `git archive`, senza modifiche locali
  estranee alla milestone. `.vercelignore` esclude i file `.env`.
- Controllo backend in sola lettura: migration `20261030110000` registrata,
  colonne `deleted_at`/`deleted_by` e RPC `change_activity_deletion` presenti.
  Superato quindi il precedente blocco documentato al rilascio completo dei
  sorgenti. Nessuna migration eseguita in questa sessione.
- Deployment `dpl_7TFJu6rYknGKqXkUhyj1WKgntvCg`, target production, **READY**;
  alias `https://www.ariadne-hub.it` assegnato. Build remota Next.js 16.4.2
  e TypeScript superati. URL immutabile:
  https://management-progetti-79in8zvel-tor-vergata-igiene.vercel.app
- Verifica del rilascio tramite stato/alias Vercel. I 22 test unitari e 13 test
  browser dell’implementazione sono locali/isolati; non attestano invio SMTP,
  ricezione o una sessione autenticata sul nuovo deployment.
- Aggiornamento successivo di README, roadmap e presente consegna con un commit
  solo documentale: i sorgenti applicativi distribuiti restano quelli di `6f2c38d`.
- Modifiche locali a env, infrastruttura, accessi e file generati preservate.
  Deploy Git automatico resta disabilitato come nella configurazione esistente.


## Correzione ricerca assegnazioni — 11 novembre 2026 (pubblicata)

La ricerca nel dettaglio utente ora confronta codice e titolo, senza distinguere
maiuscole e minuscole e accettando una parola o una parte del testo. Il codice
visualizzato prima del titolo (come ALBANIA) era escluso dal filtro precedente.
Etichetta aggiornata a «Cerca progetto per codice o titolo». Operandi PostgREST
quotati e caratteri wildcard trattati come testo letterale.

Verifiche locali: typecheck, lint, 22 test unitari e 8 test browser Admin
superati su servizio sintetico, inclusa ricerca per codice, parola nel titolo,
frammento, nessun risultato e ripristino con campo vuoto. Il primo avvio browser
si è interrotto; ripetizione superata. Build non completata: Turbopack non riesce
ad aprire una porta interna (EPERM), anche nel tentativo con escalation.
Rilascio autorizzato e completato: commit `7adff2a` pubblicato su `origin/main`.
Deployment production `dpl_9ckfqBmLo4eYfh5USg8N85Gko5VT`, READY, con alias
`https://www.ariadne-hub.it`. Sorgenti estratti dal commit Git e SHA registrato
nei metadati Vercel; build remota Next.js 16.4.2 e TypeScript superati.
URL immutabile: https://management-progetti-5ez57rupa-tor-vergata-igiene.vercel.app.

Verifica autenticata sul dominio pubblico: inserito «Albania» nella ricerca
assegnazioni e inviato il modulo; URL con `?q=Albania`, unico risultato
«ALBANIA — Hub pediatrico e Centro per lo Sviluppo del Bambino a Tirana».
Nessuna assegnazione o dato operativo modificato. Il successivo commit di
consegna aggiorna soltanto la documentazione; i sorgenti distribuiti restano
quelli di `7adff2a`. Deploy Git automatico invariato (disabilitato).


## Filtro progetti e accesso globale — 11 novembre 2026

Nel filtro «Progetti associati», gli Admin sono ora
ricercabili anche tramite codice o titolo di ogni progetto esistente, inclusi
gli archiviati, senza necessità di una membership esplicita. Cercando «Albania»
compaiono quindi sia i Manager assegnati sia gli Admin con accesso globale.
Un progetto inesistente non aggiunge automaticamente gli Admin ai risultati.
La tabella mantiene la dicitura «Accesso a tutti i progetti» e l’ordinamento
sui testi visualizzati; gli altri filtri continuano a combinarsi con la ricerca.
Si riutilizza l’elenco completo dei progetti già letto con sessione e RLS, senza
nuove query o modifiche a ruoli, assegnazioni e database.

Stato iniziale: correzione locale; rilascio con la semplificazione sotto.

Verifiche: typecheck, lint, 23 test unitari e 8 test browser Admin superati
con dati sintetici locali. Primo tentativo browser interrotto dal server di
sviluppo; ripetizione superata. Build locale bloccata da Turbopack (apertura
porta interna: EPERM), anche con escalation. Nessun commit, push o deploy
di questa seconda correzione al momento della prima verifica.


## Semplificazione filtri utenti — 11 novembre 2026

Rimosso il campo generale «Cerca per nome, email o progetto» e il relativo
pulsante «Cerca». Restano i filtri delle cinque colonne, applicati subito, e
«Azzera filtri», che svuota i campi e torna alla prima pagina. Il filtro
«Progetti associati» comprende anche gli Admin con accesso globale secondo
la correzione precedente. Entrambe le modifiche autorizzate al rilascio.

Verifica congiunta: typecheck, lint, 23 test unitari e 14 test browser
Admin/workspace superati; inclusi assenza del campo generale, filtro progetti
con Admin, combinazione dei filtri e azzeramento. Build di produzione demandata
al rilascio Vercel a causa del blocco locale Turbopack già documentato.


### Rilascio congiunto e verifica in produzione

- Commit applicativo `b370b92` pubblicato su `origin/main`.
- Deployment `dpl_6uHmZTmPt3RicLBkmVnT9PUSbsYJ`, production, READY;
  alias `https://www.ariadne-hub.it`. Sorgenti estratti dal commit e SHA
  registrato nei metadati Vercel. Build remota Next.js 16.4.2 e TypeScript
  superati. URL immutabile:
  https://management-progetti-m810r2z1e-tor-vergata-igiene.vercel.app.
- Verifica autenticata su `/admin`: campo generale e pulsante Cerca assenti,
  presenti i cinque filtri e Azzera filtri. Digitando «Albania» nella colonna
  Progetti associati compaiono 3 utenti: un Manager associato e due Admin con
  «Accesso a tutti i progetti». Nessuna modifica operativa ad accessi o dati.
- Il commit successivo aggiorna solo questa consegna; i sorgenti distribuiti
  restano quelli di `b370b92`. Deploy Git automatico invariato.


## Abilitazione e attivazione account — 14 novembre 2026 (locale)

La directory distingue «Abilitato/Disabilitato» dallo stato di attivazione:
invito in attesa, email da confermare, email confermata con password da
verificare, attivazione completata con password verificata. Il dettaglio
spiega che confermare il link non dimostra il salvataggio di una password.

Dopo un accesso con password riuscito oppure un aggiornamento password riuscito,
il server registra `ariadne_password_verified_at` in Auth app_metadata per il
solo ID restituito dalla sessione/Auth. Il campo è informativo, non concede
permessi; user_metadata e last_sign_in_at non vengono usati come prova. Nessun
valore password viene memorizzato nel campo. Gli account precedenti restano
«Password da verificare» fino a una successiva operazione verificata. Un errore
di registrazione non blocca l’accesso o annulla una password già salvata; lo
stato può quindi restare prudenzialmente da verificare. Nessuna migration.

Verifica: 24 test unitari e 14 test browser Admin/workspace superati; inclusa
registrazione dopo login e distinzione da invito non accettato. La modifica
è locale, non ancora pubblicata. Per procurement è stato richiesto il recupero;
l’utente ha riportato la conferma «Password aggiornata» dal sito operativo.
Il nuovo indicatore non era ancora distribuito durante quel salvataggio.

Conferma del collaudo umano: logout, nuovo accesso con email/password di
procurement e apertura ALBANIA riusciti. TypeScript e lint superati. Build
locale ancora bloccata da Turbopack (EPERM su porta interna), anche con
escalation. Nessun commit, push o deploy di questa modifica.


### Rilascio stati di attivazione — 14 novembre 2026

- Commit applicativo `ea08f1d` pubblicato su `origin/main`.
- Deployment production `dpl_DUboZwatojxmM2a2foH1p56Yb6tS`, READY,
  alias `https://www.ariadne-hub.it`. Sorgenti estratti dal commit, SHA
  registrato nei metadati. Build remota Next.js 16.4.2 e TypeScript superati.
  URL: https://management-progetti-a436y2cne-tor-vergata-igiene.vercel.app.
- Directory verificata con sessione Admin sul dominio pubblico: mostra
  «Abilitato · Email confermata · Password da verificare» per gli account
  esistenti, incluso procurement. Il precedente collaudo umano di procurement
  resta valido, ma precede l’introduzione del marcatore: occorre un nuovo
  accesso con password per registrarne automaticamente l’evidenza.
- Registrazione del marcatore verificata nei test isolati; nuovo accesso
  password in produzione dopo il deploy ancora da eseguire dal titolare.
- Nessuna migration o modifica a ruoli e membership. Commit successivo solo
  documentale; sorgenti distribuiti `ea08f1d`.


## Stato utente unico — 14 novembre 2026 (locale)

Su richiesta dell’utente, elenco e dettaglio mostrano un solo stato:
«Da confermare» prima dell’impostazione/verifica della password, «Abilitato»
dopo salvataggio o accesso con password riuscito, «Disabilitato» quando
l’accesso è revocato. La disabilitazione prevale anche su una password verificata.
Restano invariati il marcatore server e i permessi. Gli account storici privi
del marcatore passano ad Abilitato al successivo accesso con password riuscito.
Modifica locale, non ancora pubblicata.

Verifiche: 24 test unitari, typecheck, lint e 14 test browser Admin/workspace
superati. Il primo avvio browser è stato interrotto dal promemoria di sicurezza
Next.js; la ripetizione è riuscita. Il runtime segnala un aggiornamento di
sicurezza da valutare separatamente. Diff controllato; nessun commit o deploy.


### Rilascio stato unico — 14 novembre 2026

- Commit applicativo `e9dc24a` pubblicato su `origin/main`.
- Deploy production `dpl_Hv8RKeZWP2GKo8YcdME76RP6WLaS`, READY;
  https://management-progetti-dmlnuem44-tor-vergata-igiene.vercel.app
  con alias https://www.ariadne-hub.it. Build e TypeScript remoti superati.
- Pacchetto estratto dal commit con git archive; SHA nei metadati Vercel.
  Escluse modifiche locali estranee e file .env tramite .vercelignore.
- Verificata la directory autenticata in produzione dopo ricaricamento:
  diciture composte rimosse, cinque account storici mostrano Da confermare
  perché privi del marcatore. Il passaggio ad Abilitato richiede un successivo
  accesso con password riuscito; verificato nei test isolati, non eseguito
  per conto dei titolari in produzione.
- Nessuna migration. Il commit documentale successivo non cambia i sorgenti
  distribuiti. Deploy automatico Git invariato (disabilitato).


### Correzione della regola di conferma — 14 novembre 2026

L’utente precisa che tutti gli account attuali sono già abilitati.
«Da confermare» indica solo la conferma email/invito ancora pendente;
«Abilitato» usa email_confirmed_at di Auth, senza richiedere il marcatore
password introdotto successivamente. «Disabilitato» mantiene la precedenza.
Rimossa dal dettaglio la richiesta impropria di un nuovo accesso/password.
Questa regola sostituisce quella del rilascio precedente.

Rilasciata la correzione nel commit `7eaf85e` su main. Test unitari (24),
typecheck e lint superati; build remota riuscita. Deployment production
`dpl_eSMTCw2WVAfdWr7hYkCpZevjGDpn` READY, alias www.ariadne-hub.it,
sorgenti estratti dal commit e SHA nei metadati. Verifica autenticata sul
sito dopo reload: tutti e cinque gli utenti attuali mostrano «Abilitato»,
compreso procurement. Nessun dato Auth o permesso modificato.


## Primo invito: scelta password e invii ripetuti — 14 novembre 2026

I log Auth mostrano una conferma procurement riuscita e una seconda richiesta
con token non trovato nello stesso secondo. Il modulo POST nativo non attivava
il pending di useFormStatus: ora un lock sincrono nel modulo impedisce invii
ripetuti e disabilita Continua durante la navigazione. La conferma riuscita
continua a salvare la sessione e porta a /password. GET non consuma token.

Un errore di verifica porta a /auth/invitation-help, non al login: spiega
link già usato/scaduto o conferma fallita e permette di richiedere un nuovo
collegamento password. Nessuna accettazione di token invalidi né uso della
sessione di un altro account come prova dell’invito. Origin check conservato.
Il recupero dalla pagina dedicata mantiene lì anche la conferma dell’invio;
risposta uniforme per indirizzi conosciuti e sconosciuti.

Test isolati con token monouso: doppio clic genera un solo POST, sessione
persistita, scelta e salvataggio password, riuso del token e recupero senza
passaggio al login. Fixture senza dati reali; nessuna email operativa inviata.

### Rilascio correzione primo invito

- Commit `2ef05ed` pubblicato su origin/main.
- 24 test unitari, 8 test browser inviti/workspace, typecheck e lint superati.
  Primo avvio browser interrotto dal promemoria Next.js; ripetizione riuscita.
- Deploy `dpl_BiXxio4chxSWkahwFQDMPVqHZtLw`, production READY, build remota
  e TypeScript superati; alias https://www.ariadne-hub.it. URL immutabile:
  https://management-progetti-ikmwr2nv5-tor-vergata-igiene.vercel.app.
- Sorgenti estratti dal commit, SHA nei metadati, file env esclusi.
- Verifica HTTP in produzione: POST con token vuoto reindirizza 303 alla
  pagina assistenza invito, che risponde 200 con richiesta nuovo collegamento.
  Invito valido e password verificati con fixture isolata; nessun invito reale
  inviato per il collaudo. Nessuna migration o modifica a utenti e permessi.
