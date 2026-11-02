# Collaudo milestone 10–11 — 27 ottobre 2026

Prove eseguite via browser sul sito pubblicato, con sessione autenticata.
Repository locale su `main`, fetch eseguito, nessuna divergenza da `origin/main`.
Nessun commit, push, deploy o modifica del codice applicativo.

## Dati e perimetro

- Albania: consultazione della bozza importata e del modulo dell’utente; nessuna
  modifica salvata dall’agente sul progetto.
- Progetto sintetico creato per il collaudo: `COLL-M1011-20261027`,
  [apri cronoprogramma](https://www.ariadne-hub.it/projects/fbecf47c-f5cf-471c-a214-4f373db3df4b/cronoprogramma).
  Periodo 01/01/2026–31/12/2026. Gerarchia OG-COLL → OS-COLL → R-COLL → A-COLL;
  ADM-COLL amministrativa autonoma; SUB-COLL collegata ad A-COLL.
- Il progetto di collaudo resta disponibile, con piano iniziale pubblicato e
  revisione n. 2 in bozza. Le scritture di prova sono dati sintetici riconoscibili.

## Esiti

| Prova | Esito osservato |
| --- | --- |
| Bozza importata e risultati QL | Le nove attività di Albania compaiono nei tre risultati R.1, R.2 e R.3, con i periodi importati. Nessun piano ufficiale iniziale. |
| Amministrativa, sotto-attività e soggetti | ADM-COLL salvata senza risultato, SUB-COLL collegata ad A-COLL; soggetti visibili nella griglia, gruppi amministrativo e sotto-attività distinti. A-COLL compare sotto R-COLL nel QL. |
| Periodi separati e sovrapposti | SUB-COLL: 01–28 febbraio e 01–30 aprile; marzo vuoto. Terzo periodo 15–20 aprile ammesso e avviso di sovrapposizione visibile. |
| Pubblicazione e revisione | Piano n. 1 pubblicato con motivazione. Nella bozza n. 2 prima fase spostata al 01–31 marzo e periodo sovrapposto annullato con nota. Riaprendo n. 1, febbraio e tutti e tre i periodi originali sono invariati, senza comandi di modifica. |
| Effettivi e cambi di stato | Salvati 10/03/2026–15/01/2027, anche oltre fine progetto, stato Conclusa. Annullamento conserva date e nota; archivio conserva i dati; riattivazione conserva l’annullamento; successiva ripresa restituisce Conclusa con le stesse date e nota. |
| Salvataggio concorrente | **Non superata per il messaggio di conflitto.** Due schede aperte sullo stesso periodo della stessa bozza. Prima scheda salva marzo; seconda tenta titolo/nota differenti sulla versione di febbraio. Dopo una lunga attesa restituisce «Operazione non riuscita. Verifica i campi e ricarica.», anziché l’avviso specifico di bozza cambiata. Ripetizione sulla scheda obsoleta: stesso esito. Titolo, nota e date compilati restano nel modulo; il primo salvataggio non è sovrascritto. |

La prova concorrente ha usato due schede, non due finestre separate. Durante il
collaudo sono intervenuti cambi di navigazione dell’utente e problemi del controllo
browser sui dialoghi nativi. La ripetizione del salvataggio obsoleto è stata
eseguita senza altre scritture dell’agente contemporanee e ha restituito lo stesso
errore generico. La causa server/rete non è stata determinata: non attribuire il
problema al database senza ulteriori evidenze.

## Sotto-attività Procurement dell’utente

All’inizio il modulo non salvato mostrava inizio effettivo 27/11/2026 e fine
01/11/2026, con errore di validazione. L’utente ha indicato 27/12/2026 come
correzione. Prima dell’intervento dell’agente, la pagina è cambiata: CC — Procurement
risultava già salvata e archiviata, collegata ad A1.2, con date 27/11/2026–04/12/2026,
descrizione e output conservati, zero periodi previsti. La correzione al 27/12
**non è stata applicata** perché il modulo non era più aperto e l’archiviazione era
avvenuta nel frattempo. Non è stata creata una copia.

La riga è consultabile nel cronoprogramma nel gruppo delle sotto-attività e in
«Gestione attività e date effettive», con comando «Riattiva attività».
Le sotto-attività sono righe autonome del calendario: non sono un ulteriore livello
dell’albero QL.

## Limiti e verifiche aggiuntive

- Il consuntivo oltre fine progetto è conservato e leggibile nelle date esatte,
  ma la griglia resta limitata ai mesi del progetto: gennaio 2027 non compare.
- Il progetto Albania va da novembre 2026 a novembre 2029 incluso: la griglia
  mostra M1–M37, coerentemente con mesi di calendario inclusivi. Non è stata
  modificata la data finale del progetto.
- `npm test`: 20 test unitari superati. Nessuna nuova esecuzione della suite SQL,
  delle fixture browser automatiche, di build o di deploy in questo collaudo.
- Evidenze locali: `verifiche/milestone-10-11-20261027/cronoprogramma.jpg`,
  `conflitto.jpg` e `conflitto-dettaglio.jpg` nella stessa cartella.

Il collaudo non è dichiarato interamente superato: resta da diagnosticare e
correggere il feedback del conflitto di versione, poi ripetere la prova.


## Verifica per commit e push — 2 novembre 2026

Verifiche ripetute sul checkout che include UI pubblicata e cestino:

| Comando / prova | Esito |
| --- | --- |
| `npm run typecheck` | Superato |
| `npm run lint` | Superato |
| `npm test` | 20 test superati |
| `npm run build -- --webpack` | Superata con Next.js 16.4.0 installato localmente |
| `UI_PRODUCTION=1 npm run test:ui -- tests/ui/schedule.spec.ts` | 3 test superati sulla build locale: cronoprogramma/revisioni/navigazione, cestino Manager, cestino Admin |
| `bash scripts/test-activity-deletion-local.sh` | Superato: intera catena migration su due database vuoti, confronto schema, regressione cronoprogramma, permessi, audit, storico e concorrenza |
| Confronto manifest ultimo rilascio UI | Tutti i sorgenti applicativi e lockfile coincidono dopo esclusione del cestino su copia temporanea |

PostgreSQL temporaneo e browser hanno richiesto esecuzione fuori sandbox per
memoria condivisa e porte locali; nessun accesso al database operativo.
Le fixture UI verificano l’interfaccia, mentre le autorizzazioni reali sono
verificate dalla suite SQL. Nessuna nuova prova autenticata sul sito online.

Limiti ancora aperti:

- Migration del cestino non applicata in produzione: ripristinare accesso SSH,
  verificare backup/cronologia e seguire l’[ordine SQL](activity-deletion-proposal.md).
- Deploy Git automatico di `main` sospeso in `vercel.json` per questa consegna:
  riattivarlo dopo la migration e l’autorizzazione al rilascio frontend.
- Installazione locale Next.js 16.4.0 non allineata al lockfile 16.4.2:
  eseguire `npm ci` e ripetere build/verifiche prima del prossimo rilascio.
  La build odierna non certifica l’esecuzione con 16.4.2.
- Messaggio generico nel conflitto osservato il 27 ottobre ancora da diagnosticare
  e ricollaudare online; non corretto in questa consegna.
- Collaudo operativo del cestino e riscontro umano restano da eseguire dopo
  il rilascio coordinato backend/frontend.

Gli screenshot locali e `verifiche/accesso-20261007.sql` non vengono inclusi:
non sono sorgenti applicativi e possono contenere dati operativi. Restano sul Mac.
