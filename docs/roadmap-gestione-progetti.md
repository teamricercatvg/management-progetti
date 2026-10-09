# Piano di lavoro - Gestione Progetti

## 1. Premessa e metodo di lavoro

Questo documento definisce la roadmap iniziale per una nuova applicazione web di gestione progetti per il settore non profit. La finalita' di questa fase e' pianificare il lavoro, ordinare i requisiti emersi dalla descrizione iniziale e identificare le decisioni che dovranno essere prese prima di scrivere codice applicativo.

In questa fase non vengono creati componenti React, pagine, migration Supabase definitive, dati di esempio, configurazioni di deploy o feature applicative. Il documento serve come guida condivisa per procedere in modo progressivo, una milestone alla volta.

### 1.1 Principi di collaborazione

#### Prima pianificare, poi implementare

Ogni milestone futura dovra' partire da una revisione del piano e da una conferma esplicita dell'obiettivo da realizzare. Le specifiche potranno essere raffinate prima dell'implementazione, soprattutto quando coinvolgono database, ruoli, permessi o dati economici.

#### GitHub come fonte di verita'

Prima di ogni modifica futura sara' necessario:

- verificare lo stato del repository locale;
- controllare il branch attivo;
- sincronizzarsi con GitHub;
- evitare modifiche non richieste;
- lavorare direttamente su `main`, senza creare branch (istruzione dell’utente);
- produrre commit piccoli, leggibili e coerenti.

Repository confermato (account GitHub `teamricercatvg`): `https://github.com/teamricercatvg/management-progetti`.

Se la repository locale non e' ancora inizializzata o collegata a GitHub, la prima milestone dovra' occuparsi di questo aspetto prima di procedere con il codice applicativo.

#### Diff sempre controllabili

Le modifiche future dovranno essere piccole, verificabili e leggibili tramite diff. Si dovranno evitare blocchi opachi di cambiamenti, soprattutto quando includono contemporaneamente schema database, logica applicativa, interfaccia e policy di sicurezza.

#### Verifica del codice scritto

Dopo ogni blocco di sviluppo dovranno essere previsti, in base alla milestone:

- type-check TypeScript;
- lint;
- test automatici quando disponibili;
- build locale;
- verifica delle migration;
- verifica delle policy RLS di Supabase;
- controllo manuale del comportamento dell'interfaccia;
- controllo delle regressioni sulle autorizzazioni.

#### Database con migration tracciate

Ogni modifica allo schema del database dovra' essere realizzata tramite migration Supabase versionate. Non dovranno essere considerate valide modifiche manuali non tracciate nello schema.

Le migration dovranno essere progettate con attenzione a:

- integrita' referenziale;
- foreign key;
- indici;
- vincoli;
- audit fields;
- storico delle modifiche;
- Row Level Security;
- ruoli applicativi;
- separazione tra dati di progetto, dati amministrativi e reportistica.

#### Sicurezza e ruoli fin dall'inizio

L'applicazione gestira' progetti, budget, attivita', report e dati di monitoraggio. La sicurezza non deve essere aggiunta alla fine: deve orientare il modello dati e le API fin dalla progettazione.

Il disegno dovra' coprire:

- autenticazione;
- autorizzazione;
- ruoli globali;
- ruoli per progetto;
- accesso in sola lettura;
- accesso limitato per operatori;
- Row Level Security;
- audit delle modifiche rilevanti.

#### Evitare assunzioni non confermate

La descrizione iniziale deriva da una registrazione vocale e puo' contenere imprecisioni, ripetizioni o termini non definitivi. Questo piano distingue tra:

- requisiti chiari;
- ipotesi di lavoro ragionevoli;
- decisioni ancora da confermare;
- aspetti da chiarire in milestone successive.

#### Documentazione continua

Ogni milestone futura dovra' aggiornare la documentazione tecnica e funzionale rilevante. L'obiettivo e' mantenere il progetto comprensibile anche dopo molte iterazioni, evitando che le decisioni restino solo nella memoria delle conversazioni o nei commit.


### Requisiti aggiornati dopo la revisione della Milestone 2

Le sezioni concettuali e i dettagli delle milestone sotto conservano anche le
ipotesi iniziali e funzionalità future. Per l’MVP prevalgono il
[modello dati versione 2](data-model.md) e la [matrice permessi](permissions.md):

- piattaforma unica con enti diversi e partenariati per progetto;
- solo Admin e Manager; operatori/viewer e assegnazioni per attività rinviati;
- dati registrati da Admin/Manager automaticamente validati, senza secondo validatore;
- pubblicazione dei piani consentita anche al Manager assegnato;
- valuta principale e conversione delle spese estere tramite cambio medio mensile.

Le milestone 5, 7, 10 e 14 saranno eseguite inizialmente con i soli ruoli MVP;
le funzioni operative dei ruoli futuri richiederanno una successiva specifica.
Le milestone 12–13 comprendono il modello dei cambi mensili; l’importazione
automatica da fonte ufficiale e la frequenza giornaliera restano evoluzioni.

## 2. Obiettivo dell'applicazione

L'applicazione dovra' supportare la gestione integrata di progetti non profit, con attenzione a pianificazione, monitoraggio, rendicontazione e controllo economico.

Le tre aree principali sono:

1. quadro logico del progetto;
2. cronogramma delle attivita';
3. budget e monitoraggio economico.

A queste si aggiungono aree trasversali:

- utenti, ruoli e permessi;
- indicatori e avanzamento;
- rapporti narrativi e quantitativi;
- dashboard di monitoraggio;
- storico delle revisioni;
- audit delle modifiche rilevanti.

L'applicazione dovra' permettere a un'organizzazione non profit di definire un progetto, collegare obiettivi, risultati, attivita', indicatori, budget e report, e monitorare nel tempo l'avanzamento rispetto al piano iniziale e alle revisioni successive.

## 3. Stack tecnico e vincoli

### 3.1 Stack richiesto

- Next.js 16;
- App Router;
- React 19;
- TypeScript;
- Tailwind CSS 4;
- Supabase;
- database Supabase self-hosted sul server Netcup gia' utilizzato da `cdp-software`, con istanza dedicata a questo progetto da installare tramite Coolify;
- hosting dell'applicazione Next.js su Vercel, con account `teamricercatvg@gmail.com`.

