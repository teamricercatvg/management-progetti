# Milestone 12 — Piano finanziario

Consegna del 14 novembre 2026. Implementazione locale su `main`, dopo fetch e
fast-forward da `3ab7d67` a `2a09f8e`. Le modifiche locali preesistenti a configurazione
e documentazione infrastrutturale sono rimaste nel checkout. Nessun commit, push,
deploy o aggiornamento del database operativo eseguito per questa consegna.

La richiesta del 14 novembre estende esplicitamente la milestone: comprende anche
entrate, impegni, spese, trasferimenti e dashboard finanziaria, precedentemente
distribuiti tra M12, M13 e M15. La UI usa sempre **Piano finanziario**; il prefisso
SQL `budget_` conserva la terminologia tecnica del modello iniziale.

## Funzioni disponibili

Percorso: dettaglio progetto → **Piano finanziario**.

| Pagina | Funzione |
| --- | --- |
| Situazione finanziaria | Previsto, ricevuto, speso, impegni da pagare, residuo del piano e saldo dei fondi; confronto con il tempo trascorso |
| Piano e ripartizioni | Categorie e voci, bozza, approvazione, copia in una nuova revisione, storico e confronto con il piano iniziale |
| Entrate | Versamenti del donatore; partner e conto obbligatori |
| Impegni | Ordini/contratti, partner e voce obbligatori, conto e risultato opzionali; chiusura libera il non pagato |
| Spese | Pagamenti effettivi diretti o collegati a un impegno; conto opzionale, voce e partner obbligatori |
| Trasferimenti | Partner mittente e destinatario, conti opzionali; anche trasferimento tra due conti distinti dello stesso partner |
| Conti e cambi | Conti per partner, archiviazione, saldi dei soli movimenti di progetto e versioni dei cambi medi mensili |

I registri hanno ricerca, filtri per partner/stato/date, dettagli e paginazione.
Le bozze non contribuiscono ai saldi. I movimenti registrati si correggono tramite
annullamento motivato e nuova registrazione; non si sovrascrive lo storico.
I trasferimenti descrivono fondi già trasferiti: l’applicazione non impartisce
ordini alle banche.

## Ripartizioni e revisioni

Una quota è una combinazione **risultato × partner × anno di progetto** con un
solo importo. Ad esempio, su 1.000 EUR: 600 EUR per R1/Partner A/Anno 1 e 400 EUR
per R2/Partner B/Anno 2. Le tre viste sommano le medesime quote, senza triplicare
il piano. Ogni dimensione può restare da attribuire; anche la parte della voce
non ancora suddivisa resta visibile. Le combinazioni uguali si aggiornano,
non creano doppioni; importo zero rimuove una quota dalla visualizzazione.

La somma delle quote non può superare l’importo della voce. Per ridurre una voce
occorre prima ridurre le ripartizioni. Una voce soppressa si conserva con importo
zero. L’identità della voce resta la stessa nelle revisioni, nei contratti e nei
pagamenti. Le revisioni approvate conservano importi, categorie, etichette delle
ripartizioni e date del progetto. È ammessa una sola bozza per progetto; viene
copiata integralmente dal piano corrente. Il primo piano resta il riferimento
iniziale. Tutte le approvazioni richiedono una motivazione/riferimento.

Gli anni sono intervalli di dodici mesi dall’avvio, non anni solari, fino a 100
annualità. Il piano usa le date della versione selezionata; i riepiloghi del
consuntivo per anno usano le date del piano corrente approvato. Il confronto del
tempo trascorso usa le date attuali del progetto. Le date dei movimenti fuori dal
progetto sono ammesse e segnalate. I pagamenti collegati conservano voce, partner
e risultato dell’impegno, anche se quel risultato viene poi archiviato.
Se il progetto viene accorciato, una quota su un anno non più valido si può
azzerare nella bozza; la pubblicazione resta bloccata finché vi sono quote
positive fuori durata. Le versioni già approvate conservano le date originali.

## Calcoli

- `speso`: pagamenti registrati e non annullati.
- `impegni da pagare`: importi degli impegni aperti meno i rispettivi pagamenti
  registrati, anche se eseguiti in anni diversi. Gli impegni chiusi non lasciano
  un residuo da pagare.
- `residuo del piano`: previsto − speso − impegni da pagare.
- `ricevuto`: sole entrate dal donatore, senza trasferimenti interni.
- `saldo fondi del partner`: entrate + trasferimenti ricevuti − trasferimenti
  inviati − pagamenti; a livello progetto i trasferimenti si compensano.
- `fondi dopo gli impegni`: saldo fondi − impegni da pagare.

Esempio verificato: piano 1.000, impegno 600, pagamento collegato 200 e pagamento
diretto 100 → speso 300, impegni da pagare 400, residuo piano 300. Con entrate 800:
saldo fondi 500 e fondi dopo gli impegni 100.

