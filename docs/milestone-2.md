# Milestone 2 — Definizione dettagliata del modello dati

Data: 7 ottobre 2026. Stato: **conclusa; modello dati versione 2 approvato con l’utente**.

## Risultato

- [Modello dati](data-model.md): dizionario di 25 tabelle, campi/tipi/nullabilità,
  cardinalità, diagramma ER, stati, vincoli, indici e strategia di audit.
- [Permessi](permissions.md): copertura di tutte le tabelle, limiti per ruolo,
  visibilità delle colonne, contratto RLS e casi ammessi/negati per i test futuri.
- README e roadmap aggiornati con i collegamenti e lo stato effettivo.

Le alternative sono risolte in una proposta coerente: quadro logico ibrido,
revisione completa dei piani, identità stabile delle voci economiche, rilevazioni
canoniche uniche, validazione e rettifiche, audit generale e accesso per progetto.

## Indicazioni dell’utente sulla proposta iniziale

Sono conservati sotto i punti originali e le annotazioni dell’utente. Le frasi
della proposta 1 corrette dalle annotazioni non rappresentano più la specifica
vigente: la versione 2 del modello e dei permessi recepisce le indicazioni.

1. Una sola organizzazione; gerarchia con un solo padre e attività con un risultato.

Più che una sola organizzazione è una sola piattaforma. Poi ogni progetto può essere condotto da organizzazioni diverse. in alcuni casi una sola, in altri in partenariato con ente capofila e partners

2. Admin crea progetti e approva budget/cronogramma; manager gestisce i progetti
   assegnati, dati economici e membership viewer/operator. Viewer vede il budget
   solo se abilitato; operator limitato alle attività assegnate e ai propri rapporti.

Intanto creiamo solo manager, che legge e scrive quello che riguarda i progetti che gli sono assegnati, e admin che legge e scrive in tutti i progetti, e in più crea progetti, e crea utenti.
quando questa parte funziona creeremo anche gli operatori, quando avremo chiaro cosa vedono e cosa modificano. L'MVP sarà usato solo da Manager e Admin

4. Valuta unica e importi a due decimali; allocazioni del piano in importi;
   consuntivo definito dai pagamenti, con superamenti motivati e segnalati.

Il primo progetto sarà solo in euro, ma in futuro potremo avere una valuta principale (quella del finanziamento) e spese effettuate all'estero, anche in altre valute, che vanno riconvertita a quella principale per le dashboard

6. Solo dati validati alimentano indicatori; nessuno valida i propri dati.
   Correzioni successive tramite rettifiche, senza sovrascrivere i valori validati.

I dati inseriti dal manager sono sempre validati, quelli di altri operatori saranno validati dai manager

8. Snapshot immutabili di piani approvati; archivio e audit, nessuna cancellazione
   operativa distruttiva; rinvio di multi-tenant, cambi valuta, allegati e task.

   giusto, tranne il cambio valuta che deve mutare con le fluttuazioni dei cambi. iniziamo con un tasso medio per mese, che si applica alle spese del mese, e poi valuteremo se farlo giornaliero, possibilmente attingendo ad una fonte ufficiale in modo automatico

## Recepimento nella versione 2

- Una piattaforma con anagrafica enti e composizione per progetto: ente unico o
  capofila con partner. Le organizzazioni non sono tenant né attribuiscono accessi.
- MVP solo Admin e Manager; Admin crea utenti/progetti e assegna i Manager.
  Manager legge/scrive nel proprio ambito, pubblica budget e cronogramma e consulta
  l’audit dei propri progetti. Operator e viewer rinviati, senza tabelle/policy MVP.
- Rapporti e rilevazioni registrati da Manager/Admin immediatamente validati,
  anche se propri. Bozze disponibili solo per contenuti incompleti; rettifiche
  per correggere i dati già registrati. Validazione degli operatori rinviata.
- Valuta principale del finanziamento, primo progetto EUR; spese in valuta estera
  con cambio medio mensile versionato e importi originali/conversioni tracciabili.
  Aggiornamenti del cambio non riscrivono spese contabilizzate: rettifica esplicita.
  Fonte ufficiale automatica e frequenza giornaliera sono evoluzioni successive.
- Snapshot e audit conservati. Anagrafiche globali gestite da Admin; composizione
  progettuale gestibile dal Manager con enti esistenti.

Questi dettagli traducono le indicazioni ricevute; non è richiesta una nuova
approvazione dei cinque punti già commentati. Restano da scegliere prima dell’uso
multivaluta la fonte concreta e la metodologia ufficiale dei tassi mensili.

## Verifiche della specifica

- Letti README, istruzioni operative e roadmap completa a sezioni.
- Verificati stato Git, branch e origin; eseguito fetch. `origin/main` è a
  `d1d6af5`; il checkout di partenza `codex/milestone-1b` è a `8904788`, un commit
  avanti a main e senza commit remoti main mancanti. Nessuna integrazione remota.
- Creato `codex/milestone-2` dal checkout corrente, discendente di main, conservando
  il commit infrastrutturale e tutte le modifiche locali preesistenti. Il branch
  include quindi la base 1A; non è una futura PR documentale isolata da quel commit.
- Verificate copertura della matrice per tutte le tabelle e destinazioni delle FK,
  coerenza delle relazioni interne al progetto e dei flussi di approvazione.
- Controllati a livello progettuale i calcoli: rapporto ponderato 50/150 = 33,33%;
  budget 1.000, speso 300, impegno residuo 400 → disponibile 300.
- Controllati link Markdown locali, contenuti dei nuovi file, diff e whitespace;
  verificata la conservazione delle modifiche precedenti estranee alla milestone.
- Nessun test SQL/RLS eseguito: sono contratti e scenari da implementare e provare.
  Type-check, lint e build applicativi non applicabili a questa consegna documentale.

## Verifiche dell’aggiornamento

Controllati copertura dei permessi su 25 tabelle, destinazioni FK, link locali,
assenza dei vecchi stati di validazione nello schema MVP e coerenza dei cambi.
Esempio aritmetico: 100 × 0,90 + 100 × 0,92 = 182 nella valuta principale.
Le annotazioni dell’utente sono conservate integralmente. Test SQL/RLS rinviati
all’implementazione; nessuna verifica del database dichiarata.

## Stato e prosecuzione

La pubblicazione della consegna su `main` è stata richiesta dall’utente dopo
la chiusura della milestone. Nessun deploy manuale o modifica al database
è parte di questa consegna.
Nessun cambiamento a credenziali, infrastruttura o configurazione email.

La Milestone 2 è conclusa: indicazioni recepite, modello dati e permessi approvati,
verifiche documentali completate. Consegna versionata su `main`.
Da questa pubblicazione si lavora direttamente su `main`, senza creare branch;
i riferimenti ai branch sopra descrivono la preparazione storica.
La Milestone 3 non è iniziata: occorre la relativa richiesta per creare migration.
Le integrazioni dei cambi e le tabelle economiche appartengono alle milestone
12–13, secondo il contratto ora definito.