Servizi e account confermati:

- repository GitHub: `https://github.com/teamricercatvg/management-progetti`;
- account GitHub: `teamricercatvg`;
- account Vercel: `teamricercatvg@gmail.com`;
- dominio acquistato: `ariadne-hub.it`, con indirizzo pubblico previsto dell'applicazione `https://www.ariadne-hub.it`; collegamento a Vercel, DNS e HTTPS da configurare;
- server database: Netcup, lo stesso utilizzato dal progetto `/Users/stefanolaptop/Documents/codex_new/cdp-software`;
- gestione backend: Supabase self-hosted tramite Coolify e Docker Compose;
- nuova istanza Supabase e relativo dominio: da predisporre per `management-progetti`.

Riferimento operativo: leggere `AGENTS.md` e `INFRASTRUCTURE.md` di `cdp-software` durante il setup. La documentazione attuale identifica il server con alias SSH `cdp-netcup` e il pannello Coolify con `https://coolify.salutepediatricaglobale.it`; questi riferimenti dovranno essere verificati prima dell'installazione. Il dominio Supabase di CDP appartiene al progetto CDP e non e' l'endpoint di questo nuovo progetto.

L'architettura concordata prevede frontend su Vercel e backend su Netcup/Coolify. L'istanza Supabase dedicata dovra' avere database, volumi, credenziali e configurazione propri, preservando i servizi gia' presenti sul server. L'installazione e' un'attivita' pianificata, non ancora eseguita in questa fase documentale.

### 3.2 Vincoli di questa fase

In questa fase e' consentito solo creare questo documento di piano. Non devono essere eseguite le seguenti attivita':

- scrittura di codice applicativo;
- creazione di componenti React;
- creazione di pagine;
- creazione di migration definitive;
- modifica dello schema del database;
- configurazione di Supabase;
- installazione di pacchetti;
- deploy;
- creazione di dati di esempio;
- commit automatici.

### 3.3 File iniziali da prevedere nelle milestone successive

Se la repository resta vuota, nelle milestone successive sara' opportuno introdurre almeno:

| File o area | Scopo |
| --- | --- |
| `README.md` | Descrizione del progetto, setup locale, comandi principali |
| `AGENTS.md` | Istruzioni operative per Codex e collaboratori |
| `.gitignore` | Esclusione di dipendenze, build output, file locali e segreti |
| `.env.example` | Elenco delle variabili d'ambiente senza valori sensibili |
| `.vercelignore` | Esclusione di `.env` e `.env.*` dai deploy locali |
| `package.json` | Script e dipendenze del progetto |
| `src/` o struttura equivalente | Codice applicativo Next.js |
| `supabase/` | Configurazione locale e migration versionate |
| `docs/` | Documentazione funzionale e tecnica |

### 3.4 Gestione credenziali e servizi esterni

Credenziali, token, API key, URL segreti, password e chiavi di servizio non devono essere inventati o inseriti nel repository.

Prima di accedere a Supabase, Coolify o Vercel nelle fasi future, sara' necessario verificare:

- quali credenziali sono gia' disponibili nel progetto;
- quali variabili sono richieste;
- che GitHub usi `teamricercatvg` e Vercel usi `teamricercatvg@gmail.com`;
- quale scope Vercel appartenga all'account dedicato: `cdp-software` documenta `tor-vergata-igiene`, da verificare durante il setup;
- se esistono progetti analoghi da cui recuperare configurazioni gia' funzionanti.

## 4. Requisiti funzionali principali

### 4.1 Progetti

Ogni progetto rappresenta il contenitore principale dei dati.

Informazioni probabilmente necessarie:

- titolo;
- codice o identificativo interno;
- descrizione;
- stato;
- data di inizio;
- data di fine;
- ente o area responsabile;
- eventuale donor/finanziatore;
- valuta principale;
- note;
- audit fields.

Ipotesi di lavoro: un progetto potra' avere piu' utenti assegnati con ruoli diversi.

### 4.2 Quadro logico

Il quadro logico dovra' rappresentare:

- obiettivi generali;
- obiettivi specifici;
- risultati attesi;
- attivita' collegate ai risultati;
- indicatori collegati a obiettivi o risultati.

Struttura concettuale:

```text
Progetto
|-- Obiettivi generali
|   |-- Indicatori
|-- Obiettivi specifici
|   |-- Indicatori
|-- Risultati attesi
|   |-- Indicatori
|   |-- Attivita'
```

Il quadro logico dovra' supportare ordinamento, descrizioni, collegamenti gerarchici e modifiche nel tempo.

### 4.3 Indicatori

Ogni indicatore dovra' descrivere cosa viene misurato, come viene verificato e come viene aggiornato nel tempo.

Campi minimi:

- titolo;
- descrizione;
- fonte di verifica;
- tipo di indicatore;
- valore target;
- valore baseline;
- unita' di misura;
- collegamento all'elemento del quadro logico;
- metodo di aggregazione;
- stato o validita';
- audit fields.

Tipi iniziali previsti:

| Tipo | Descrizione | Esempio |
| --- | --- | --- |
| Numerico assoluto | Misura un valore singolo aggregabile | Numero di persone formate |
| Rapporto | Misura un rapporto tra numeratore e denominatore | Percentuale di persone raggiunte rispetto alla popolazione target |

Il sistema dovra' distinguere tra:

- definizione dell'indicatore;
- baseline;
- target;
- rilevazioni periodiche;
- contributi da rapporti o attivita';
- avanzamento calcolato.

### 4.4 Attivita'

Le attivita' sono collegate ai risultati attesi e alimentano cronogramma, rapporti e monitoraggio.

Campi minimi:

- progetto;
- risultato collegato;
- titolo;
- descrizione;
- stato;
- priorita' o ordine;
- utenti/operatori coinvolti;
- note;
- audit fields.

Le attivita' ufficiali del quadro logico dovrebbero restare distinguibili da eventuali sotto-attivita' operative usate per pianificare o rendicontare il lavoro quotidiano.

### 4.5 Cronogramma

