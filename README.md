# Gestione Progetti — Ariadne Hub

Applicazione in progettazione per la gestione di progetti non profit: quadro
logico, attività, cronogramma, indicatori, budget e rapporti operativi.

## Stato

Milestone 1 e infrastruttura dedicate predisposte; frontend su Vercel e
Supabase su Netcup/Coolify. La milestone 4 introduce Next.js e i flussi Auth;
la versione è pubblicata e verificata su https://www.ariadne-hub.it.
Il collaudo manuale dell’utente avviene direttamente sul sito. Stato e verifiche nella [consegna](docs/milestone-4.md).

La **Milestone 2 è conclusa**: modello dati versione 2 e permessi approvati,
consegna versionata su `main`:
[modello dati](docs/data-model.md) e [permessi](docs/permissions.md).
MVP con Admin e Manager, enti/partenariati per progetto e cambi medi mensili
previsti per le spese estere.

La **Milestone 3 è completata e applicata al backend dedicato**: due migration per sette tabelle
fondative, vincoli e audit; RLS abilitata senza policy e accessi API negati.
Applicazione da zero, integrità e concorrenza verificati su PostgreSQL 15 isolato.
Vedere la [consegna Milestone 3](docs/milestone-3.md) per confini e riproduzione.

La **Milestone 4 è implementata**, con migration applicata al backend dedicato
e primo Admin predisposto. Avvio locale: `npm ci` e `npm run dev`, quindi
http://127.0.0.1:3000. Il `.env.local` esistente usa il backend operativo;
per un ambiente isolato configurare Supabase locale con credenziali proprie.

## Documentazione

- [Roadmap e requisiti](docs/roadmap-gestione-progetti.md)
- [Regole operative](AGENTS.md)
- [Consegna Milestone 1](docs/milestone-1.md)
- [Consegna Milestone 1A](docs/milestone-1a.md)
- [Consegna Milestone 2](docs/milestone-2.md)
- [Consegna Milestone 3](docs/milestone-3.md)
- [Consegna Milestone 4 e collaudo](docs/milestone-4.md)
- [Modello dati](docs/data-model.md)
- [Matrice permessi e contratto RLS](docs/permissions.md)
- [Infrastruttura, verifiche e DNS pendenti](docs/infrastructure.md)

Stack previsto: Next.js 16, App Router, React 19, TypeScript, Tailwind CSS 4
 e Supabase self-hosted dedicato su Netcup/Coolify. Frontend previsto su Vercel,
con indirizzo pubblico https://www.ariadne-hub.it. Per lo stato del rilascio vedere la consegna della milestone 4.

## Setup e comandi disponibili

Il checkout attuale è già collegato al remoto. Su un altro computer, dopo
la pubblicazione iniziale, usare:

```bash
git clone https://github.com/teamricercatvg/management-progetti.git
cd management-progetti
git status
git remote -v
```

Per le operazioni autenticate usare l'account teamricercatvg. Su questo Mac
il wrapper usa il profilo dedicato esterno al repository:

```bash
bash scripts/github.sh api user --jq .login
bash scripts/github.sh repo view teamricercatvg/management-progetti
git fetch origin
git status --short --branch
git diff --check
```

Il wrapper richiede GitHub CLI e il profilo autenticato in
`$HOME/.config/gh-teamricercatvg`; non contiene credenziali. Su un altro Mac
occorre autenticare quel profilo e configurare identità Git e helper HTTPS
nel solo checkout, senza cambiare la configurazione globale:

```bash
bash scripts/github.sh auth login --hostname github.com --git-protocol https
git config user.name teamricercatvg
git config user.email teamricercatvg@gmail.com
git config credential.https://github.com.helper ''
git config --add credential.https://github.com.helper '!env -u GH_TOKEN -u GITHUB_TOKEN GH_CONFIG_DIR="$HOME/.config/gh-teamricercatvg" gh auth git-credential'
```

Verificare sempre che l'API restituisca teamricercatvg prima di pubblicare.

## Ambiente e controlli

`.env.example` contiene soltanto nomi e valori vuoti. Su questo Mac `.env.local`
è già configurato con l'istanza dedicata. Per altri computer seguire la guida
infrastrutturale e recuperare le credenziali da una fonte privata autorizzata.
La service role resta solo server. Non usare endpoint o credenziali di CDP.

```bash
git check-ignore .env .env.local .env.production .vercel/project.json
bash -n scripts/github.sh
```

Leggere anche i nuovi file: git diff non mostra quelli non tracciati.
Controlli applicativi: `npm run typecheck`, `npm run lint`, `npm test`,
`npm run build`. Flussi Auth isolati: `bash scripts/test-auth-service.sh`.
Per i controlli infrastrutturali: `python3 scripts/check-backend.py` e
`python3 scripts/supabase-cli.py query 'select current_database();'`.
La vecchia pagina statica resta in `public/index.html` come riferimento storico.

## Test migration fondative

```bash
bash scripts/test-migrations.sh
```

Usa via SSH un container PostgreSQL temporaneo senza rete e senza dati operativi.
Richiede accesso al server verificato; dettagli e alternativa Docker locale nella
[consegna della milestone 3](docs/milestone-3.md).
