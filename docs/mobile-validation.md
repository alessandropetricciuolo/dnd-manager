# Consegna mobile — 13 ottobre 2026

Le correzioni sono state salvate e inviate a GitHub. Dopo approvazione del proprietario, backend e migrazioni sono stati distribuiti in produzione e il dispatcher push attivato. La prima build APK è in preparazione su Expo; nessun invio agli store. Tre worker GPT-6-Luna hanno seguito scheda, autenticazione/privacy e release; la revisione principale ha integrato notifiche e verifiche.

## Stato dei cinque punti

1. **Salvataggi scheda:** endpoint autenticato con autorizzazioni, operazioni limitate, controllo della revisione e rilettura del record persistito. Errori visibili; nessun aggiornamento ottimistico che nasconda un fallimento. Anche i punti ferita del GM usano questo percorso.
2. **Accessi:** ruolo derivato dal profilo attendibile, accesso bloccato senza profilo valido, sessione e rinnovo gestiti con il ciclo di vita dell'app, recovery collegato al sito. Tracker isolato per utente e campagna.
3. **Notifiche:** consenso esplicito, preferenze, registrazione/rimozione dispositivo, coda per sussurri e sessioni, promemoria, retry e ricevute. Accesso e blocchi ricontrollati prima dell'invio; messaggi sulla schermata bloccata generici. Credenziali e consegna reale ancora da verificare.
4. **Release:** dipendenze Expo allineate, tipi reali senza dichiarazioni sostitutive, configurazioni EAS development/preview/production, development client e icona preparati. Cartella mobile pronta per Git con esclusione di credenziali e file generati; commit ancora da eseguire.
5. **Account/privacy:** pagine privacy/assistenza, richiesta di cancellazione autenticata, segnalazione e blocco reciproco dei sussurri. La richiesta viene registrata per gestione manuale: non cancella l'account. Informativa mobile, procedura di evasione e moderazione restano requisiti prima dello store. Il filtraggio dei contenuti offensivi non è implementato e va valutato rispetto ai requisiti di review.

## Prove eseguite

- 29 test superati: autorizzazioni, conflitti, validazione, persist/readback, push e retry, cancellazione, isolamento del tracker e policy SQL.
- Entrambe le migrazioni compilate ed eseguite su PostgreSQL locale emulato con PGlite: trigger, coda, promemoria idempotenti, revoca accessi, blocchi reciproci, RLS e unicità delle richieste.
- Type-check completo del progetto mobile superato; controllo compatibilità Expo ed export JavaScript iOS/Android superati.
- Lint mirato dei nuovi endpoint/pagine e controllo degli spazi nel diff superati.
- Pagine pubbliche privacy, assistenza e cancellazione verificate nel browser locale con larghezza mobile. La cancellazione senza login richiede l'accesso. I quattro endpoint sensibili rifiutano richieste senza autenticazione (401).
- Aggiornamento durante la preparazione backend: corretti i campi mancanti delle fixture Sheet Generator e i tipi di due test Command Center/M6, senza cambiare logica prodotto. TypeScript globale e build web completa di produzione ora superati; 101 test Sheet Generator e 11 test Wiki/M6 superati. Restano soltanto warning lint preesistenti non bloccanti.

Aggiornamento produzione: endpoint non autenticati verificati (401), pagine pubbliche (200), dispatcher autenticato (200 con coda vuota), nuovi grant/RLS/trigger/policy riletti. Schema e configurazioni di produzione sono stati modificati con approvazione; nessun personaggio/campagna modificato per simulare test. Resta da verificare la build installata sul telefono e i salvataggi autenticati end-to-end.

## Passaggi prima della beta e della pubblicazione

1. Revisionare e distribuire backend e due migrazioni; la build globale del sito è ora verificata.
2. Collegare progetto Expo reale e account Apple/Google, firme, APNs/FCM, variabili e schedulazione del dispatch. Vedere `mobile-release.md`.
3. Completare informativa e responsabilità operative in `privacy-account-owner-inputs.md`; rendere effettiva la gestione di cancellazioni e segnalazioni, inclusi gli eventuali requisiti di filtraggio.
4. Installare le build su iPhone e Android ed eseguire la matrice di test con giocatore, GM e Admin, rete assente, sessione scaduta, cambio account/campagna e push a app chiusa.
5. Solo dopo la beta, completare screenshot, classificazione età, dichiarazioni privacy/dati, account review e requisiti di test applicabili all'account Google.

La data di pubblicazione va fissata dopo la prima beta installabile e questi riscontri, senza stimare i tempi di approvazione dagli export locali.
