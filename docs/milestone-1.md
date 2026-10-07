# Milestone 1 — Setup repository e documentazione iniziale

Data: 7 ottobre 2026. Stato: completata; consegna inclusa nel commit iniziale.

## Risultato

- Git inizializzato sul branch main e origin collegato al repository previsto.
- Account teamricercatvg verificato via API, con permesso ADMIN sul repository.
- Repository remoto verificato vuoto; fetch completato senza ref remoti.
- Identità e helper HTTPS configurati solo nel checkout.
- Creati README.md, AGENTS.md, .gitignore, .env.example e .vercelignore.
- Aggiunto scripts/github.sh per il profilo dedicato già disponibile sul Mac.
- Roadmap conservata con un aggiornamento di stato.
- Commit e push su main autorizzati dopo la verifica della consegna locale.

## Convenzioni e decisioni

Branch base main; per le milestone successive usare branch docs/..., chore/...
o feat/... secondo l'intervento. Commit piccoli con prefissi docs:, chore:,
feat:, fix: o test:. La richiesta di una milestone non implica pubblicazione.

Proposta per 1A: management-progetti come nome del progetto Vercel e del
progetto/stack Coolify, coerente con GitHub. Disponibilità e scelta definitiva
restano da verificare insieme a sottodominio Supabase, staging e backup.
Nessun nome è stato riservato o configurato.

Il piano richiede l'account Vercel teamricercatvg@gmail.com e cita lo scope
CDP tor-vergata-igiene da verificare. Le istruzioni CLI generiche indicano uno
scope personale diverso: verificare identità e scope prima del link in 1A.

## Verifiche di consegna

Controllati account, accesso remoto, branch, origin, sintassi del wrapper,
link Markdown locali, valori vuoti nel template e regole ignore per segreti,
dipendenze, build e configurazione Vercel. .env.example resta includibile
in Git ed è escluso dai deploy locali. Controllati contenuti e whitespace.
Type-check, lint applicativo e build non applicabili in assenza di codice.

## Prosecuzione

La Milestone 1A non è iniziata: nessuna connessione al server, installazione,
modifica DNS, creazione di servizio o deploy. I documenti CDP sono stati
consultati senza modificarli. Modello dati e permessi restano da definire.
La pubblicazione iniziale è stata autorizzata esplicitamente il 7 ottobre 2026.