Le spese non ereditano percentuali dal piano: per risultato vengono mostrate solo
le attribuzioni esplicite, con riga «Non attribuito». Entrate e trasferimenti non
sono assegnati a voci, risultati o annualità: i saldi dei fondi vengono quindi
mostrati per progetto/partner e non inventati per le altre dimensioni.

Superamenti del previsto della voce o della quota del partner sono ammessi solo
con motivazione nelle note. Il pagamento oltre il residuo di un impegno è invece
bloccato. Il saldo dei fondi può essere negativo e viene evidenziato: non è un
blocco contabile e non è l’estratto conto completo della banca. I movimenti senza
conto restano in una riga distinta da riconciliare.

## Modello, precisione e protezioni

Migration: `supabase/migrations/20261114120000_financial_plan.sql`.

Nove tabelle: `budget_categories`, `budget_line_items`, `budget_revisions`,
`budget_lines`, `budget_allocations`, `project_budget_state`,
`project_bank_accounts`, `project_exchange_rates`, `financial_entries`.
Il registro unificato sostituisce le tabelle concettuali `commitments`/`expenses`,
con tipo e vincoli espliciti; le quote combinate sostituiscono la sola ripartizione
per risultato prevista nel modello iniziale.

Scritture solo tramite RPC `edit_financial_plan`, owner dedicato senza login,
superuser o bypass RLS; nessun grant DML diretto al client o service role.
Admin e Manager assegnati hanno gli stessi poteri sui dati finanziari, nel
rispettivo ambito. L’archivio rende il progetto di sola lettura. Autore,
timestamp, tasso applicato e puntatori delle revisioni sono fissati dal database.
Valuta non modificabile dal primo piano/cambio/movimento; un’associazione partner
già utilizzata non può essere sostituita con un altro ente.

Tutte le mutazioni prendono il lock del progetto e ricontrollano accesso/stato.
Versioni ottimistiche proteggono bozze e registrazioni da salvataggi obsoleti.
Gli UUID delle nuove registrazioni e i riferimenti unici per tipo impediscono
doppi inserimenti dello stesso modulo. L’RPC `financial_snapshot` legge tutti i
dati in un unico snapshot SQL, soggetto a RLS, senza il limite PostgREST di 1.000
righe che potrebbe troncare i totali. L’audit conserva importi, stati e relazioni,
escludendo IBAN e testo libero; la motivazione resta nel record immutabile.

Importi del piano e movimenti nella valuta principale: due decimali, singolo
importo minore di 1.000 miliardi. Somme applicative in centesimi `BigInt`;
percentuali solo derivate. Spese estere: originale fino a sei decimali,
conversione SQL `round(originale × tasso, 2)`. Cambi mensili manuali, fonte,
metodo e data obbligatori; correzioni tramite nuove versioni motivate.
Importi originali e tassi viaggiano come stringhe per preservarne la precisione.
Senza cambio si può conservare/scartare la bozza, ma non registrare il pagamento.

## Analisi delle interfacce e scelte di design

Analisi svolta prima della costruzione, consultando documentazione e immagini
delle interfacce pubblicate dai produttori il 14 novembre 2026.

