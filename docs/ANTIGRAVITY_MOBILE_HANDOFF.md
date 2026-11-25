# Consegna ad Antigravity per la beta mobile di Barber & Dragons

Preparato il 22 novembre 2026. I riscontri sui servizi live e sulla preview Android risalgono al 21 novembre. Base esaminata `main` a `b3f23d20`, con ultimo aggiornamento del client al commit `399fe61a` del 2 novembre.

**Stato della release.** Android ha una preview interna funzionante fino al login, precedente al codice corrente. iOS ha configurazione Expo e bundle JavaScript verificato, con build nativa ancora da produrre. Il prossimo traguardo consigliato è una nuova preview Android firmata, collaudata da un giocatore e un GM nella stessa campagna di prova. L'apertura della beta dipende dalla correzione dei permessi su `organizations` e dall'esito dei flussi critici.

## Prodotto e perimetro

L'app è il companion delle campagne D&D 5e della community Barber & Dragons. Per il giocatore il percorso centrale è trovare una sessione, prenotare, usare la scheda e comunicare con il GM. Per il GM è gestire il tavolo e controllare dal telefono il GM Screen sul PC. Conservare la navigazione per ruolo, la palette attuale, i flussi web e la compatibilità con le schede salvate. Iniziativa, audio, presenze e XP vanno verificati nei percorsi già disponibili. Nel flusso di dettatura per le sessioni Long il GM Screen resta responsabile della proposta e dell'applicazione, con testo modificabile e conferma esplicita.

Prima di intervenire leggere `AGENTS.md`, [PRODUCT.md](../PRODUCT.md) e lo stato Git. Al momento dell'audit erano presenti modifiche estranee in `docs/ANTIGRAVITY_GENERATORE_V2_HANDOFF.md` e i file locali `AGENTS.md` e `PRODUCT.md` risultavano non tracciati. Preservare quelle modifiche. Questa consegna definisce il lavoro tecnico da proporre ad Alessandro. Migrazioni live, deploy, build cloud con consumo di quota, invii agli store e rollout richiedono autorizzazione nel relativo incarico.

## Base verificata

| Area | Evidenza |
| --- | --- |
| Android | EAS registra la preview interna **1.0.0, codice 7**, del 17 ottobre, costruita da `190c2ea0`. APK locale `output/releases/BarberAndDragons-PTT-v7.apk`, firma verificata, target API 36 e checksum coerente con il file associato. Installazione pulita, avvio e validazione dell'email mancante verificati su emulatore Android 36. L'aggiornamento dall'APK v4 in radice fallisce per certificato diverso, riprodotto su emulatore. [Build EAS v7](https://expo.dev/accounts/alexiit33/projects/barber-and-dragons-mobile/builds/40e7a5cd-e6d8-4611-9067-28472567eeba) |
| Provenienza della prossima build | Tra la v7 e il checkout sono cambiati 23 file mobile, tra cui scheda, sussurri, navigazione, notifiche e dettatura. EAS mostrava solo preview Android. L'ambiente EAS `production` non mostrava variabili pubbliche Supabase a livello di progetto o account. Nessun AAB di produzione o build iOS rilevata nella cronologia. [Configurazione EAS](../mobile/eas.json) |
| Codice e test | TypeScript mobile, export Metro per Android e iOS e verifica locale delle due migrazioni passati. L'audit tecnico ha eseguito **122 test** includendo telecomando e combattimento. Nell'audit UX sono passati **55 test della suite mobile** e il relativo controllo delle migrazioni. L'export Metro attesta il bundle JavaScript. |
| Backend pubblico | Vercel risultava `READY` su `b3f23d20`. `/privacy`, `/support` e `/delete-account` rispondevano `200`. Le route di cancellazione, registrazione dispositivo, dispatch e scrittura della scheda rispondevano `401` senza credenziali con i rispettivi metodi HTTP. |
| Push | Due trigger attivi, dispatcher ogni cinque minuti, sette risposte recenti `200`, un dispositivo registrato e nessun lavoro presente in coda al controllo. I riscontri attestano il funzionamento del dispatch HTTP. Ricezione, apertura dalla notifica e salvataggi autenticati restano da provare su dispositivi fisici. |