Il cronogramma si basa sulle attivita'. Per ogni attivita' dovra' essere possibile definire uno o piu' periodi pianificati.

Ogni periodo dovra' includere:

- attivita' collegata;
- data di inizio;
- data di fine;
- descrizione;
- stato;
- nota;
- versione o revisione di riferimento.

Il sistema dovra' permettere di confrontare:

- piano iniziale;
- piano corrente;
- revisioni;
- ritardi;
- anticipi;
- motivazioni delle modifiche.

### 4.6 Budget

Il budget sara' organizzato per natura di spesa. Ogni riga rappresentera' una voce o tipologia di spesa.

Campi minimi:

- progetto;
- categoria o natura di spesa;
- descrizione;
- importo previsto;
- importo impegnato;
- importo speso;
- importo residuo calcolabile;
- valuta;
- note;
- audit fields.

Il budget dovra' distinguere:

- budget iniziale;
- revisioni di budget;
- impegni o contratti;
- pagamenti o spese effettive;
- allocazioni a risultati;
- scostamenti.

Una riga di budget potra' essere collegata a uno o piu' risultati tramite importi o percentuali. Questo collegamento dovra' essere opzionale.

### 4.7 Rapporti operativi e avanzamento

Gli operatori dovranno poter inserire rapporti collegati alle attivita' a cui partecipano.

Tipologie iniziali:

| Tipo | Contenuto | Collegamenti |
| --- | --- | --- |
| Rapporto narrativo | Testo o documento che descrive cosa e' stato fatto | Attivita', risultati, progetto |
| Rapporto quantitativo | Dati che contribuiscono agli indicatori | Indicatori, attivita', rilevazioni |

I rapporti potranno richiedere validazione da parte di manager o amministratori prima di contribuire ai dati ufficiali di avanzamento.

### 4.8 Dashboard e monitoraggio

La dashboard dovra' sintetizzare:

- avanzamento delle attivita';
- stato del cronogramma;
- indicatori rispetto a baseline e target;
- budget previsto, impegnato, speso e residuo;
- report recenti;
- elementi da validare;
- scostamenti o rischi.

La dashboard dovra' rispettare i permessi: un amministratore potra' vedere viste aggregate, un manager i progetti assegnati, un operatore solo le attivita' e i report di sua competenza.

## 5. Modello concettuale dei dati

Questa sezione non e' una migration definitiva. Descrive il modello logico consigliato e le alternative da confermare prima dell'implementazione.

### 5.1 Entita' principali

| Area | Entita' probabili | Note |
| --- | --- | --- |
| Anagrafica progetto | `projects` | Contenitore principale |
| Utenti e permessi | `profiles`, `project_memberships`, `roles` | Collegamento con Supabase Auth |
| Quadro logico | `logical_framework_items` o tabelle dedicate | Da decidere |
| Attivita' | `activities`, `activity_assignments` | Attivita' ufficiali e operatori coinvolti |
| Indicatori | `indicators`, `indicator_measurements`, `indicator_contributions` | Definizione e rilevazioni separate |
| Cronogramma | `activity_schedule_periods`, `schedule_revisions` | Versionamento da progettare |
| Budget | `budget_lines`, `budget_categories`, `budget_revisions`, `commitments`, `expenses` | Separare piano, impegni e consuntivo |
| Allocazioni | `budget_line_result_allocations` | Collegamenti opzionali a risultati |
| Rapporti | `reports`, `report_activities`, `report_indicator_values` | Narrativi e quantitativi |
| Audit | `audit_log` o tabelle storiche specifiche | Da valutare |

### 5.2 Quadro logico: opzioni di modellazione

#### Opzione A: tabelle separate

Tabelle possibili:

- `general_objectives`;
- `specific_objectives`;
- `expected_results`;
- `activities`.

Vantaggi:

- struttura esplicita;
- vincoli piu' semplici da leggere;
- query intuitive per ogni livello;
- campi specifici per ciascun tipo.

Svantaggi:

- duplicazione di campi comuni;
- indicatori collegati a piu' tipi richiedono associazioni multiple o relazioni polimorfiche;
- modifiche future alla struttura del quadro logico possono essere piu' costose.

#### Opzione B: tabella unica per elementi del quadro logico

Tabella possibile: `logical_framework_items`.

Campi chiave:

- `id`;
- `project_id`;
- `parent_id`;
- `type`;
- `title`;
- `description`;
- `sort_order`;
- `status`;
- audit fields.

Valori possibili di `type`:

- `general_objective`;
- `specific_objective`;
- `expected_result`.

Le attivita' resterebbero preferibilmente in una tabella separata `activities`, perche' hanno una vita operativa autonoma: assegnazioni, cronogramma, report, avanzamento.

Vantaggi:

- modello piu' flessibile;
- gerarchia uniforme;
- indicatori collegabili a una sola tabella;
- minore duplicazione;
- piu' semplice introdurre variazioni future del quadro logico.

Svantaggi:

- richiede vincoli piu' accurati sul tipo e sulla gerarchia;
- alcune query possono essere meno immediate;
- serve disciplina applicativa per evitare strutture incoerenti.

#### Opzione C: soluzione ibrida consigliata

La soluzione consigliata e':

- usare `logical_framework_items` per obiettivi generali, obiettivi specifici e risultati attesi;
- usare `activities` come tabella separata collegata ai risultati;
- collegare gli indicatori a `logical_framework_items`;
- usare vincoli e controlli per garantire gerarchie ammesse.

Motivazione: gli obiettivi e i risultati condividono una natura concettuale simile, mentre le attivita' hanno relazioni operative piu' ricche con cronogramma, utenti, rapporti e monitoraggio.

Decisione da confermare: se il team preferisce massima leggibilita' iniziale, le tabelle separate possono essere accettabili. Se si prevede evoluzione della metodologia di quadro logico, la soluzione ibrida e' piu' robusta.

### 5.3 Indicatori e rilevazioni

Il modello dovrebbe distinguere almeno quattro livelli:

| Livello | Entita' | Scopo |
| --- | --- | --- |
| Definizione | `indicators` | Descrive cosa misurare |
| Baseline e target | campi su `indicators` o tabella dedicata | Definisce punto di partenza e obiettivo |
| Rilevazioni | `indicator_measurements` | Registra valori nel tempo |
| Contributi da report | `report_indicator_values` o `indicator_contributions` | Collega rapporti e avanzamento |

