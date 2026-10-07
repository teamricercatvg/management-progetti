# Infrastruttura Ariadne Hub — Milestone 1A

Stato verificato il **7 ottobre 2026**. Backend installato e verificato tramite
SSH; sito statico pubblicato su Vercel. La milestone **non è ancora chiusa**:
Aruba mostra `ariadne-hub.it` in «Attesa Validazione DNS», senza accesso al
pannello del dominio. DNS, certificati dei domini personalizzati e redirect
pubblico richiedono una verifica successiva all'attivazione.

## Account e risorse

| Risorsa | Configurazione verificata |
| --- | --- |
| GitHub | `teamricercatvg`, repository `teamricercatvg/management-progetti` |
| Vercel | `teamricercatvg@gmail.com`, utente `teamricercatvg-8749` |
| Scope Vercel | `tor-vergata-igiene` (non lo scope personale) |
| Progetto Vercel | `management-progetti`, ID `prj_pTLN65jStwKna0FdRKlrZVVQUdsW` |
| Collegamento Git | repository corretta, production branch `main` |
| Server Netcup | `cdp-netcup`, `89.58.61.66`, hostname `v2202609409793513503` |
| Pannello Coolify | https://coolify.salutepediatricaglobale.it |
| Progetto Coolify | `management-progetti`, UUID `asmpwag1bjwio01ts366yuwq` |
| Stack Supabase | `supabase-management-progetti`, UUID `d4urni99thsq3vsnxxkckjzh` |
| Ambiente Coolify | `production` |
| Backend previsto | https://supabase.ariadne-hub.it (DNS ancora da configurare) |
| Sito previsto | https://www.ariadne-hub.it (DNS ancora da configurare) |
| Sito attivo temporaneo | https://management-progetti.vercel.app |

Il server condiviso aveva circa 25 GiB di RAM disponibili e 947 GiB di disco
liberi prima dell'installazione. Non sono stati acquistati servizi aggiuntivi.
L'isolamento riguarda stack, rete Docker, database, volumi e credenziali;
l'amministrazione host/Coolify e il reverse proxy restano condivisi.

## Backend dedicato

Il template Supabase Coolify è stato istanziato con segreti nuovi; password
PostgreSQL/JWT/Studio, anon key e service role sono state confrontate con CDP
senza stamparle e risultano differenti. I mount PostgreSQL e la rete Docker
sono dedicati al nuovo UUID. Nessuna migration applicativa: zero tabelle nel
namespace `public`, zero utenti Auth e zero bucket Storage alla verifica.

[Compose di riferimento](../infra/supabase-compose.yaml): solo placeholder,
nessun segreto. Va gestito tramite Coolify, che genera configurazioni e file
associati; non è un compose autonomo da lanciare dal checkout.

- PostgreSQL `supabase/postgres:15.8.1.085`, host solo `127.0.0.1:25432`.
- Gateway Kong host solo `127.0.0.1:28080`, oltre al routing HTTPS predisposto.
- CDP conserva le sue porte `15432` e `18080` e i propri volumi.
- Servizi con healthcheck healthy; PostgREST attivo senza healthcheck nel
  template e verificato via API. Il job di creazione bucket MinIO termina 0.
- Il template aveva `minio/mc` non scaricabile. Il job usa l'immagine
  `ghcr.io/coollabsio/minio:RELEASE.2025-10-15T17-29-55Z`, già contenente `/usr/bin/mc`.
- `SECRET_PASSWORD_REALTIME` era vuoto nel template: generato separatamente.
- Signup pubblico, utenti anonimi e signup telefonico disabilitati;
  autoconferme disabilitate; verifica JWT Edge Functions abilitata.
- Studio protetto da Basic Auth al gateway: senza credenziali 401,
  con credenziali 200. Auth health e REST con chiavi valide rispondono 200;
  chiave non valida respinta con 401.
- URL Auth configurati su `https://www.ariadne-hub.it` e sul backend dedicato.
  SMTP resta da definire con i flussi applicativi; non testato/in produzione.
- Firewall host invariato: ingresso pubblico TCP 22/80/443; nessuna nuova porta
  database pubblica. Servizi CDP ancora healthy e senza riavvii rilevati.

## Accessi locali

Credenziali private in `~/.config/ariadne-infra/` (directory 0700, file 0600),
fuori repository. `.env.local` contiene le cinque variabili dedicate ed è
ignorato da Git e dai deploy. Non copiarlo in documenti o output di terminale.
La chiave SSH di amministrazione del server è quella esistente verificata;
nessuna credenziale applicativa CDP è riutilizzata.

```bash
bash scripts/github.sh api user --jq .login
bash scripts/vercel.sh whoami
bash scripts/vercel.sh project inspect management-progetti
bash scripts/server.sh 'docker ps'
python3 scripts/check-backend.py
python3 scripts/supabase-cli.py query 'select current_database(), current_user;'
```

