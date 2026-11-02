# Collaudo pubblico milestone 4 — 12 ottobre 2026

Stato: **parziale**, in attesa dell’account dedicato. Non certifica la chiusura
del collaudo. Ambito limitato ad autenticazione e profilo, esclusa milestone 5.
Versione applicativa: `b2498f2`, documentazione successiva `b1aa89f`.
Browser delle prove: browser integrato Codex su macOS.
Nessuna password o URL con token riportati in questo documento.

| Prova | Esito | Evidenza / limite |
| --- | --- | --- |
| Invito e password dell’utente | Confermato dall’utente | L’utente riferisce “Andata” dopo la correzione; non sostituisce la prova sull’account dedicato |
| `/account` senza sessione | Superata | Navigazione diretta rimanda a `/login`, con titolo “Benvenuto in Ariadne” |
| `/password` senza sessione | Superata | Navigazione diretta rimanda a `/login` |
| Login e recupero, desktop 1280×900 | Controllo visivo positivo | Campi e pulsanti leggibili, modulo recupero espandibile; pagina scorrevole |
| Login e recupero, viewport 390×844 | Controllo visivo positivo | Nessun taglio orizzontale visibile, modulo a colonna singola; non è un telefono fisico |
| Invito account dedicato e impostazione password | Da eseguire | Manca accesso operatore al backend su questo Mac |
| Login corretto / password errata | Da eseguire | Account dedicato ancora da predisporre |
| Nome, email e assenza privilegi Admin | Da eseguire | Richiede sessione dedicata |
| Sessione conservata dopo ricarica | Da eseguire | Richiede sessione dedicata |
| Logout e riapertura pagine protette | Da eseguire | I redirect anonimi sono verificati, la revoca dopo logout no |
| Ricezione recupero, cambio password, riuso link | Da eseguire | Richiede account, casella destinataria e interazione del titolare per la password |
| Telefono reale e tastiera mobile | Da eseguire | La simulazione delle dimensioni non verifica browser e tastiera del dispositivo |

## Blocco operativo

Il destinatario di prova è stato indicato dall’utente nella conversazione.
Non è stato creato alcun account né inviato alcun messaggio durante questa fase.
Su questo Mac risultano assenti `.env.local`, la directory privata Ariadne e
il profilo SSH documentato. Il pannello Supabase richiede autenticazione:
il browser riporta `net::ERR_INVALID_AUTH_CREDENTIALS` prima dell’apertura
dell’interfaccia. Questo è un limite di accesso al collaudo, non un difetto
osservato nel sito applicativo.

Per proseguire: inviare l’invito dall’ambiente operatore già configurato oppure
ripristinare privatamente la configurazione dedicata su questo Mac. Il nome
proposto è “Collaudo Ariadne”; nessuna promozione ad Admin o membership progetto.
Le password nuove vanno inserite direttamente dal titolare nel browser.

Registrare per ogni eventuale difetto: passaggi, browser/dispositivo,
risultato atteso, risultato effettivo e messaggio visibile. Non includere
password, token, cookie o collegamenti di recupero.
