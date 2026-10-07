# Email Ariadne Hub — Milestone 1B

Stato al 7 ottobre 2026: **milestone 1B completata e verificata**.
Configurazione operativa; documentazione inclusa nella pubblicazione su `main`
insieme alla consegna della Milestone 2.

## Identità e account

- Organizzazione Google Workspace: Ariadne Hub, Italia.
- Casella amministrativa e mittente: `admin@ariadne-hub.it`.
- Nome mittente SMTP: `Ariadne Hub`; risposte alla stessa casella (nessun
  Reply-To alternativo nel messaggio di prova).
- Dominio verificato, Gmail attivo, una licenza Business Starter.
- Verifica in due passaggi attiva; password per app dedicata a Supabase Auth.
- Iscrizione e pagamento completati dall’utente. La contabilizzazione del
  pagamento non è stata ricontrollata dopo il precedente stato di attesa.
- GitHub e Vercel mantengono gli account già concordati.
- Notifiche applicative rinviate per richiesta dell’utente.

## DNS e autenticazione del dominio

Record pubblici verificati il 7 ottobre 2026 dopo la propagazione:

| Tipo | Host | Valore |
| --- | --- | --- |
| MX | @ | `1 smtp.google.com.` |
| TXT SPF | @ | `v=spf1 include:_spf.google.com ~all` |
| TXT DKIM | `google._domainkey` | Chiave RSA Google a 2048 bit pubblicata e verificata |
| TXT DMARC | `_dmarc` | `v=DMARC1; p=none; adkim=r; aspf=r; rua=mailto:admin@ariadne-hub.it` |

TTL impostato su Aruba: un’ora. Record web e nameserver preservati.
Il precedente selettore Aruba `a1._domainkey` è rimasto presente.

Nella console Google è stata avviata l’autenticazione DKIM con il record
esistente, senza rigenerare la chiave. Stato confermato:
**“Authenticating email with DKIM.”**

## Collaudo autenticazione email

Mail tecnica inviata il 7 ottobre 2026 alle 17:02 Europe/Rome tramite Google
SMTP autenticato, da `Ariadne Hub <admin@ariadne-hub.it>` alla casella di
progetto `teamricercatvg@gmail.com`. Oggetto:
`Ariadne Hub - verifica SPF DKIM DMARC`. Ricezione confermata da Gmail,
consegna dopo un secondo. La vista “Original Message” e gli header riportano:

- **SPF PASS**: envelope sender `admin@ariadne-hub.it`.
- **DKIM PASS**: dominio `ariadne-hub.it`, selettore `google`.
- **DMARC PASS**: header From `ariadne-hub.it`, policy `p=none`.

Questo collaudo SMTP verifica l’autenticazione su un destinatario esterno al
dominio. Il collaudo separato di Supabase Auth è descritto sotto.
DMARC resta in monitoraggio; ricezione dei report aggregati e passaggio a una
policy più restrittiva sono attività successive, non blocchi alla chiusura.

## SMTP Supabase Auth configurato e attivo

Richiesta dell'utente: usare ora la casella per Supabase Auth (magic link e
altre email di accesso); notifiche applicative rimandate.

| Impostazione | Valore |
| --- | --- |
| Host | `smtp.gmail.com` |
| Porta | `587`, STARTTLS |
| Utente e mittente | `admin@ariadne-hub.it` |
| Nome mittente | `Ariadne Hub` |
| Credenziale | Password per app Google dedicata, mai versionata |

Le sei variabili `SMTP_*` sono salvate in Coolify sul solo servizio
`d4urni99thsq3vsnxxkckjzh`, rilette e confrontate senza stampare il segreto.
La configurazione è applicata al container `supabase-auth` tramite deploy
individuale Coolify (app `oyzkll6kjp7tnlv0jww7nsrt`). Container healthy;
`GOTRUE_SMTP_*` verificati nel runtime. Nessuna configurazione per notifiche
applicative aggiunta e nessuna modifica allo stack CDP.

La password per app è stata verificata con autenticazione SMTP dal Mac e poi
dal server, usando le credenziali effettive del container, STARTTLS e verifica
certificato. Nessun messaggio è stato inviato durante questi controlli.
I check backend Auth/REST e protezione Studio passano; signup pubblico e utenti
anonimi restano disabilitati.

Il 7 ottobre 2026, su autorizzazione esplicita dell’utente, il magic link è stato
inviato tramite `/auth/v1/otp` (HTTP 200) e osservato nella posta in arrivo di
`admin@ariadne-hub.it`, oggetto `Your Magic Link`, ore 16:56. Per la prova è
stato creato in Auth l’utente con questo indirizzo, email confermata, senza
ruoli applicativi. Il link non è stato consumato: il flusso di accesso
nell’applicazione resta da implementare e collaudare nella Milestone 4.

### Rete Netcup

Il pannello SCP ha confermato `netcup Mail block`, che bloccava le porte TCP
25, 465 e 587 in uscita. L'utente ne ha autorizzato espressamente la rimozione.
Policy rimossa e assenza verificata dopo ricarica del pannello. Firewall Netcup
ancora attivo, policy ping e regole implicite preservate. Firewall host invariato.
L'intervento riguarda l'interfaccia condivisa con CDP e consente SMTP in uscita
anche agli altri processi del server. Connessione Google 587 e login SMTP
riusciti dal server dopo la modifica.

Credenziali e snapshot precedenti restano in `~/.config/ariadne-infra/`, con
permessi privati. Fonte procedura firewall:
https://www.netcup.com/en/helpcenter/documentation/server/firewall

## Chiusura e attività successive

Casella verificata in invio/ricezione, SMTP Auth collaudato con magic link
realmente ricevuto e autenticazione SPF/DKIM/DMARC verificata: criteri 1B
soddisfatti. Segreti conservati solo nei percorsi privati e in Coolify.

I flussi applicativi completi di invito, conferma, login e recupero password
restano nella Milestone 4. Le notifiche applicative saranno configurate in
seguito, come richiesto dall’utente.

## Riferimenti ufficiali

- [Record MX Google Workspace](https://support.google.com/a/answer/6156494)
- [Configurazione SPF](https://support.google.com/a/answer/33786)
- [Invio da app e servizi SMTP](https://support.google.com/a/answer/176600)