Per indicatori rapporto, il dato dovrebbe conservare numeratore e denominatore, non solo la percentuale calcolata. La percentuale dovrebbe essere derivata.

Ipotesi di campi per `indicator_measurements`:

- `indicator_id`;
- `period_start`;
- `period_end`;
- `value`;
- `numerator`;
- `denominator`;
- `source_report_id`;
- `status`;
- `validated_by`;
- `validated_at`;
- audit fields.

### 5.4 Cronogramma e revisioni

La soluzione consigliata e' separare:

- periodi pianificati;
- revisioni;
- storico/audit.

Entita' probabili:

- `schedule_revisions`;
- `activity_schedule_periods`;
- `activity_schedule_period_history` oppure audit generico.

Approccio consigliato:

- ogni progetto ha una revisione iniziale del cronogramma;
- le modifiche rilevanti creano una nuova revisione;
- i periodi correnti appartengono alla revisione attiva;
- il confronto con la revisione iniziale viene calcolato tramite query o viste;
- ogni revisione contiene motivazione, autore, data e stato.

Alternativa: usare campi di validita' temporale su ogni periodo (`valid_from`, `valid_to`). Questa soluzione e' potente ma piu' complessa da usare nelle prime milestone.

Raccomandazione: partire con `schedule_revisions` e periodi collegati a revisione, valutando viste di confronto tra piano iniziale e piano corrente.

### 5.5 Budget e revisioni

Il budget non dovrebbe essere modellato come un singolo importo modificabile. Servono livelli separati:

| Livello | Scopo |
| --- | --- |
| `budget_categories` | Classificazione per natura di spesa |
| `budget_revisions` | Versioni del budget approvate o in bozza |
| `budget_lines` | Righe di budget previste in una revisione |
| `budget_line_result_allocations` | Ripartizione opzionale su risultati |
| `commitments` | Impegni economici, contratti, ordini |
| `expenses` | Spese effettive o pagamenti |

Gli importi `impegnato`, `speso`, `residuo` e `scostamento` dovrebbero essere preferibilmente calcolati da impegni e spese, non salvati manualmente come dati indipendenti, salvo esigenze di performance o snapshot contabile.

### 5.6 Audit e storico

Le aree che richiedono storico robusto sono:

- cronogramma ufficiale;
- budget ufficiale;
- modifiche a quadro logico;
- validazione rapporti;
- modifiche ai ruoli;
- modifiche a dati economici.

Si dovra' decidere se usare:

- un audit log generico;
- tabelle storiche dedicate;
- entrambi.

Ipotesi consigliata:

- audit log generico per tracciare chi ha fatto cosa e quando;
- versionamento dedicato per cronogramma e budget, perche' richiedono confronto tra versioni ufficiali.

## 6. Ruoli, permessi e sicurezza

Aggiornamento Milestone 2: MVP soltanto **Admin** e **Manager**. Admin crea utenti
 e progetti, assegna i Manager e legge/scrive in tutti i progetti. Manager legge
 e scrive tutti i dati dei progetti assegnati, pubblica i piani e registra dati
 immediatamente validati. Ruoli Operator/Viewer, assegnazioni per attività e
 validazione dei dati degli operatori sono evoluzioni future da definire.

La [matrice aggiornata](permissions.md) è il riferimento per ogni tabella e per
RLS, audit, API ed esportazioni. Nessun accesso anonimo; nessun accesso del Manager
ai progetti non assegnati. Anagrafiche globali e assegnazioni utenti restano Admin.
Le organizzazioni coinvolte nel progetto non concedono permessi automaticamente.

## 7. Milestone di sviluppo

Le milestone seguenti sono pensate per procedere in modo incrementale. Ogni milestone dovra' essere approvata o confermata prima dell'implementazione.

### Milestone 1 - Setup repository e documentazione iniziale

Stato al 7 ottobre 2026: pubblicata su main, commit `d1d6af5`.
Dettagli: [consegna Milestone 1](milestone-1.md).

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Inizializzare correttamente la base del progetto e la documentazione minima |
| Output atteso | Repository collegata, documentazione iniziale, regole operative condivise |
| Attivita' principali | Verificare accesso a `teamricercatvg/management-progetti` con account `teamricercatvg`, inizializzare e collegare il repository locale, creare `README.md`, `AGENTS.md`, `.gitignore`, `.env.example`, `.vercelignore` |
| File o aree coinvolte | Root repository, `docs/`, file di configurazione iniziali |
| Decisioni da prendere | Nome progetto Vercel/Coolify, strategia branch, convenzioni commit |
| Verifiche | `git status`, remote GitHub, assenza di segreti, coerenza documentazione |
| Rischi o attenzioni | Non committare `.env`, non introdurre scaffold non approvato |
| Criteri di completamento | Repository pronta, documentazione minima leggibile, nessun segreto tracciato |

### Milestone 1A - Infrastruttura Netcup, Coolify, Supabase e Vercel

Stato al 7 ottobre 2026: backend e Vercel predisposti e verificati;
DNS Aruba salvati; chiusura in attesa di propagazione e HTTPS. Vedere la
[consegna 1A](milestone-1a.md) e la [guida infrastrutturale](infrastructure.md).

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Predisporre il backend dedicato sul server Netcup di CDP e il progetto frontend su Vercel |
| Output atteso | Istanza Supabase dedicata installata tramite Coolify e progetto Vercel associato al repository corretto |
| Attivita' principali | Verificare accessi e capacita' del server, creare stack Supabase separato, configurare dominio e HTTPS, accesso database tramite SSH, backup e variabili Vercel; predisporre il collegamento GitHub/Vercel e associare `www.ariadne-hub.it`, configurando DNS, HTTPS e reindirizzamento da `ariadne-hub.it` a `www.ariadne-hub.it` |
| File o aree coinvolte | `docs/infrastructure.md`, `.env.example`, `.vercelignore`, eventuali wrapper CLI dedicati |
| Decisioni da prendere | Nome del progetto Vercel e dello stack Coolify, sottodominio Supabase, staging, retention e destinazione dei backup |
| Verifiche | Identita' GitHub `teamricercatvg`, account Vercel `teamricercatvg@gmail.com` e relativo scope, salute API Supabase, query database, isolamento da CDP, HTTPS su `www.ariadne-hub.it`, reindirizzamento dal dominio senza `www` e prova di ripristino isolata |
| Rischi o attenzioni | Riutilizzare per errore database, volumi o segreti di CDP; alterare servizi esistenti; usare scope personali; esporre porte database o service role |
| Criteri di completamento | Backend dedicato raggiungibile in sicurezza, backup verificato, account e configurazioni documentati senza segreti; prerequisito per applicare migration remote |

