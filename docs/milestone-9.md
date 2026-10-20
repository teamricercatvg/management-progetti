# Milestone 9 — Definizioni degli indicatori

Implementazione del 20 ottobre 2026, rilascio e invio della consegna a Chiara Piga
richiesti esplicitamente dall’utente. Stato del rilascio riportato in fondo.

## Utilizzo

Da Progetti aprire il progetto e **Indicatori**, disponibile anche dal quadro
logico. Gli indicatori sono raggruppati per obiettivo generale, obiettivo specifico
o risultato; ogni elemento può avere più indicatori. Filtri per elemento e archivio.

Ogni definizione contiene codice univoco nel progetto, titolo, metodologia,
unità, fonte di verifica, direzione attesa, metodo di aggregazione, baseline e
target con date. I rapporti conservano numeratore e denominatore e mostrano il
valore derivato con scala 1 o 100; denominatore strettamente positivo, valori
oltre il 100% ammessi. I valori numerici possono rappresentare conteggi o misure
pubblicate, ad esempio un tasso ufficiale con unità «per 1.000» e metodo «ultimo
valore». Non si ricostruiscono conteggi grezzi non presenti nella fonte.

Metodi ammessi: somma/ultimo/media per valori numerici; rapporto fra somme/ultimo
per rapporti. La scelta definisce la metodologia futura, non calcola rilevazioni
inesistenti. Non fare la media semplice delle percentuali né sommare serie
cumulative. I contributi additivi richiedono prevenzione della doppia conta.

In **bozza** baseline o target possono essere assenti: ciascun gruppo deve
restare interamente vuoto oppure completo (data e valore, o data e N/D).
**Attivo** richiede entrambi i gruppi completi, target non anteriore alla baseline.
Zero resta un numero distinto da «Non disponibile». Riportare anni e periodi
relativi (M1–3, M36), valori ancora da definire e relative motivazioni nelle note,
senza inventare una data puntuale. Finché mancano i dati richiesti la definizione
resta in bozza. Le note non alimentano calcoli automatici.

Archiviazione con conferma, senza cancellazione fisica. Ripristino individuale
in bozza con valori conservati e successiva eventuale attivazione. Il ramo del
quadro logico archivia atomicamente anche gli indicatori collegati; per ripristinarli
riattivare prima i rispettivi obiettivi/risultati. Progetto archiviato in sola lettura.

## Riferimento Tirana

Consultati in sola lettura i documenti forniti dall’utente:
`01_rev 20.10 Doc Prog Hub_Pediatrico_Tirana.docx` e
`02_Quadro_Logico_Hub_Pediatrico_Tirana_01ottobre2026_UNSBC.xlsx`.
L’esempio ha guidato i campi facoltativi di codifica esterna, periodo/frequenza e
popolazione, definizione di N/D, note baseline e target (massimo 10000 caratteri
ciascuno). Metodologia e fonti ammettono descrizioni estese. Nessuna importazione
automatica e nessuna modifica dei documenti o dei dati operativi.

Una soglia percentuale prevista senza numerosità definita può essere espressa
come rapporto normalizzato, ad esempio 80/100, esplicitando nelle note che è una
soglia percentuale e non una coorte osservata. Non inventare denominatori di
beneficiari. Baseline non disponibile e target relativo richiedono una bozza.

## Implementazione e sicurezza

Migration `20261020140000_indicators.sql`: FK composita nello stesso progetto,
RLS Admin/Manager assegnato, grants di colonna, vincoli di tipo/gruppo/date,
indici, audit e lock di progetto condiviso con il quadro logico. Progetto, autore,
timestamp e versione non sono modificabili dal client. Le azioni server verificano
sessione e `row_version`; una modifica concorrente non viene sovrascritta.

L’audit conserva collegamenti, stato e configurazione numerica precedente/successiva;
non duplica le descrizioni estese. L’archiviazione del ramo include gli indicatori
nella RPC esistente, preservandone il controllo della versione e i permessi.
Nessuna service role nel frontend. Una voce referenziata da indicatori non cambia tipo.

Le rilevazioni, il congelamento metodologico dopo la prima rilevazione validata,
i valori correnti, i rapporti, la percentuale di raggiungimento, i target multipli
e la dashboard restano alle milestone successive. La 9 non introduce una tabella
parallela di valori osservati né modifica il cronogramma.

## Collaudo suggerito

1. Creare una bozza su un obiettivo, poi due indicatori sullo stesso risultato;
   filtrare per elemento e verificare la persistenza dopo ricaricamento.
2. Provare un valore numerico con baseline zero e target positivo; completare
   le date e attivarlo. Provare un tasso decrescente con unità esplicita.
3. Creare un rapporto: baseline 0/25, target 22/25, scala 100; atteso 0% e 88%.
   Verificare il rifiuto di denominatore zero e target anteriore alla baseline.
4. Salvare una baseline non disponibile in bozza con motivazione; verificare
   che non venga visualizzata come zero e che l’attivazione incompleta sia respinta.
5. Provare codice duplicato e modifica dello stesso indicatore in due schede:
   messaggio leggibile, campi conservati e nessuna sovrascrittura del dato più recente.
6. Archiviare/ripristinare un indicatore e, su un ramo di prova, archiviare il ramo:
   controllare archivio, contenuti conservati e ripristino dal genitore verso i figli.
7. Con Admin e Manager assegnato verificare modifica; con Manager non assegnato
   verificare assenza di accesso. Controllare progetto archiviato e vista mobile.

## Verifiche e rilascio

- Typecheck, lint, build Webpack e 16 test unitari superati.
- Suite SQL PostgreSQL 15 isolata: vincoli, RLS, audit, revoche, archiviazione
  atomica, scrittura concorrente, replay identico dello schema e rollback superati.
- 25 scenari browser di regressione e 4 scenari indicatori superati su build
  di produzione con backend sintetico. Corrette selezioni ambigue nei nuovi test;
  le instabilità di hot reload incontrate in sviluppo non si riproducono sulla
  build di produzione. Nessuna scrittura di collaudo sul database operativo.
- Controllati lista e form a 1440 e 320 px; lista anche a 390 px.
- Backup `/var/backups/management-progetti/20261020T162602Z`, checksum,
  pg_verifybackup e ripristino isolato verificati.
- Migration applicata come `supabase_admin`, con registrazione transazionale
  nello storico Supabase e reload PostgREST; RLS, quattro policy, assenza di
  accesso anonimo e impossibilità di modificare l’autore verificati sul backend.
- Frontend: pubblicazione autorizzata, in corso. Identificativo e verifica finale
  saranno registrati dopo la pubblicazione; collaudo autenticato con dati reali
  affidato a Chiara. Modifiche infrastrutturali preesistenti escluse dal commit.
