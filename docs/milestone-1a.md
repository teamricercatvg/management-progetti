# Consegna Milestone 1A — 7 ottobre 2026

**Stato: infrastruttura predisposta, chiusura sospesa per attivazione Aruba.**

## Completato e verificato

- Repository inizialmente pulito e allineato a `origin/main` dopo fetch;
  branch locale dedicato `codex/milestone-1a`.
- Identità GitHub/Vercel dedicate e scope `tor-vergata-igiene` confermati.
- Nuovo progetto Coolify e stack Supabase, con rete, volumi e segreti separati.
- Salute servizi, API Auth/REST, Studio protetto e query database via SSH.
- Database vuoto, signup pubblico disabilitato; nessuna migration applicativa.
- Progetto Vercel collegato a `teamricercatvg/management-progetti`, branch `main`.
- Pagina statica temporanea pubblicata: https://management-progetti.vercel.app.
- Variabili Vercel predisposte nei tre ambienti; service role solo server.
- Domini associati e redirect 308 configurato lato Vercel.
- Backup giornaliero, retention 14 giorni, verifica archivio e ripristino isolato;
  copia iniziale sul Mac con checksum.
- Servizi CDP rimasti attivi, nessuna modifica al loro stack.

## Blocco esterno

Aruba mostra `ariadne-hub.it` in **Attesa Validazione DNS**. Il pannello non
consente ancora la gestione del dominio. I record richiesti sono documentati in
[infrastructure.md](infrastructure.md). DNS, HTTPS pubblico del backend,
HTTPS `www` e redirect dall'apex non sono ancora verificabili.

## Limiti e passaggi successivi

La milestone resta aperta fino alle verifiche sul dominio personalizzato.
Commit e push della consegna sul branch `codex/milestone-1a` autorizzati
il 7 ottobre 2026; nessuna integrazione in `main`. Il deploy
infrastrutturale statico è stato eseguito da questo checkout, non da un commit
remoto. Il trigger di produzione GitHub/Vercel su `main` non è stato esercitato.

Backup esterno automatico, SMTP e staging separato restano decisioni operative
prima dei dati reali. Modello dati, permessi/RLS e applicazione sono attività
successive; la Milestone 2 non è stata avviata.

## File principali

- [Infrastruttura e procedure](infrastructure.md)
- [Compose senza segreti](../infra/supabase-compose.yaml)
- [Wrapper Vercel](../scripts/vercel.sh), [SSH](../scripts/server.sh),
  [Supabase CLI](../scripts/supabase-cli.py)
- [Controllo API](../scripts/check-backend.py),
  [backup](../scripts/backup-server.sh), [ripristino](../scripts/verify-restore.sh)
- [Timer](../infra/ariadne-backup.timer), [servizio](../infra/ariadne-backup.service)
- [Pagina temporanea](../public/index.html), [configurazione Vercel](../vercel.json)