### Milestone 1B - Casella email del sito e Google Workspace

**Completata il 7 ottobre 2026**: casella `admin@ariadne-hub.it` operativa,
SMTP Supabase Auth collaudato con magic link ricevuto, DKIM Google attivo e
SPF/DKIM/DMARC PASS su mail esterna. Evidenze e limiti in [email.md](email.md).
Notifiche applicative rinviate su richiesta; flussi di accesso nella Milestone 4.

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Creare la casella email dedicata a tutti i servizi del sito sul dominio `ariadne-hub.it` e collegarla a un account Google Workspace |
| Output atteso | Casella Google Workspace operativa, identita' email del sito definita e invio delle email di autenticazione Supabase configurato |
| Attivita' principali | Individuare o attivare l'account Google Workspace, verificare il dominio, creare la casella, configurare i record di posta MX, SPF, DKIM e DMARC; definire mittente e indirizzo di risposta per i servizi del sito; configurare l'invio SMTP compatibile con Supabase Auth e con le notifiche applicative previste |
| File o aree coinvolte | `docs/email.md`, documentazione infrastruttura, `.env.example` per eventuali nomi di variabili, configurazione Supabase Auth e DNS |
| Decisioni da prendere | Indirizzo della casella, account Workspace nuovo o esistente, piano e licenza, amministratori e recupero accesso, eventuali alias, metodo di invio compatibile e relativi limiti da verificare prima del setup |
| Verifiche | Invio e ricezione della casella, autenticazione del dominio email, consegna a destinatari di test, mittente e risposta corretti, invio dei messaggi Supabase Auth; nella Milestone 4 verificare anche i flussi completi di invito, conferma email e recupero password previsti |
| Rischi o attenzioni | Sovrascrivere record DNS esistenti, esporre credenziali SMTP, lasciare senza recupero l'account amministrativo, superare i limiti di invio del servizio scelto |
| Criteri di completamento | Casella collegata a Google Workspace e verificata in invio/ricezione, canale email Auth collaudato e configurazione documentata senza segreti; completare prima della Milestone 4 |

La casella sara' il riferimento email comune per i servizi del sito, incluse autenticazione utenti, notifiche e comunicazioni di servizio. GitHub e Vercel restano associati agli account gia' concordati; eventuali cambi di titolarita' saranno decisioni separate. Questa milestone riguarda la posta del sito; l'eventuale accesso degli utenti tramite Google sara' valutato nella progettazione dell'autenticazione.

### Milestone 2 - Definizione dettagliata del modello dati

Stato al 7 ottobre 2026: **conclusa; modello dati versione 2 e permessi approvati**.
Consegna versionata su `main`.
Vedere [modello dati](data-model.md), [permessi](permissions.md) e
[consegna](milestone-2.md). MVP solo Admin e Manager, progetti con enti singoli o
partenariati, registrazione dei dati subito validata, cambi medi mensili delle
spese estere. Nessuna migration creata o applicata; Milestone 3 non iniziata.

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Trasformare il modello concettuale in specifica tecnica validata |
| Output atteso | Documento schema logico con entita', relazioni, vincoli e alternative risolte |
| Attivita' principali | Definire tabelle, campi, relazioni, enum, vincoli, indici, audit fields |
| File o aree coinvolte | `docs/data-model.md`, eventuali diagrammi ER |
| Decisioni da prendere | Quadro logico ibrido o tabelle separate, audit generico o storico dedicato, struttura budget |
| Verifiche | Revisione umana, controllo coerenza relazioni, controllo permessi per tabella |
| Rischi o attenzioni | Disegnare uno schema troppo rigido o troppo generico |
| Criteri di completamento | Modello dati approvato prima di qualsiasi migration |

### Milestone 3 - Schema Supabase e migration iniziali

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Creare le prime migration versionate per lo schema base |
| Output atteso | Migration Supabase locali per tabelle fondative |
| Attivita' principali | Configurare Supabase CLI, generare migration, creare tabelle base, vincoli e indici |
| File o aree coinvolte | `supabase/`, `supabase/migrations/` |
| Decisioni da prendere | Naming migration, gestione enum, uso di funzioni SQL helper |
| Verifiche | Applicazione migration in ambiente locale o controllato, diff schema, rollback ragionato |
| Rischi o attenzioni | Applicare migration su database sbagliato, usare credenziali mancanti, introdurre schema non revisionato |
| Criteri di completamento | Migration versionate, applicabili e coerenti con il modello approvato |

### Milestone 4 - Autenticazione e profili utente

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Collegare Supabase Auth ai profili applicativi, usando il canale email predisposto nella Milestone 1B |
| Output atteso | Struttura utenti/profili e base per ruoli globali |
| Attivita' principali | Definire `profiles`, collegamento a `auth.users`, flusso creazione profilo, gestione admin iniziale |
| File o aree coinvolte | Supabase migration, client/server auth, documentazione sicurezza |
| Decisioni da prendere | Metodo di invito utenti, gestione primo admin, campi profilo |
| Verifiche | Login/logout, creazione profilo, nessuna esposizione indebita dati |
| Rischi o attenzioni | Dipendere da dati utente non presenti, creare policy permissive |
| Criteri di completamento | Utente autenticato collegato a profilo applicativo |