## Fase 1 · Permessi delle organizzazioni

**Blocco prima di allargare la beta.** Nel database di produzione `public.organizations` aveva RLS disattivata e grant di lettura, inserimento, modifica e cancellazione per `anon` e `authenticated`. La tabella contiene anche piano, limiti e flag delle organizzazioni. Il riscontro viene dai metadati dei permessi.

Censire i chiamanti web e server, le relazioni di membership e i flussi amministrativi o privilegiati. Preparare una migrazione mirata e verificare i grant e le policy in un ambiente isolato. L'accesso anonimo e l'accesso tra organizzazioni devono essere negati dove non previsti. Gli utenti e i servizi autorizzati devono conservare i rispettivi flussi di lettura e amministrazione. Consegnare diff, matrice per ruolo ed evidenze dei test prima dell'applicazione live. Lo storico remoto degli interventi mobile contiene timestamp diversi da quelli locali e va confrontato prima di applicare migrazioni. [Rilascio backend precedente](mobile-backend-release.md)

## Fase 2 · Correttezza dei flussi mobile

### Sussurri

`useRealtimeWhispers` aggiunge il messaggio in locale e può riportare successo anche su rifiuto di Supabase o eccezione. Entrambi i mittenti svuotano il campo prima del risultato. Rappresentare invio, conferma della registrazione ed errore. Lasciare recuperabile il testo e gestire il nuovo tentativo evitando doppioni. Per il broadcast verificare l'esito parziale per destinatario. In assenza di una campagna o di un GM valido mostrare come proseguire.

**Accettazione.** Un rifiuto dovuto a blocco, permessi o rete non diventa un messaggio inviato. Dopo successo il destinatario lo vede una volta sola, anche se la risposta della scrittura e il Realtime arrivano in ordine diverso. Bocciatura e nuovo tentativo preservano il testo e l'esito rimane coerente dopo ricaricamento. [Hook e risultati di invio](../mobile/src/hooks/useRealtimeWhispers.ts#L162) · [Giocatore](../mobile/src/screens/player/PlayerWhisperScreen.tsx#L76) · [GM e broadcast](../mobile/src/screens/gm/GmWhispersInboxScreen.tsx#L155)

### Prenotazioni

Iscrizione e disdetta cambiano lo stato locale prima della scrittura, con percorsi di errore senza ripristino. La Home mostra un messaggio di posto riservato anche quando il risultato è lista d'attesa. Un riscontro aggiuntivo nel preparare la consegna conferma che una lettura riuscita senza righe produce sessioni demo nel percorso ordinario, senza guardia `__DEV__`.

**Accettazione.** Home, dettaglio e calendario mostrano lo stesso esito confermato, inclusa la distinzione tra posto assegnato e lista d'attesa. Su errore recuperano l'ultimo stato confermato e offrono un'azione di riprova. Un calendario vuoto resta vuoto e un errore di caricamento ha un proprio messaggio. Controllare il percorso web già adottato per capienza, stati e lista d'attesa. Provare due iscrizioni contemporanee all'ultimo posto, doppio tocco, disdetta fallita e riapertura del dettaglio. [Lettura e fallback demo](../mobile/src/hooks/usePlayerSessions.ts#L58) · [Mutazioni](../mobile/src/hooks/usePlayerSessions.ts#L171) · [Conferma dalla Home](../mobile/src/screens/player/PlayerHomeScreen.tsx#L228)

### Scheda e punti ferita

