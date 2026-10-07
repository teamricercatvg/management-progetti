# Istruzioni operative — Gestione Progetti

## Ambito

Leggere README.md, docs/roadmap-gestione-progetti.md e la consegna della
milestone corrente. Eseguire solo la milestone richiesta. La Milestone 1
prepara repository e documentazione; infrastruttura (1A), modello dati (2),
migration e codice applicativo appartengono alle attività successive.
I vincoli di sola pianificazione nella roadmap descrivono la fase iniziale:
le richieste esplicite successive autorizzano la rispettiva milestone.

## Git

- Repository: https://github.com/teamricercatvg/management-progetti.
- Account: teamricercatvg; identità Git: teamricercatvg@gmail.com.
- Prima di modificare verificare stato, branch e remote, poi fare fetch.
  Confrontare eventuali commit remoti prima di integrare cambiamenti.
- Preservare il lavoro dell'utente; evitare reset e pulizie distruttive.
- Base main; usare branch dedicati per le prossime milestone, ad esempio
  docs/milestone-2 o feat/autenticazione, salvo istruzioni diverse.
- Commit piccoli con prefissi docs:, chore:, feat:, fix: o test:.
- Commit, push e deploy solo quando richiesti; rivedere il diff e selezionare
  i percorsi interessati senza includere automaticamente tutto il checkout.
- Usare bash scripts/github.sh per il profilo GitHub dedicato, senza token
  personali ereditati. L'helper Git HTTPS deve usare lo stesso profilo,
  configurato localmente al checkout, non nelle impostazioni globali.

## Segreti e infrastruttura

- Non stampare o versionare token, password, chiavi private, dump o dati personali.
- .env.example contiene solo nomi e valori vuoti. Git ignora .env e .env.*
  tranne il template; .vercelignore esclude tutti i file .env dai deploy.
- La service role Supabase è solo server, mai NEXT_PUBLIC_ o bundle client.
- Frontend su Vercel, backend dedicato su Netcup/Coolify. Non riutilizzare
  database, volumi, endpoint o credenziali applicative di CDP.
- Per 1A consultare AGENTS.md e INFRASTRUCTURE.md del progetto locale
  cdp-software, verificando dal vivo i riferimenti prima di intervenire.
- Account Vercel previsto: teamricercatvg@gmail.com. Lo scope va verificato:
  CDP documenta tor-vergata-igiene; le istruzioni CLI generiche indicano
  stefano-orlandos-projects-de2d57cb. Risolvere questa discrepanza prima
  di qualsiasi modifica Vercel, senza ereditare uno scope personale.

## Pattern CLI per future variabili Vercel

Verificare whoami, project ls e link del progetto nello scope confermato.
Tenere i valori in variabili shell senza stamparli. Per production e development
usare `env add NOME ambiente --value "$valore" --force --yes --scope "$scope"`.
Per preview usare TTY e lasciare vuoto il prompt del branch per applicare a
tutti i branch. Ripetere per ogni variabile prevista in .env.example.
`env ls` verifica ambienti e date, non i valori cifrati. Verificare
.vercelignore prima di deploy locali e gli host pubblici nel bundle dopo
un deploy autorizzato.

## Verifiche

Controllare contenuto dei nuovi file, diff, link locali, regole ignore e stato
Git. Introdurre type-check, lint, build e test pertinenti quando esiste codice.
Modifiche database solo tramite migration versionate dopo approvazione del
modello dati; verificare vincoli e RLS con ruoli diversi. Aggiornare la
documentazione distinguendo stato locale, pubblicato, configurato e verificato.

## Stato operativo dopo avvio 1A (7 ottobre 2026)

- Leggere `docs/infrastructure.md` e `docs/milestone-1a.md` prima di intervenire.
- Scope Vercel verificato: **tor-vergata-igiene**, progetto `management-progetti`.
  Usare `bash scripts/vercel.sh`, non lo scope personale degli esempi generici.
- Backend dedicato Coolify: `d4urni99thsq3vsnxxkckjzh`; PostgreSQL via SSH su
  loopback server `25432`, gateway `28080`. Non usare le porte CDP.
- Wrapper `scripts/supabase-cli.py` e `scripts/check-backend.py`; credenziali
  private in `~/.config/ariadne-infra/`, mai stamparle o versionarle.
- La pagina pubblica provvisoria è statica, `public/`, con `vercel.json`.
  Il futuro scaffold Next.js richiederà aggiornare il preset/output Vercel.
- Dominio Aruba in «Attesa Validazione DNS»: completare record e HTTPS prima
  di dichiarare chiusa 1A. Account e stato servizi vanno sempre ricontrollati.
- Backup giornaliero alle 03:15 Europe/Rome, retention 14 giorni; ripristino
  isolato verificato. Copia fuori server iniziale sul Mac, automazione pendente.
- Le env Vercel nei tre ambienti usano l'istanza dedicata attualmente vuota;
  staging separato e SMTP da definire prima dei dati reali.
