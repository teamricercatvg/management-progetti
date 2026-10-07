# Permessi e contratto RLS — Milestone 2

Versione 2 del 7 ottobre 2026: recepisce le indicazioni dell’utente nella
[consegna](milestone-2.md). Parte integrante del [modello dati](data-model.md).
Specifica approvata con la chiusura della Milestone 2; nessuna policy SQL ancora implementata.

## Ruoli MVP

Solo **Admin** e **Manager**. Admin legge e scrive in tutti i progetti, crea
progetti e crea/invita utenti. Manager legge e scrive i dati di tutti e soli i
progetti assegnati. Solo Admin assegna/revoca Manager e gestisce ruoli globali.
Organizzazioni e partenariati non concedono accessi automaticamente.

Nessun accesso anonimo. Profilo attivo obbligatorio; Manager richiede membership
attiva, ricontrollata a ogni operazione anche con sessione già aperta. Operator,
viewer, assegnazioni per attività e flag budget sono rinviati, non presenti nell’MVP.

L = lettura; C/M = creazione/modifica; T = transizioni controllate. Scrivere nei
progetti assegnati non permette di sovrascrivere uno snapshot pubblicato o un dato
registrato: Admin e Manager usano entrambi revisioni e rettifiche con audit.
Nessun DELETE fisico dei dati operativi. Rimozioni dei figli di una bozza soltanto
tramite operazione controllata che rispetta vincoli e audit.

## Matrice per tabella

| Tabella | Admin | Manager assegnato |
| --- | --- | --- |
| `profiles` | L/C/M controllati; crea/invita/disabilita tramite Auth | L proprio e nomi dei Manager dei propri progetti; M solo proprio display_name |
| `global_user_roles` | L/T; tutela ultimo Admin attivo | — |
| `organizations` | L/C/M; anagrafica condivisa | L enti dei propri progetti; ricerca minima id/codice/nome per associazione |
| `projects` | L/C/M/T | L/M/T assegnati, anche archiviazione/riapertura; non crea |
| `project_organizations` | L/C/M | L/C/M nei propri progetti, vincoli sole/capofila/partner |
| `project_memberships` | L/C/M/T | L dei propri progetti; nessuna assegnazione/revoca |
| `logical_framework_items` | L/C/M | L/C/M assegnati |
| `activities` | L/C/M | L/C/M assegnati |
| `indicators` | L/C/M | L/C/M assegnati |
| `indicator_measurements` | L/C/M/T; validazione automatica alla registrazione | Come Admin nei progetti assegnati, anche dati propri |
| `schedule_revisions` | L/C/M/T; pubblica proprie bozze | Come Admin nei progetti assegnati |
| `activity_schedule_periods` | L/C/M in bozza | Come Admin nei progetti assegnati |
| `project_schedule_state` | L/T tramite pubblicazione | Come Admin nei progetti assegnati |
| `budget_categories` | L/C/M | L/C/M assegnati |
| `budget_line_items` | L/C/M | L/C/M assegnati |
| `budget_revisions` | L/C/M/T; pubblica proprie bozze | Come Admin nei progetti assegnati |
| `budget_lines` | L/C/M in bozza | Come Admin nei progetti assegnati |
| `budget_line_result_allocations` | L/C/M in bozza | Come Admin nei progetti assegnati |
| `project_budget_state` | L/T tramite pubblicazione | Come Admin nei progetti assegnati |
| `project_exchange_rates` | L/C; correzione mediante nuova versione | Come Admin nei progetti assegnati |
| `commitments` | L/C/M/T | Come Admin nei progetti assegnati |
| `expenses` | L/C/M/T; conversione fissata dal DB | Come Admin nei progetti assegnati |
| `reports` | L/C/M bozze di ogni autore; T registrazione/rettifica | Come Admin nei progetti assegnati |
| `report_activities` | Come rapporto padre | Come rapporto padre |
| `audit_log` | L completo | L degli eventi dei propri progetti |