| Riferimento | Elemento osservato | Applicazione in Ariadne |
| --- | --- | --- |
| [Ramp — Budgets overview](https://support.ramp.com/budgets-overview-and-setup/) | Sintesi previsto/consuntivo/impegni, navigazione separata e indicatori di utilizzo | Cinque metriche compatte, barre per speso/impegni e registri separati |
| [Airtable — Grouping records](https://support.airtable.com/articles/7361540623-grouping-records-in-airtable) | Controlli di raggruppamento, filtri e subtotali per dimensione | Viste per voce/partner/risultato/anno, filtri combinabili e quote non assegnate esplicite |
| [SAP — Standard Hierarchy Reports](https://help.sap.com/docs/SAP_S4HANA_ON-PREMISE/4dd8cb7b1c484b4b93af84d00f60fdb8/36f2d353ca9f4408e10000000a174cb4.html) | Confronti tabellari piano, consuntivo, impegni e residui | Colonne numeriche stabili e confronto con il piano iniziale |

Scelte autonome: corpo tabelle 12 px, intestazioni 10 px, numeri tabulari allineati
a destra, separatori leggeri, prima colonna e intestazioni fisse, scorrimento
contenuto, paginazione dei registri. La larghezza desktop viene usata interamente;
su schermi piccoli le tabelle scorrono senza comprimere i valori.
Colori sobri con etichette testuali, evidenza dei valori negativi, focus visibile,
label dei moduli e tabelle semantiche. I form sono aperti su richiesta e i valori
rimangono compilati quando il server segnala un errore.

## Collaudo e rilascio

- `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- Test browser dei flussi piano/ripartizioni/approvazione/revisione, filtri,
  saldi, pagamento collegato, errore di superamento e conservazione dei campi.
- `bash scripts/test-migrations.sh`: intera catena applicata due volte su
  PostgreSQL 15 isolato, confronto schemi, vincoli/RLS/audit, rollback completo.
- Prova concorrente: due pagamenti da 400 su un impegno da 600; il secondo
  attende il lock, vede il primo pagamento e viene respinto.
- Verifica grafica desktop con soli dati sintetici; nessun test scrive dati
  nel progetto o database operativo.

Esito finale: 30 test unitari superati; 42 test browser delle sezioni esistenti
e quattro test finanziari verificati. Il nuovo test entrate/trasferimenti aveva
inizialmente un selettore ambiguo tra modulo e filtro del registro: corretto
il selettore, tutti e quattro i test finanziari sono passati. Lint, typecheck,
build e collaudo PostgreSQL completati. Copie locali numerate dei tipi generati
in `.next` sono state conservate fuori dal checkout per evitare dichiarazioni
TypeScript duplicate; nessun sorgente rimosso.

Per il rilascio, quando richiesto: riesaminare il diff selezionando solo i file
della milestone, applicare la migration versionata con i wrapper dedicati,
pubblicare il frontend e collaudare con Admin/Manager su progetto autorizzato.
Non sono compresi allegati, import da Excel, cambi automatici, contabilità IVA,
riconciliazione bancaria automatica o ricostruzione del saldo storico a una data.
La dashboard generale di M15 resta distinta dalla dashboard finanziaria qui
implementata.


## Rilascio autorizzato — 14 novembre 2026

Commit applicativo `187bfdb`, pubblicato su `origin/main`. Backup completo
verificato: `/var/backups/management-progetti/20261114T162449Z`.
La CLI con `PGSSLMODE=disable` ha rilevato una sola migration pendente:
`20261114120000_financial_plan.sql`. Il primo tentativo con il ruolo postgres
è stato annullato per proprietà delle tabelle; applicazione completata tramite
`/usr/local/sbin/ariadne-db-migrate` come `supabase_admin`, includendo versione,
nome e testo nello storico Supabase nella stessa transazione. Ulteriore backup
preventivo del wrapper: `20261114T162528928929Z.dump`.

Dry run successivo: database aggiornato, nessuna migration pendente. Verificate
le nove tabelle con RLS attiva e i controlli health/REST/autenticazione del
backend. Nessun movimento finanziario reale creato per il collaudo.

Frontend pubblicato da archivio Git pulito del commit applicativo; deploy
`dpl_8tvZqdX7WD1ajfM5T6oHrpA81Mte` in stato **READY**, alias
https://www.ariadne-hub.it. Build remota e TypeScript completati. Collaudo
con un account reale in produzione da eseguire; i flussi sono stati verificati
localmente con dati sintetici. Le indicazioni di stato locale nelle sezioni
precedenti documentano la consegna iniziale e sono superate da questo rilascio.

## Gerarchia AICS e importazione Tirana — 14 novembre 2026

Estensione richiesta durante l'importazione: gerarchia esplicita macrovoce →
categoria → voce. La macrovoce e il suo nome sono snapshot della riga di piano;
le revisioni ne conservano la struttura e le versioni approvate restano immutabili.
La categoria è condivisa nella bozza: modificarne la macrovoce aggiorna tutte le
sue voci in quella bozza. I vecchi client che non inviano i campi conservano
la gerarchia esistente. La RPC precedente è richiamabile solo dal ruolo interno.
Migration: `20261114173000_financial_hierarchy.sql`.

Il piano mostra inizialmente le macrovoci, con subtotali e ripartizioni aggregate;
le sezioni sono espandibili fino alle voci. I codici compatti dei risultati e
partner hanno la denominazione completa nel tooltip. Note e fonti sono
espandibili. La dashboard aggiunge la vista Per macrovoce. Nessun subtotale
viene registrato come spesa o sommato nuovamente.

Per Tirana sono state riconciliate le 60 voci valorizzate tra PF ufficiale,
annualità e foglio Riparto partner. Conservate anche 12 categorie a zero del
modello AICS. Il responsabile ha confermato: incrocio proporzionale per le quote
non esplicitamente incrociate nei file, associazione della quota FNSBC a UNSBC,
fine al 31 ottobre 2029. Le fonti e le ipotesi restano nelle note delle voci.
L'importazione usa audit di sistema, transazione unica e controlli dei totali,
senza creare entrate, impegni, spese o trasferimenti.

Verifiche: 31 test unitari; cinque test browser finanziari, inclusi espansione,
subtotali invarianti e filtro per macrovoce; suite PostgreSQL completa con
snapshot della gerarchia, autorizzazione, concorrenza e rollback; typecheck,
lint e build. I dati di progetto e le credenziali non sono inclusi nel repository.

Rilascio gerarchia: commit `d374beb`, deploy
`dpl_8ePDLtHq2VEh48XbHd74XFyPFmg6` READY sul dominio operativo.
Migration applicata con backup `20261114T163801490012Z.dump`.
Importazione Tirana completata in transazione dopo prova con rollback; backup
`20261114T163852663551Z.dump`. Rilettura tramite snapshot con RLS: confronto
integrale di importi, descrizioni, gerarchia, note e 151 quote con i dati preparati,
nessuna differenza; sei macrovoci e tre annualità, zero movimenti finanziari.
