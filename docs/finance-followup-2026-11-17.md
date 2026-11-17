# Piano finanziario — riscontri del 17 novembre 2026

Modello di correzioni e reminder approvato dall’utente in chat il 17 novembre.
Implementazione locale su `main`, riallineato a `f3aee2b`; modifiche documentali
preesistenti conservate. Commit e push autorizzati dopo revisione dell’anteprima
locale da parte dell’utente. Nessun deploy o migration in produzione.

## Comportamento

- Il dettaglio del movimento si espande sotto la riga selezionata; apertura e
  chiusura usano i dati già caricati. Il parametro `entry` conserva i link diretti.
- Le schede finanziarie hanno prefetch completo e stato di caricamento dedicato.
  Lettura progetto e snapshot finanziario sono paralleli, dopo autenticazione.
  Nessuna cache condivisa di dati finanziari o permessi.
- Icone modifica e cestino nel dettaglio di entrate, impegni, spese e trasferimenti.
  Le bozze si modificano; i registrati si correggono con motivazione e riferimento
  distinto, annullando e sostituendo nella stessa transazione. Un errore ripristina
  anche l’originale. Il collegamento `correction_of_id` conserva lo storico.
- Il cestino usa l’annullamento motivato già esistente: nessuna cancellazione fisica.
  I movimenti annullati restano consultabili e non concorrono ai saldi. Rimangono
  le protezioni sugli impegni chiusi o con pagamenti: prima occorre gestire i
  pagamenti collegati; la chiusura libera soltanto il residuo.
- Le spese hanno un reminder con testo e priorità verde/arancione/rossa. L’icona
  appare solo con testo presente e ha descrizione accessibile. Svuotare il testo
  rimuove anche la priorità. La correzione copia il reminder nella nuova spesa.

## InforEuro