### Milestone 5 - Ruoli, membership e Row Level Security

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Implementare autorizzazione robusta per progetto e attivita' |
| Output atteso | Tabelle ruoli/membership e policy RLS iniziali |
| Attivita' principali | Creare `project_memberships`, `activity_assignments`, funzioni helper, policy per lettura/scrittura |
| File o aree coinvolte | Migration, policy SQL, test policy |
| Decisioni da prendere | Permessi esatti del manager, visibilita' budget per viewer, limiti operatore |
| Verifiche | Test con utenti di ruolo diverso, query autorizzate e negate |
| Rischi o attenzioni | Policy troppo ampie o troppo complesse da mantenere |
| Criteri di completamento | Accesso coerente con matrice permessi approvata |

### Milestone 6 - Layout base e navigazione

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Creare la shell applicativa senza funzionalita' avanzate |
| Output atteso | Layout autenticato, navigazione coerente, stati base |
| Attivita' principali | Setup Next.js, App Router, Tailwind, layout, menu, pagine placeholder approvate |
| File o aree coinvolte | `src/app/`, componenti layout, configurazione Tailwind |
| Decisioni da prendere | Struttura navigazione, design system minimo, lingua interfaccia |
| Verifiche | Build, lint, controllo responsive, accesso condizionato per ruolo |
| Rischi o attenzioni | Costruire UI troppo ricca prima del modello dati |
| Criteri di completamento | Base navigabile e coerente con ruoli iniziali |

### Milestone 7 - Gestione progetti

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Implementare CRUD essenziale dei progetti |
| Output atteso | Elenco, dettaglio, creazione e modifica progetto secondo permessi |
| Attivita' principali | Form progetto, lista progetti filtrata, dettaglio progetto, validazione campi |
| File o aree coinvolte | Tabelle `projects`, route progetto, componenti form/lista |
| Decisioni da prendere | Campi obbligatori, stati progetto, visibilita' per ruolo |
| Verifiche | RLS, validazione input, accesso admin/manager/viewer/operator |
| Rischi o attenzioni | Esporre progetti non assegnati a utenti non autorizzati |
| Criteri di completamento | Progetti gestibili in sicurezza dai ruoli autorizzati |

### Milestone 8 - Quadro logico

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Gestire obiettivi, risultati e struttura logica del progetto |
| Output atteso | Interfaccia e dati per quadro logico gerarchico |
| Attivita' principali | CRUD elementi quadro logico, ordinamento, collegamenti gerarchici |
| File o aree coinvolte | `logical_framework_items`, route progetto/quadro-logico |
| Decisioni da prendere | Vincoli gerarchici finali, gestione revisioni quadro logico |
| Verifiche | Coerenza gerarchia, permessi, salvataggio ordinamento |
| Rischi o attenzioni | Consentire strutture incoerenti o difficili da interrogare |
| Criteri di completamento | Quadro logico leggibile e modificabile dai ruoli autorizzati |

### Milestone 9 - Indicatori

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Definire indicatori collegati al quadro logico |
| Output atteso | Gestione indicatori assoluti e rapporto |
| Attivita' principali | CRUD indicatori, campi baseline/target, tipo indicatore, fonte verifica |
| File o aree coinvolte | `indicators`, viste indicatori, form validati |
| Decisioni da prendere | Tipi indicatore iniziali, metodi aggregazione, unita' misura |
| Verifiche | Validazione numeratore/denominatore, collegamenti a elementi ammessi |
| Rischi o attenzioni | Salvare percentuali senza dati grezzi, ambiguita' su aggregazione |
| Criteri di completamento | Indicatori definibili e collegati correttamente |

### Milestone 10 - Attivita' e assegnazioni operative

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Gestire attivita' collegate ai risultati e operatori assegnati |
| Output atteso | CRUD attivita', assegnazioni utenti, visibilita' operatori |
| Attivita' principali | Creare attivita', collegare risultati, assegnare operatori, definire stati |
| File o aree coinvolte | `activities`, `activity_assignments`, UI attivita' |
| Decisioni da prendere | Differenza tra attivita' ufficiale e sotto-attivita', stati ammessi |
| Verifiche | Operatore vede solo attivita' assegnate, manager vede progetto assegnato |
| Rischi o attenzioni | Mischiare attivita' logiche e task operativi senza distinzione |
| Criteri di completamento | Attivita' gestibili e assegnabili con permessi corretti |

### Milestone 11 - Cronogramma

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Pianificare periodi attivita' e gestire revisioni |
| Output atteso | Cronogramma iniziale, revisione corrente, confronto base |
| Attivita' principali | Periodi attivita', revisioni, motivazioni modifica, vista calendario/Gantt semplificata |
| File o aree coinvolte | `schedule_revisions`, `activity_schedule_periods`, UI cronogramma |
| Decisioni da prendere | UX per revisioni, cosa richiede motivazione, approvazione revisioni |
| Verifiche | Confronto piano iniziale/corrente, audit, permessi modifica |
| Rischi o attenzioni | Perdere lo storico del piano originale |
| Criteri di completamento | Cronogramma modificabile senza perdere tracciabilita' |

### Milestone 12 - Budget

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Gestire budget per natura di spesa e monitoraggio economico |
| Output atteso | Righe budget, categorie, allocazioni a risultati, calcoli base |
| Attivita' principali | CRUD budget, revisioni, allocazioni, calcoli previsto/impegnato/speso/residuo |
| File o aree coinvolte | `budget_categories`, `budget_revisions`, `budget_lines`, `budget_line_result_allocations` |
| Decisioni da prendere | Valute, arrotondamenti, visibilita' budget, percentuali vs importi |
| Verifiche | Totali coerenti, RLS restrittiva, vincoli su allocazioni |
| Rischi o attenzioni | Salvare dati derivati incoerenti, esporre dati economici a ruoli non autorizzati |
| Criteri di completamento | Budget leggibile, calcolabile e protetto |

### Milestone 13 - Impegni, spese e consuntivo

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Distinguere impegni economici e spese effettive |
| Output atteso | Monitoraggio impegnato/speso/residuo per riga budget |
| Attivita' principali | Gestire commitment, expenses, stati, allegati futuri, collegamenti a budget |
| File o aree coinvolte | `commitments`, `expenses`, viste riepilogo budget |
| Decisioni da prendere | Workflow approvazione spese, documenti allegati, date contabili |
| Verifiche | Totali, scostamenti, residui, permessi |
| Rischi o attenzioni | Confondere contratti/impegni con pagamenti effettivi |
| Criteri di completamento | Situazione economica calcolabile da dati sorgente |