La Home mostra iniziativa fissa a `+2`, ripiega su CA `15` e massimo PF `42` e ignora lo stato di salvataggio dei tasti rapidi. Riutilizzare i valori proiettati, la mutazione con controllo di revisione e la rilettura già usati nella scheda. Esplicitare i dati assenti e disabilitare le azioni che dipendono da quei dati. Verificare che le cure e i danni si comportino coerentemente in Home e in scheda, anche in presenza di PF temporanei.

**Accettazione.** Valori uguali tra Home, scheda e sito per lo stesso personaggio. Salvataggio in corso, conflitto, errore e risultato confermato sono riconoscibili. Tocchi ravvicinati non perdono modifiche. Un valore assente non genera statistiche plausibili inventate. [Home giocatore](../mobile/src/screens/player/PlayerHomeScreen.tsx#L214) · [Controlli rapidi e statistiche](../mobile/src/screens/player/PlayerHomeScreen.tsx#L602) · [Salvataggio e revisione](../mobile/src/hooks/usePlayerCharacter.ts#L384)

## Fase 3 · Accessibilità e navigazione

- **PF e calendario.** La scheda dispone sette azioni PF sulla stessa riga, con altezza minima di 36 e controlli numerici privi di etichette esplicite. Le frecce del mese hanno una superficie di 28 × 28 con area estesa tramite `hitSlop`, senza nome accessibile. Dare priorità a tocchi affidabili e azioni annunciate come «Subisci 1 danno», «Cura 1 PF» e «Mese successivo». I riferimenti di audit sono 48 dp su Android e 44 pt su iOS. Verificare il layout con testo ingrandito e telefono piccolo e provare l'agenda come alternativa alla griglia. [Scheda](../mobile/src/screens/player/CharacterSheetScreen.tsx#L639) · [Calendario](../mobile/src/components/common/GridCalendar.tsx#L406)
- **Accesso.** Preservare la gerarchia del login osservata su emulatore. Il testo dell'errore ha contrasto calcolato di **4,18:1** sul fondo composito. Portarlo ad almeno **4,5:1** e verificare che TalkBack e VoiceOver rendano percepibile l'errore. [Stili login](../mobile/src/screens/auth/LoginScreen.tsx#L332)
- **Notifiche.** Il router passa `notificationSessionId` al calendario giocatore, che non lo legge. Presenze e XP lato GM lo legge. Aprire o evidenziare la sessione corretta dopo il cambio campagna e prevedere un esito comprensibile quando il tavolo non è più accessibile. Provare app aperta, in background e chiusa. [Router](../mobile/src/notifications/PushNotificationRouter.tsx#L20) · [Calendario giocatore](../mobile/src/screens/player/SessionsCalendarScreen.tsx#L34) · [Presenze e XP](../mobile/src/screens/gm/GmXpAttendanceScreen.tsx#L69)
- **Regia.** Conservare gli stati testuali della connessione al PC, la proposta modificabile e la ricevuta. Verificare input manuale con microfono negato, pairing con QR, campagna errata, PC offline, cambio scontro e doppia conferma. Il telefono deve mostrare «Applicato» soltanto a ricevuta del PC. [Tracker e dettatura](../mobile/src/screens/gm/GmCombatTrackerScreen.tsx#L252) · [Audit del telecomando](audits/mobile-push-to-talk-gm-screen.md)

## Fase 4 · Build e collaudo

Generare la nuova preview dal commit di consegna. Per Android usare un codice build superiore a 7 e verificare il certificato rispetto alla preview precedente. Provare installazione pulita e aggiornamento da v7, rileggendo campagna e stato locale del tracker. Registrare commit, profilo EAS, identificativo build, versione e dispositivo. Verificare le variabili backend nell'ambiente effettivo di compilazione. Le credenziali server rimangono nei servizi che le usano.

| Percorso in campagna di prova | Esito richiesto |
| --- | --- |
| Accesso e ruoli | Giocatore, GM e Admin vedono i rispettivi contenuti anche dopo cambio campagna, uscita e riapertura. Sessione scaduta e rete assente hanno un percorso di recupero. |
| Giocatore | Trova e prenota un tavolo, distingue lista d'attesa, aggiorna la scheda e rilegge lo stesso valore sul web. Invia un sussurro ricevuto dal GM e riconosce un invio fallito. |
| GM | Abbina il telefono al PC, avanza un turno e verifica la variazione dei PF sul GM Screen. Prova input manuale e dettatura con proposta e ricevuta. Controlla audio, presenze e XP. |
| Push e accessibilità | Ricezione, apertura della destinazione, disattivazione delle notifiche e relogin. Controlli principali leggibili e azionabili con lettore di schermo e testo ingrandito. |

Eseguire `npm run test:mobile` dalla radice e `npm run type-check` da `mobile/`. Eseguire le suite `src/lib/gm-remote/__tests__` e `src/lib/fight-mode/__tests__` se la consegna tocca il telecomando o il combattimento. Aggiungere regressioni mirate per i problemi sopra nei punti in cui i test attuali non raggiungono l'errore osservato. Ripetere il bundle Expo. Il collaudo autenticato richiede account dedicati e almeno un Android fisico per la beta Android. Per la distribuzione iOS ripetere la matrice su iPhone fisico.

## Fase 5 · Condizioni per gli store

- **Google Play.** Preparare AAB firmato, verificare API 36 e compatibilità con pagine da 16 KB sull'artefatto finale. Alessandro deve verificare tipo e data di apertura dell'account Play Console. Se è personale e aperto dopo il 13 novembre 2023, il test chiuso richiede almeno 12 tester iscritti continuativamente per 14 giorni prima della richiesta di accesso alla produzione. [Target API](https://support.google.com/googleplay/android-developer/answer/11926878) · [Pagine da 16 KB](https://developer.android.com/guide/practices/page-sizes) · [Test chiuso](https://support.google.com/googleplay/android-developer/answer/14151465)
- **App Store.** Verificare Apple Developer, identificativo, firma e APNs. Produrre la build con Xcode 26 o successivo e SDK iOS 26 o successivo, quindi verificare la distribuzione TestFlight. La configurazione attuale prevede iPhone. [Requisiti Apple](https://developer.apple.com/news/upcoming-requirements/?id=04282026a)
- **Privacy, account e moderazione.** La richiesta di cancellazione entra in coda come `pending`. Definire chi la prende in carico, dati da cancellare o conservare, tempi e comunicazione dell'esito. Provare il processo su un account di collaudo. Per i sussurri verificare blocco e segnalazione, assegnare la gestione delle segnalazioni e risolvere il requisito Apple sul filtraggio. Completare informativa e dichiarazioni sui dati, includendo il trattamento della voce da parte del servizio di sistema quando applicabile. [Decisioni del titolare](privacy-account-owner-inputs.md) · [App Review](https://developer.apple.com/app-store/review/guidelines/) · [Norme Google Play](https://support.google.com/googleplay/android-developer/answer/18265346)
- **Materiali e accesso per la review.** Completare descrizione, screenshot della build destinata allo store, classificazione di età, URL, dichiarazioni privacy e dati, accessi di prova e istruzioni per il percorso GM che usa il PC. Lo stato di Play Console e App Store Connect resta da confermare con Alessandro.

## Risultato da restituire ad Alessandro

Consegnare commit e diff, esito dei test per ruolo, identificativo della build e matrice compilata con dispositivo, risultato e difetti residui. Evidenziare la decisione necessaria per la distribuzione successiva. Il criterio per allargare la beta è che ogni azione critica mostri un esito coerente con i dati confermati e permetta il recupero su errore. La data pubblica si decide dopo il collaudo e la verifica degli account store.

Riferimenti storici di progetto. [Release mobile](mobile-release.md) · [Validazione mobile](mobile-validation.md) · [Piano di accettazione](mobile-implementation-plan.md)
