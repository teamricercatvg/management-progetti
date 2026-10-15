# Verbale sintetico di collaudo — Milestone 5, 6 e 7

**Data: 15 ottobre 2026**

Sono state verificate le funzionalità relative a ruoli e permessi,
navigazione e gestione dei progetti.

## Correzioni effettuate

- **Pulsante “Riprova”:** dopo un errore di caricamento non recuperava
  correttamente i dati. È stato corretto per effettuare una nuova richiesta
  al server.
- **Lockfile delle dipendenze:** completate le informazioni mancanti che
  impedivano l’installazione pulita del progetto. L’installazione con
  `npm ci` è stata ripetuta con successo.
- **Test automatici:** aggiunti controlli sul recupero dopo errore, sulla
  paginazione e sulla conservazione di date e valuta in caso di validazione
  non superata.

Le correzioni sono incluse nel commit **`4a92317`** e **pubblicate sul sito
Ariadne**. File interessati: `src/app/(workspace)/error.tsx`,
`package-lock.json`, `tests/ui/auth-fixture.mjs` e `tests/ui/projects.spec.ts`.

## Segnalazioni verificate senza necessità di modifiche

- **Date nel modulo:** vengono conservate correttamente dopo un errore.
  L’anomalia iniziale dipendeva dallo strumento di compilazione automatica.
- **Menu sul telefono:** è presente in alto anziché lateralmente, come
  previsto dal layout.

## Esito delle verifiche

Superati i controlli su permessi Admin/Manager, progetti, validazioni, enti,
cambi di stato, archiviazione e modifiche concorrenti. Recupero password,
nuovo accesso e utilizzo da telefono sono stati confermati dall’utente;
verificato direttamente anche il rifiuto del link di recupero riaperto.
Il messaggio pubblico non distingue un link consumato da uno scaduto.

Superati **12 test browser e 5 test applicativi**, oltre a lint, verifica
TypeScript e build. Il recupero dopo un guasto è stato verificato con un
errore simulato nei test locali, senza interrompere il backend pubblico.

**Esito finale:** nessun problema rimasto aperto negli scenari di collaudo
eseguiti.

Per ambienti di prova, passaggi, evidenze e cronologia degli esiti, consultare
il [verbale tecnico completo](collaudo-milestone-5-7.md). Le annotazioni
iniziali di quel documento descrivono fasi precedenti: lo stato finale
prevale sulle osservazioni storiche.