### Milestone 14 - Rapporti operativi

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Permettere agli operatori di inserire report narrativi e quantitativi |
| Output atteso | Rapporti collegati ad attivita' e indicatori |
| Attivita' principali | Form rapporto, collegamento attivita', valori indicatori, stato validazione |
| File o aree coinvolte | `reports`, `report_activities`, `report_indicator_values` |
| Decisioni da prendere | Workflow bozza/inviato/validato/rifiutato, allegati, notifiche |
| Verifiche | Operatore crea solo report consentiti, manager valida, indicatori aggiornati correttamente |
| Rischi o attenzioni | Far contribuire dati non validati agli indicatori ufficiali |
| Criteri di completamento | Report inseribili e validabili con impatto controllato sugli indicatori |

### Milestone 15 - Dashboard di monitoraggio

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Offrire viste sintetiche su progetto, avanzamento, budget e rischi |
| Output atteso | Dashboard per ruoli con indicatori chiave e alert |
| Attivita' principali | Definire metriche, query aggregate, viste per ruolo, stati attenzione |
| File o aree coinvolte | Dashboard UI, viste SQL o query server, componenti riepilogo |
| Decisioni da prendere | KPI principali, soglie alert, filtri temporali |
| Verifiche | Performance query, coerenza dati, rispetto permessi |
| Rischi o attenzioni | Aggregare dati che l'utente non dovrebbe vedere |
| Criteri di completamento | Dashboard utile e coerente con autorizzazioni |

### Milestone 16 - Test, audit, hardening e deploy

| Aspetto | Dettaglio |
| --- | --- |
| Obiettivo | Stabilizzare l'applicazione prima dell'uso operativo |
| Output atteso | Build stabile, test rilevanti, policy verificate, deploy controllato |
| Attivita' principali | Test RLS, test flussi, build, verifica env vars, audit sicurezza, deploy |
| File o aree coinvolte | Test, configurazioni deploy, documentazione operativa |
| Decisioni da prendere | Ambiente staging, backup database, strategia release |
| Verifiche | Build, lint, type-check, test, verifica bundle/env, controllo manuale |
| Rischi o attenzioni | Deploy con variabili errate, policy incomplete, dati sensibili esposti |
| Criteri di completamento | Applicazione pronta per uso pilota o staging validato |

## 8. Verifiche tecniche previste

### 8.1 Verifiche repository

- `git status`;
- branch attivo;
- remote GitHub;
- presenza di file non tracciati;
- assenza di segreti;
- diff leggibile prima di ogni commit.

### 8.2 Verifiche applicative

- type-check TypeScript;
- lint;
- build locale;
- test unitari dove opportuno;
- test di integrazione per flussi critici;
- controllo manuale UI;
- verifica responsive.

### 8.3 Verifiche database

- migration applicabili da zero;
- vincoli e foreign key corretti;
- indici sulle relazioni principali;
- policy RLS abilitate sulle tabelle sensibili;
- test di accesso con ruoli diversi;
- verifica di funzioni helper usate dalle policy;
- verifica che valori derivati siano calcolati in modo coerente.

### 8.4 Verifiche sicurezza

- nessun dato di progetto accessibile senza autenticazione;
- operatori limitati alle attivita' assegnate;
- viewer senza permessi di scrittura;
- budget accessibile solo a ruoli autorizzati;
- report validati prima di incidere su metriche ufficiali, se questa regola viene confermata;
- audit per modifiche rilevanti.

### 8.5 Verifiche deploy e ambiente

Prima di deploy futuri sara' necessario:

- verificare account Vercel `teamricercatvg@gmail.com` e scope dedicato, senza ereditare scope personali da esempi generici;
- verificare variabili d'ambiente;
- non stampare segreti in output;
- usare `.vercelignore` per escludere `.env` e `.env.*`;
- verificare la connessione con l'istanza Supabase dedicata su Netcup/Coolify;
- verificare DNS, HTTPS e apertura dell'app su `www.ariadne-hub.it`, incluso il reindirizzamento da `ariadne-hub.it`;
- verificare che il bundle non contenga host o chiavi pubbliche obsolete.

## 9. Questioni aperte da chiarire

### 9.1 Prodotto e processo

- Qual e' il primo caso d'uso reale da supportare: un singolo progetto pilota o piu' progetti?
- L'applicazione sara' usata internamente da una sola organizzazione o da piu' enti?
- Serve multi-tenant vero o basta la separazione per progetto?
- Quali lingue dovra' supportare l'interfaccia?
- Esistono modelli di quadro logico o report gia' usati dall'organizzazione?

### 9.2 Quadro logico

- Confermare la soluzione ibrida con `logical_framework_items` per obiettivi/risultati e `activities` separata.
- Stabilire se gli obiettivi specifici possono dipendere da piu' obiettivi generali.
- Stabilire se i risultati possono dipendere da piu' obiettivi specifici.
- Decidere se modifiche al quadro logico richiedono revisioni ufficiali o solo audit.

### 9.3 Indicatori

- Quali tipi di indicatori oltre a numerico assoluto e rapporto saranno necessari?
- Come aggregare rilevazioni multiple sullo stesso periodo: somma, ultimo valore, media, valore validato?
- I target possono variare nel tempo?
- Le rilevazioni devono essere sempre validate?
- Gli indicatori possono essere collegati anche alle attivita' o solo a obiettivi/risultati?

### 9.4 Attivita' e cronogramma

- Le sotto-attivita' sono elementi ufficiali o strumenti operativi liberi?
- Chi puo' modificare il cronogramma ufficiale?
- Ogni modifica del cronogramma richiede approvazione?
- Quale livello di dettaglio serve per la visualizzazione: lista, calendario, Gantt?
- Come gestire attivita' ricorrenti o periodi multipli?

### 9.5 Budget

- Quali categorie di spesa iniziali sono previste?
- Serve gestione multi-valuta?
- Gli importi devono includere IVA/tasse o distinguerle?
- Chi puo' vedere il budget?
- Chi puo' modificare il budget?
- Le revisioni budget devono essere approvate?
- Gli impegni economici richiedono allegati/documenti?
- Le allocazioni a risultati devono usare importi, percentuali o entrambi?

