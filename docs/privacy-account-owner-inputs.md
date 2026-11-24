# Privacy and account owner inputs

The request path records a request as `pending` for manual handling. The admin starts the deletion from **Account e Whisper** or the user's admin profile.

## Account deletion decisions

Alessandro handles account deletion as the Barber & Dragons admin. The service target is to complete deletion within 30 days of receiving the request and confirm completion by email.

Before deleting a GM account, transfer the campaigns and sessions assigned to that account to the Barber & Dragons admin. Verify that the transfer preserves the existing campaigns and sessions and that the recipient is an active admin distinct from the account being deleted. Keep the request in progress if the transfer has not been verified.

## Admin workflow

1. The admin opens the request, verifies the account and confirms **Elimina**.
2. The database transfers campaigns and sessions to the admin, clears supported personal references and deletes the Auth account in one transaction. Open Whisper reports, owned Storage files and unresolved database references must be handled first. A failed transaction leaves the account and ownership intact.
3. The server sends a confirmation email after the transaction. If sending fails, use **Riprova invio email** in the admin panel. The email address is cleared from the receipt after a successful send.
4. For accounts that use native Apple sign-in, the server revokes the Apple authorization. The encrypted refresh token stays in the receipt until the revocation succeeds. If Apple is temporarily unreachable, use **Riprova revoca Apple** in the admin panel.

Alessandro also reviews Whisper reports in **Account e Whisper**. He can archive a report or remove the reported message from the conversation and campaign memory. Participants must accept the Whisper rules before sending their first message.

The admin panel, public copy, database migration and compatible mobile build should be released together. The database starts enforcing the rules when the migration is applied, so older mobile builds cannot accept them.

Owner decisions still required before expanding the privacy notice:

- Legal identity and contact details of the data controller.
- Which account, gameplay, communication, device, and diagnostic data are collected, and for what purposes and legal bases.
- Retention periods or criteria for each data category, including whispers, account deletion requests, and reports.
- How access, correction, export, objection, and deletion requests are verified, handled, and completed.
- How long to retain abuse reports and blocks.
- Whether deleting an account affects campaign records, messages, backups, or other users' records, and how any exceptions are explained.
- The support contact and any response-time commitment the owner is prepared to meet.

Verified implementation references at the time this note was added:

- The website loads the Iubenda consent widget configured with cookie policy ID `43878034`.
- The linked Iubenda URL `https://www.iubenda.com/privacy-policy/43878034` returned HTTP 200 and a page titled “Privacy Policy di 4466894 | www.barberanddragons.com” when checked on 2026-10-13.
- The website has a `/contatti` form that replies to the submitter's email.
- The mobile deletion request is stored in `account_deletion_requests` for manual review; it does not execute deletion.
- Abuse reports are stored in `whisper_reports`; whisper blocks are stored per blocker in `whisper_user_blocks` and prevent new whisper inserts in either direction.

## Inventario per le schede privacy degli store

Bozza riferita al codice mobile e ai servizi usati. Completare le risposte sulla build candidata prima dell’invio. [App Privacy di Apple](https://developer.apple.com/app-store/app-privacy-details/) · [Data safety di Google Play](https://support.google.com/googleplay/android-developer/answer/10787469)

| Dati e flusso | Categorie da verificare nei moduli | Finalità osservata |
| --- | --- | --- |
| Email reale o relay Apple, nome profilo, ID account e identificativo provider. La registrazione sul sito richiede anche la data di nascita. | Informazioni di contatto e identificativi utente. Verificare come dichiarare la data di nascita nel flusso web raggiungibile dall’app. | Accesso, profilo, verifica dell’età, assistenza e cancellazione. |
| Schede dei personaggi, campagne, sessioni e attività di gioco associate all’account. | Contenuti utente e attività nell’app secondo i tipi di dati delle singole console. | Gestione di personaggi e campagne. |
| Sussurri, eventuali allegati ricevuti e segnalazioni con motivo e dettagli. | Messaggi, contenuti utente, foto quando applicabile. | Comunicazioni tra partecipanti, blocchi e moderazione da parte dell’admin. |
| Token push Expo associato all’account, piattaforma e preferenze. La consegna usa Expo e APNs o FCM. | Identificativi del dispositivo o altri identificativi. | Invio di notifiche opzionali. |
| Dettatura facoltativa per il GM. Il riconoscimento è delegato al servizio di sistema e può avvenire fuori dispositivo. Il testo è editabile e raggiunge il backend quando il GM invia il comando. | Audio da verificare con il servizio e la build effettivi. Contenuto testuale per i comandi inviati. | Trascrizione di un comando e applicazione al GM Screen. |
| Se il comando passa al flusso di interpretazione AI, il GM Screen invia tramite OpenRouter il testo del comando e un riepilogo dei combattenti. | Contenuti utente. Verificare provider, conservazione e classificazione della condivisione. | Interpretazione dei comandi di combattimento. |
| Fotocamera per leggere il QR del telecomando. Il codice trasmette i dati del collegamento. | Verificare sulla build che la scansione resti locale e che partano solo i dati di abbinamento. | Collegamento al GM Screen. |

Per le voci associate all’account verificare la classificazione come dati collegati all’utente in App Store Connect. Prima di inviare, confermare i ruoli dei fornitori e l’eventuale condivisione secondo le definizioni di Play Console. Verificare anche SDK della build, log server e diagnostica prima di dichiarare raccolta e tracking. Allineare informativa pubblica, contatto del titolare e tempi di conservazione alle decisioni sopra.