[Fonte ufficiale](https://commission.europa.eu/funding-and-tenders/procedures-guidelines-tenders/information-contractors-and-beneficiaries/exchange-rate-inforeuro_it).
API verificata con lettura pubblica: `https://ec.europa.eu/budg/inforeuro/api/public/monthly-rates`.

Per progetti rendicontati in EUR, si può scegliere valuta locale e mese, leggere
il tasso e salvarlo. La valuta dell’ultimo cambio salvato viene proposta alla
riapertura con il mese corrente. La registrazione di una spesa non EUR importa
il tasso del mese del pagamento se manca; la bozza resta possibile senza fonte.
Non sostituisce automaticamente cambi manuali o versioni esistenti.

InforEuro pubblica un tasso **contabile mensile**, non una media aritmetica
mensile: il valore è espresso in unità estere per EUR. Ariadne ne salva il
reciproco a 12 decimali usando aritmetica intera, e conserva fonte, metodo,
mese e data di acquisizione. Gli importi restano convertiti dal database.
Solo i dati pubblici della fonte sono memorizzati nella cache per un’ora;
nessun dato del progetto è inviato alla Commissione.

Il modello corrente non contiene un paese strutturato del progetto: non si
interpreta il titolo per inferire una valuta. Per Malawi si indica MWK la prima
volta. Un progetto con sole spese EUR non richiede importazioni. L’aggiornamento
è al bisogno (apertura/registrazione), non un job mensile esterno. Fonte assente
o mese non pubblicato producono un messaggio esplicito, mai un tasso inventato.

## Database e permessi

Migration `20261117100000_financial_followup.sql`: tre colonne sulle registrazioni,
vincoli di appartenenza allo stesso progetto, unicità della sostituzione,
validazione della coppia testo/priorità. RPC `correct_entry` e `save_reminder`
con lock progetto, RLS Admin/Manager, protezione archiviati e versione ottimistica.
L’audit registra collegamento, priorità e presenza del reminder, non il testo.
Nessun grant DML diretto aggiunto. Applicare la migration prima del frontend.

## Verifiche

Test unitari del reciproco, precisione e risposte invalide; regressioni finanziarie;
collaudo SQL in PostgreSQL 15 temporaneo sul Mac con soli dati sintetici, senza
connessioni di rete. Test browser con fixture locale, non sul progetto operativo.
Esiti finali riportati nella consegna della sessione.

Esito finale: 33 test unitari, sette scenari browser finanziari (le due nuove
prove ripetute dopo le rifiniture), typecheck, lint e build Next.js 16.4.2
superati. Catena completa di migration applicata su PostgreSQL 15 isolato;
regressioni e nuovi casi SQL superati, inclusi rollback della correzione,
reminder, ruoli diversi, impegni pagati e progetto archiviato. Database
temporaneo arrestato. API InforEuro verificata con lettura reale; browser
collaudato con risposte simulate, senza dipendenza dalla disponibilità esterna.

Le dipendenze locali erano disallineate (Next.js 16.4.0): ripristinate con
`npm ci` dal lockfile esistente, senza modificare manifest o lock. Next.js
segnala ancora un avviso di vulnerabilità sulla versione prevista dal progetto.
L’aggiornamento di sicurezza resta da valutare separatamente prima del rilascio.
La build è riuscita al secondo avvio, dopo il promemoria bloccante del tool.

## Consegna GitHub

Consegna su `main` autorizzata il 17 novembre 2026. Inclusi solo sorgenti,
migration, test e documentazione di questo intervento. Esclusi documenti
preesistenti, file di verifica e variazioni dei tipi generate dal server locale.
Il deploy automatico da Git su `main` resta disabilitato in `vercel.json`: il push
non pubblica il frontend né applica la migration al database operativo.

## Rilascio in produzione — 17 novembre 2026

Su richiesta esplicita dell’utente, pubblicato il commit `43343bd` da pacchetto
pulito, senza env locali o dati di verifica. Deployment
`dpl_tZcC86yWGaMrcRMxg7nvX6iYDcBk`, stato READY, alias
https://www.ariadne-hub.it. Build remota Next.js 16.4.2 completata in 18 secondi.

Accesso SSH ripristinato sbloccando la chiave esistente nell’agente locale;
nessuna modifica alle autorizzazioni SSH del server. Migration
`20261117100000_financial_followup.sql` applicata tramite wrapper dedicato,
backup preventivo `/var/backups/ariadne-migrations/20261117T144617583047Z.dump`.
Cronologia registrata nella stessa transazione; tutti i 17 movimenti precedenti
invariati, verificati tramite impronta dei campi preesistenti. Fonte registrata
identica al commit (MD5 `fe9df4e6ef6e2e09142f302e497ea6e8`).
RLS attiva, RPC consentita ad authenticated e negata ad anon, UPDATE diretto negato.
Le indicazioni di stato locale nelle sezioni precedenti descrivono la consegna
iniziale e sono superate da questo rilascio. Collaudo autenticato dei nuovi flussi
in produzione da eseguire dall’utente; nessun movimento operativo modificato.

## Anteprima conversione spese — successiva modifica locale

Aggiunto riquadro nel modulo spese estere per progetti in EUR: importo locale,
cambio del mese del pagamento, fonte e controvalore EUR, aggiornati al variare
di data/valuta/importo. Usa il cambio già salvato se presente, altrimenti legge
InforEuro; non salva cambi durante la compilazione. Arrotondamento in centesimi
con aritmetica intera coerente con SQL. Registro con valuta EUR esplicita accanto
all’originale; importo sconosciuto segnalato invece di mostrare zero.
Include la rinomina richiesta del riquadro e campo in “Reminder”.
Verificati typecheck, lint, 34 test unitari e prova browser di importo/mese/valuta.
Commit, push e deploy di queste ulteriori modifiche autorizzati dall’utente
il 17 novembre 2026. Nessuna nuova migration richiesta.

## Cronologia spese — modifica locale successiva

Il registro spese mostra soltanto l’ultima registrazione di ciascuna catena di
correzioni. Le versioni sostituite sono escluse prima di ricerca, filtri e
paginazione; restano conservate nel database. Icona orologio sulla riga corrente
per aprire la cronologia e consultare le vecchie versioni in sola lettura, con
importi, cambi applicati, note e motivazione. I link diretti alle vecchie versioni
aprono la cronologia sotto la versione corrente. Gli annullamenti senza
sostituzione restano consultabili nel registro. Nessuna nuova migration.
Typecheck, lint, 36 test unitari e prova browser di correzione/cronologia superati.
Commit, push e deploy della cronologia autorizzati dall’utente il 17 novembre
2026. Nessuna modifica al database richiesta.

## Cronologia in cima ai quattro registri — implementazione locale

Estesa la selezione dell’ultima versione a entrate, impegni e trasferimenti,
oltre alle spese. Un unico comando “Cronologia” sopra i filtri apre il pannello
con tutte le catene corrette della sezione, anche se escluse dai filtri del
registro. Ricerca dedicata su riferimenti e descrizioni delle versioni storiche.
Rimosse le icone cronologia dalle righe. Dettagli precedenti in sola lettura;
link storici compatibili; annullamenti senza sostituzione ancora consultabili.
Nessuna migration o variazione alle regole di correzione degli impegni pagati.
Typecheck, lint, 36 test unitari e cinque prove browser superati, inclusi tutti
i quattro registri. Commit, push e deploy autorizzati dall’utente il 17 novembre
2026; nessuna migration richiesta.