### 9.6 Rapporti

- Quale workflow deve avere un rapporto: bozza, inviato, validato, rifiutato?
- I report possono essere modificati dopo validazione?
- Servono allegati?
- I dati quantitativi dei report aggiornano subito gli indicatori o solo dopo validazione?
- Un rapporto puo' coprire piu' attivita' e piu' periodi?

### 9.7 Ruoli e sicurezza

- Il manager puo' creare progetti o solo gestire progetti assegnati?
- Il manager puo' modificare il budget?
- Il viewer puo' vedere dati economici?
- L'operatore puo' vedere il contesto completo del risultato collegato alla sua attivita'?
- Serve un ruolo contabile/amministrativo separato?
- Serve un ruolo donor/finanziatore con accesso limitato?

### 9.8 Infrastruttura

- Quali credenziali saranno disponibili per Supabase CLI?
- Quali dominio e configurazione di accesso SSH usare per la nuova istanza Supabase su Netcup/Coolify?
- Esiste gia' un ambiente staging?
- Quale nome assegnare al progetto Vercel dell'account `teamricercatvg@gmail.com`, cui associare il dominio gia' acquistato `www.ariadne-hub.it`?
- Quale strategia di backup database e' prevista?
- Quale indirizzo `@ariadne-hub.it` creare per i servizi del sito e a quale account Google Workspace associarlo?
- Quali piano Workspace, amministratori e metodo di invio email adottare nella Milestone 1B?

## 10. Proposta di ordine di lavoro

Ordine consigliato:

1. confermare questo piano e aggiornare le questioni aperte piu' critiche;
2. inizializzare e collegare il repository `teamricercatvg/management-progetti`, creare la documentazione minima e completare la Milestone 1A con Supabase dedicato su Netcup/Coolify e progetto Vercel;
3. definire in dettaglio il modello dati;
4. progettare ruoli e matrice permessi;
5. creare migration Supabase iniziali;
6. completare la Milestone 1B (casella email su Google Workspace e invio email Supabase), poi implementare autenticazione e profili;
7. implementare RLS e test di sicurezza;
8. creare layout base e navigazione;
9. implementare gestione progetti;
10. implementare quadro logico;
11. implementare indicatori;
12. implementare attivita' e assegnazioni;
13. implementare cronogramma e revisioni;
14. implementare budget, impegni e spese;
15. implementare rapporti operativi;
16. implementare dashboard;
17. eseguire hardening, audit, test finali e deploy controllato.

Motivazione dell'ordine:

- prima si stabiliscono repository, documentazione e modello dati;
- prima dell'autenticazione si predispone la casella Google Workspace e si verifica il canale email;
- poi si mette in sicurezza il sistema con autenticazione, ruoli e RLS;
- solo dopo si costruiscono le funzionalita' applicative;
- budget, report e dashboard arrivano dopo le strutture fondative da cui dipendono;
- test, audit e deploy chiudono il ciclo quando i flussi principali sono verificabili.

## 11. Decisioni consigliate per la prossima sessione

Prima di scrivere codice applicativo, la prossima sessione dovrebbe concentrarsi su queste decisioni:

1. confermare il modello ibrido del quadro logico;
2. confermare i ruoli iniziali e la matrice permessi;
3. decidere se budget e cronogramma richiedono workflow di approvazione gia' dalla prima versione;
4. definire il nome del progetto Vercel e il sottodominio dell'istanza Supabase dedicata su Netcup/Coolify; pianificare il collegamento del dominio gia' acquistato `www.ariadne-hub.it` a Vercel;
5. stabilire come ottenere in modo sicuro credenziali e configurazioni Supabase;
6. decidere il primo progetto pilota o dataset reale da usare solo dopo la struttura base.

## 12. Stato della repository al momento della pianificazione

Durante questa prima ricognizione non sono stati trovati nel workspace file applicativi o di configurazione iniziale come `AGENTS.md`, `README.md`, `.env.example`, `package.json` o `supabase/config.toml`.

Il workspace locale non risulta ancora inizializzato come repository Git. Questo aspetto dovra' essere verificato e risolto nella Milestone 1, prima di procedere con lo sviluppo applicativo.

### Aggiornamento dopo la Milestone 1 — 7 ottobre 2026

La ricognizione sopra è storica. Git è ora inizializzato sul branch main e
collegato al repository GitHub previsto, verificato vuoto con teamricercatvg.
Sono presenti i file previsti dalla Milestone 1, pubblicati su main nel commit
`d1d6af5`; la consegna della Milestone 1A è sul branch `codex/milestone-1a`.
La Milestone 1A è stata avviata con richiesta esplicita e resta aperta per
propagazione DNS e verifica HTTPS; vedere [consegna 1A](milestone-1a.md).
Lo sviluppo applicativo non è iniziato. Per la fase precedente vedere
[la consegna](milestone-1.md) per convenzioni e decisioni aperte.


### Aggiornamento dopo la Milestone 3 — 7 ottobre 2026

Migration fondative create e testate in un container PostgreSQL 15 isolato:
sette tabelle, chiavi, indici, guardie transazionali e audit. RLS abilitata senza
policy; grants API revocati. Applicazione da zero ripetibile, test di integrità,
accesso negato e concorrenza superati. Applicazione al backend dedicato eseguita
e verificata il 7 ottobre 2026, con backup preventivo e cronologia Supabase
allineata. Consegna su `main`; commit e push autorizzati dall’utente.
Auth e bootstrap restano alla 4, autorizzazioni applicative alla 5.
Vedere [consegna e verifiche](milestone-3.md).


### Aggiornamento Milestone 4 — 9 ottobre 2026

Implementazione locale di Auth, profili e bootstrap iniziale, con scaffold
Next.js e test isolati. Rilascio autorizzato dall’utente il 9 ottobre 2026:
migration applicata, primo Admin predisposto e frontend pubblicato.
Sessione Admin e recupero verificati sul dominio pubblico; collaudo manuale
email/browser dell’utente direttamente in produzione.
Vedere [consegna e checklist localhost](milestone-4.md).
