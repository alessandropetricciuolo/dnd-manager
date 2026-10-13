# Mobile: piano di completamento e criteri di accettazione

Data: 13 ottobre 2026. Scopo: preparazione locale della versione 1.0 e della beta Android/iOS. Nessun invio agli store o modifica alla produzione è incluso.

| Punto | Responsabile | Risultato richiesto | Verifica |
|---|---|---|---|
| 1. Scheda | Worker Luna, revisione principale | Mutazioni autenticate limitate al personaggio assegnato o GM autorizzato, conflitti rilevati, errori visibili, risposta riletta | Test autorizzazione/validazione/concorrenza e typecheck |
| 2. Auth e isolamento | Worker Luna, revisione principale | Ruoli dal profilo verificato, recovery, lifecycle sessione, nessun ruolo da metadati utente | Test policy, typecheck; E2E su dispositivi resta gate |
| 3. Push | Principale | Registrazione esplicita, preferenze, logout, notifiche generiche, coda server per sussurri/cambi sessione/promemoria, ricevute Expo | Test payload/retry/token, verifica SQL locale; APNs/FCM richiedono credenziali |
| 4. Release | Worker Luna, revisione principale | EAS, versioni/ambienti/documentazione, icona, tracker coerente per campagna | Expo check, export native, checklist beta |
| 5. Account/privacy/review | Worker Luna, revisione principale | Privacy e assistenza accessibili, richiesta cancellazione, segnalazione/blocco chat, materiale review | Test API e policy; dati del titolare e gestione richieste da confermare |

## Gate per beta

- Test locali dei flussi sensibili superati e nessuna migrazione applicata implicitamente.
- Migrazioni e backend distribuiti dopo revisione; nuova build nativa con progetto Expo reale.
- Login e logout, cold start, sessione scaduta, errore rete e cambio campagna verificati su Android e iPhone.
- Ogni salvataggio riletto dall'app e dal sito; conflitto fra dispositivi gestito.
- Push verificate in foreground/background/app terminata, tocco e disattivazione.
- Account giocatore, GM e Admin distinti: nessuna fuga di segreti o modifica di personaggi altrui.

## Gate store

- Beta reale completata senza difetti bloccanti.
- Account sviluppatore, firme, APNs/FCM e progetto Expo configurati dal proprietario.
- Informativa definitiva, contatti e gestione cancellazioni/segnalazioni operativi.
- Screenshot, schede privacy, classificazione età e credenziali review completati.
- Requisiti di test Google applicabili all'account completati.

Lo stato finale e le prove effettive sono riportati in `docs/mobile-release.md` e nel resoconto di consegna. Un export JavaScript non equivale a una build firmata o a un test su dispositivo.