Il wrapper Supabase apre un tunnel temporaneo con controllo della chiave host,
usa la porta dedicata e lo chiude al termine. Supporta query/dump/lint/types;
`push` è disponibile ma va usato solo dopo approvazione del modello e revisione
delle migration versionate. Il tunnel cifra il percorso di rete; PostgreSQL
usa loopback sul server. I wrapper Vercel/GitHub isolano le identità dedicate.

## Vercel e pagina provvisoria

Progetto e link GitHub verificati via API. Deploy CLI production
`dpl_AitMiwVobAFmHbJVoMLGL5ruKggH` in stato READY. Pagina statica HTML/CSS
in [public/index.html](../public/index.html), con `noindex` e output Vercel
limitato a `public`. Non è uno scaffold Next.js e non accede al database.

Le cinque variabili di `.env.example` sono salvate in production, development
ed in tutti i branch preview. Anon key di tipo config; service role di tipo
secret, mai `NEXT_PUBLIC_`. Valori inseriti senza stampa. Le variabili sono
state aggiunte dopo il deploy statico: entreranno in un successivo deployment
applicativo, mentre la pagina attuale non le usa e non contiene chiavi.

Non esiste un backend staging: i tre ambienti Vercel puntano alla stessa istanza
vuota. Prima di test con dati reali va decisa la separazione staging/production.
Un push futuro su `main` può attivare un deploy automatico. Il collegamento è
verificato; il trigger di produzione su `main` non è stato esercitato.
La consegna viene versionata nel branch dedicato `codex/milestone-1a`.

## DNS da completare dopo attivazione Aruba

Record richiesti da Vercel, letti dalla verifica live del 7 ottobre:

| Tipo | Nome | Valore |
| --- | --- | --- |
| A | `@` | `216.198.79.1` |
| A | `@` | `64.29.17.1` |
| CNAME | `www` | `e71649084f6ee192.vercel-dns-017.com` |
| A | `supabase` | `89.58.61.66` |

Rileggere la configurazione del pannello prima di modificare; preservare record
MX/TXT e altri servizi di posta. Entrambi i domini frontend sono già associati
a Vercel; redirect `ariadne-hub.it` → `www.ariadne-hub.it` impostato 308 sul
progetto. Questo non prova il funzionamento pubblico del redirect.

Dopo l'attivazione:

1. Applicare i record nel browser interno Aruba, verificando la zona salvata.
2. Eseguire `bash scripts/vercel.sh domains verify www.ariadne-hub.it` e
   `bash scripts/vercel.sh domains verify ariadne-hub.it`.
3. Verificare certificati HTTPS validi, sito `www` e redirect 308 dall'apex.
4. Verificare API Supabase e protezione Studio sull'endpoint HTTPS pubblico;
   se necessario far rigenerare il certificato al proxy, senza bypass TLS.
5. Aggiornare questa consegna distinguendo le nuove verifiche da quelle via SSH.

## Backup e ripristino

- [Script backup](../scripts/backup-server.sh), installato come
  `/usr/local/sbin/ariadne-backup`.
- Timer `ariadne-backup.timer` attivo: ogni giorno 03:15 Europe/Rome,
  jitter massimo 120 secondi, recupero esecuzione se saltata.
- Retention server 14 giorni, directory `/var/backups/management-progetti`.
- Cluster fisico PostgreSQL con WAL, dump logici, configurazione Coolify,
  database Coolify e Storage. La configurazione amministrativa condivisa nel
  backup è sensibile: accesso root, non pubblicare gli archivi.
- `pg_verifybackup` e checksum completati prima di marcare il backup concluso;
  versione immagine in `POSTGRES_IMAGE` per il ripristino.
- Backup finale verificato: `20261007T131856Z`.
- [Prova ripristino](../scripts/verify-restore.sh) in container temporaneo con
  `--network none`; query su postgres, `auth.users`, `storage.buckets`; rimozione
  del solo ambiente temporaneo al termine. Il database attivo non è toccato.
- Copia sul Mac in `~/.config/ariadne-infra/backups/20261007T131856Z`, con checksum.
- **Copia fuori server automatica ancora da predisporre**, prima dei dati reali.
  Per ora la destinazione esterna è il Mac e la copia iniziale è manuale.

```bash
bash scripts/server.sh '/usr/local/sbin/ariadne-backup'
bash scripts/server.sh '/usr/local/sbin/ariadne-verify-restore /var/backups/management-progetti/TIMESTAMP'
```

Per recupero reale usare la versione immagine registrata nel backup; validare
prima in isolamento, poi pianificare separatamente la sostituzione del servizio.
Non usare il database attivo come destinazione di una prova.