Audit scritto solo dal DB, mai direttamente dai due ruoli. Gli eventi globali
(utenti, ruoli, anagrafiche condivise) non sono leggibili dal Manager. Gli eventi
con project_id espongono solo dati di quel progetto: evitare payload globali
sensibili o dettagli di altri progetti. Nessun client scrive liberamente autori,
validatori, date, cambi applicati o puntatori delle revisioni.

Manager può modificare la valuta principale solo prima dei primi dati economici,
come Admin. Progetto archiviato in sola lettura salvo riapertura controllata da
Admin o Manager assegnato. La creazione degli utenti e la modifica di anagrafiche
globali restano operazioni amministrative della piattaforma.

## Contratto per l’implementazione

Policy SELECT, INSERT e UPDATE coprono riga precedente e risultante con USING e
WITH CHECK. Project_id e autori originali immutabili; grants di colonna e trigger
proteggono transizioni e attributi derivati. RLS da sola non garantisce questo.

Helper previsti: `is_admin()` e `has_project_role(project_id, roles)` con ruolo
ammesso manager e identità ricavata da auth.uid(). Non accettare user_id o actor_id
forniti dal client per sostituire il chiamante. Helper privilegiati, se necessari,
in schema non esposto, search_path fissato, owner dedicato, grant minimo e nessun
SQL dinamico. Evitare policy ricorsive sulle membership.

La registrazione da Admin/Manager valida automaticamente rapporti e rilevazioni
nella stessa transazione, anche quando registrante e autore coincidono. Nessuna
coda o secondo validatore nell’MVP. In futuro, i dati degli operatori richiederanno
validazione del Manager: progettare gli accessi prima di introdurre quei ruoli.

Viste, dashboard, esportazioni e RPC rispettano la stessa separazione per progetto.
La ricerca minima degli enti è un endpoint specifico; non concede SELECT globale
sui partenariati. API ordinarie con token utente; service role solo operazioni
tecniche server autorizzate, mai client. Revoca accesso efficace alla query successiva.

## Casi da verificare nelle milestone di implementazione

| Scenario | Risultato atteso |
| --- | --- |
| Anonimo legge dati applicativi, vista, export o RPC | Negato |
| Manager A legge/scrive progetto B non assegnato | Negato |
| Manager crea progetto, utente o assegna un altro Manager | Negato |
| Admin crea progetto, invita utente e assegna Manager | Ammesso con audit |
| Manager modifica budget, cronogramma o bozza di rapporto altrui nel proprio progetto | Ammesso con attribuzione preservata e audit |
| Manager pubblica propria revisione o registra propri indicatori | Ammesso; dati registrati validati automaticamente |
| Client forza project_id, validatore, cambio applicato o puntatore revisione | Negato |
| Manager tenta leggere audit globale o modificare ente condiviso | Negato |
| Ricerca ente esistente | Solo id/codice/nome; nessun dato di altri progetti |
| Progetto attivo senza ente, con due capofila o sole più partner | Negato anche con scritture concorrenti |
| FK tra dati di progetti diversi | Negato anche da canale privilegiato |
| Revoca membership con sessione aperta | Accesso negato alla query successiva |
| Ultimo Admin attivo revocato/disabilitato | Negato anche con concorrenza |
| Rettifica validata | Vecchio contributo escluso e nuovo incluso una sola volta |
| Spesa estera senza tasso del mese o con tasso di altro progetto/valuta | Contabilizzazione negata |
| Cambio corretto dopo contabilizzazione | Spesa storica invariata; rettifica esplicita per applicare il nuovo cambio |
| Due pubblicazioni, allocazioni o pagamenti concorrenti | Un unico stato coerente, nessun superamento dei vincoli |
| Progetto archiviato riceve spesa o rapporto | Negato fino a riapertura controllata |

Test con identità distinte e chiamate dirette, non solo UI o service role.
