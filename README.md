# Gestione Progetti — Ariadne Hub

Applicazione in progettazione per la gestione di progetti non profit: quadro
logico, attività, cronogramma, indicatori, budget e rapporti operativi.

## Stato

Milestone 1 completata localmente il 7 ottobre 2026: Git inizializzato e
collegato a [teamricercatvg/management-progetti](https://github.com/teamricercatvg/management-progetti),
documentazione e protezioni iniziali predisposte.
La consegna è inclusa nel commit iniziale; pubblicazione su main autorizzata
il 7 ottobre 2026. Il remoto era vuoto alla verifica iniziale.
Non esiste ancora un'applicazione eseguibile: nessuna dipendenza, script npm,
schema database o configurazione di deploy è stata introdotta.

## Documentazione

- [Roadmap e requisiti](docs/roadmap-gestione-progetti.md)
- [Regole operative](AGENTS.md)
- [Consegna Milestone 1](docs/milestone-1.md)

Stack previsto: Next.js 16, App Router, React 19, TypeScript, Tailwind CSS 4
 e Supabase self-hosted dedicato su Netcup/Coolify. Frontend previsto su Vercel,
con indirizzo pubblico https://www.ariadne-hub.it. Servizi da configurare in 1A.

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

`.env.example` contiene soltanto nomi e valori vuoti. Quando sarà disponibile
l'istanza dedicata, copiarlo in `.env.local` e compilare i valori reali.
La service role resta solo server. Non usare endpoint o credenziali di CDP.

```bash
git check-ignore .env .env.local .env.production .vercel/project.json
bash -n scripts/github.sh
```

Leggere anche i nuovi file: git diff non mostra quelli non tracciati.
Type-check, lint, test applicativi e build saranno introdotti con il codice.
La Milestone 1A richiede una richiesta dedicata.
