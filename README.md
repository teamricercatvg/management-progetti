# Gestione Progetti — Ariadne Hub

Applicazione in progettazione per la gestione di progetti non profit: quadro
logico, attività, cronogramma, indicatori, budget e rapporti operativi.

## Stato

Milestone 1 pubblicata su `main` (commit `d1d6af5`). La Milestone 1A ha
predisposto il backend dedicato, i backup e il progetto Vercel il 7 ottobre 2026.
Il dominio Aruba è attivo e i record DNS sono stati configurati. La milestone
resta aperta per **propagazione DNS e verifica HTTPS** dei domini personalizzati.

Pagina statica temporanea: https://management-progetti.vercel.app.
Non esiste ancora il gestionale Next.js: nessuna dipendenza npm, schema
applicativo o migration è stata introdotta. Consegna 1A sul branch dedicato
`codex/milestone-1a`; infrastruttura remota già configurata.

La **Milestone 2 è conclusa**: modello dati versione 2 e permessi approvati,
consegna versionata su `main`:
[modello dati](docs/data-model.md) e [permessi](docs/permissions.md).
MVP con Admin e Manager, enti/partenariati per progetto e cambi medi mensili
previsti per le spese estere. Non sono state create migration.

## Documentazione

- [Roadmap e requisiti](docs/roadmap-gestione-progetti.md)
- [Regole operative](AGENTS.md)
- [Consegna Milestone 1](docs/milestone-1.md)
- [Consegna Milestone 1A](docs/milestone-1a.md)
- [Consegna Milestone 2](docs/milestone-2.md)
- [Modello dati](docs/data-model.md)
- [Matrice permessi e contratto RLS](docs/permissions.md)
- [Infrastruttura, verifiche e DNS pendenti](docs/infrastructure.md)

Stack previsto: Next.js 16, App Router, React 19, TypeScript, Tailwind CSS 4
 e Supabase self-hosted dedicato su Netcup/Coolify. Frontend previsto su Vercel,
con indirizzo pubblico https://www.ariadne-hub.it. Servizi predisposti in 1A; DNS personalizzati pendenti.

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
Type-check, lint, test applicativi e build saranno introdotti con il codice.
Per i controlli infrastrutturali: `python3 scripts/check-backend.py` e
`python3 scripts/supabase-cli.py query 'select current_database();'`.
Per la pagina statica basta un server HTTP su `public/`.
