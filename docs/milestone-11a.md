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
