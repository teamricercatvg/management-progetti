# Milestone 6 — Layout base e navigazione

Data: 14 ottobre 2026. Implementazione verificata su `main`; commit, push e
deploy autorizzati dall’utente. Stato del rilascio riportato in fondo.
Nessuna migration o modifica ai dati del backend operativo.

## Consegna

- Shell autenticata con navigazione, identità utente, logout e collegamento
  per saltare al contenuto. Menu laterale desktop e griglia su schermi piccoli.
- Interfaccia italiana, palette verde preesistente, titoli serif, schede e
  stati di focus visibili. Menu corrente indicato anche con `aria-current`.
- `/overview` è la destinazione dopo login e accesso alla radice del sito.
- `/projects` e `/admin` sono pagine iniziali esplicitamente in preparazione:
  nessuna lista vuota fittizia, conteggio, dato dimostrativo o comando CRUD.
- `/admin` e relativo menu riservati agli Admin. Il controllo viene ripetuto
  nella pagina server, anche per accessi tramite URL diretto.
- Account e modifica password mantengono gli URL `/account` e `/password`,
  all'interno del nuovo layout. Login, conferma inviti e recupero conservano
  il layout compatto e gli URL precedenti.
- Stati di caricamento, errore con riprova e pagina non disponibile; pagina
  404 generale con collegamento di ritorno.

## Confini e autorizzazioni

Il layout e le pagine server richiamano `requireProfile()`: verifica Auth e
profilo attivo. La funzione è deduplicata con React `cache` solo nella singola
richiesta, senza cache persistente condivisa tra utenti. La navigazione client
riceve soltanto il booleano Admin e legge il pathname; dati e autorizzazione
rimangono sul server. Ogni futura operazione dovrà avere i propri controlli
oltre alla RLS, senza affidarsi alla sola visibilità del menu.

Un profilo attivo senza ruolo Admin non viene etichettato automaticamente come
Manager: la qualifica dipende dalle membership dei singoli progetti. Per ora
Manager e utenti senza assegnazioni vedono la stessa shell di base. Nessuna
query di elenco progetti è introdotta prima della milestone 7.

La struttura utilizza i route group `(auth)` e `(workspace)` senza cambiare gli
URL esistenti. Il trattamento dei vecchi link email sulla radice è preservato.
La gestione funzionale di progetti, utenti, enti, budget e report resta nelle
milestone successive.

## Verifiche

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:ui
git diff --check
```

Playwright usa Google Chrome installato, porte locali 3106 e 54329 libere,
e un simulatore Auth/RPC con identità sintetiche. Avvia e arresta i due processi;
le variabili del backend sono sovrascritte solo per quel processo. Non usa
account operativi né invia email. Le schermate vengono salvate in
`test-results/`, ignorata da Git.

Copertura browser: accessi anonimi alle cinque route protette, login Admin,
menu attivo, navigazione, account/password, logout con accesso successivo negato,
Manager e utente senza assegnazioni esclusi dall'area Admin anche via URL,
profilo inattivo escluso, vecchi link invito. La suite richiama anche
`scripts/test-auth-http.mjs` per conferma email, controllo Origin e redirect.
Controlli responsive a 1440, 768, 390 e 320 pixel; schermate desktop e mobile
ispezionate visivamente. Lint, typecheck, unit test e build superati.

Questa fixture verifica il comportamento UI e il contratto di accesso, non
sostituisce le prove RLS/GoTrue reali della milestone 5. Nessuna nuova prova
autenticata in produzione è stata eseguita. Gli stati loading/error sono
predisposti; non sono stati simulati guasti del backend operativo.

## Collaudo dopo un eventuale rilascio

Accedere con Admin e con un account non Admin; verificare il menu, aprire
direttamente `/admin` come non Admin, navigare su telefono, cambiare password
solo se desiderato e disconnettersi. Le pagine Progetti e Amministrazione
devono continuare a indicare che le funzionalità sono in preparazione.


## Rilascio produzione — 14 ottobre 2026

- Commit applicativo `2f3b1c1` pubblicato su `origin/main` con account dedicato.
- Deploy Git automatico `dpl_6v2nZBcqFeHTuKYUJSexwWqNYEBT` completato READY;
  verificato come deployment corrente di produzione su Vercel, scope
  `tor-vergata-igiene`, progetto `management-progetti`.
- Alias `www.ariadne-hub.it`, `ariadne-hub.it` e `management-progetti.vercel.app`
  associati al deployment. Verifica browser sul dominio pubblico: nuova pagina
  login servita e accesso anonimo a `/overview` reindirizzato a `/login`.
- Il collaudo completo Admin/Manager resta quello locale con fixture della
  sezione Verifiche; nessuna sessione autenticata operativa creata per il rilascio.
- Nessuna migration, modifica delle variabili Vercel o scrittura di dati.
  Modifiche locali preesistenti di infrastruttura/accessi escluse dal commit.
