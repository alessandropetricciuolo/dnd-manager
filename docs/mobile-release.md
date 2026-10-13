# Release mobile Android e iOS

Stato: progetto Expo `@alexiit33/barber-and-dragons-mobile` collegato (ID `20cc1c5a-482a-49fd-bf41-cb5f86592eb7`). Firebase Android/FCM V1, firma Android e ambiente preview configurati. Build APK cloud avviata: `962faf0b-7568-400d-9613-8b73288d259b`. Backend e scheduler distribuiti dopo approvazione. Nessuna pubblicazione store.

## Configurazione presente

- Expo SDK 57, React Native 0.86, identificatore `com.barberanddragons.mobile`.
- `mobile/eas.json` definisce `development` (development client, iOS Simulator), `preview` (distribuzione interna; APK su Android e ad hoc su iOS) e `production` (build store con incremento automatico versione nativa).
- `app.json` registra `expo-notifications` e richiede solo iPhone (`supportsTablet: false`). Le schermate non sono state verificate su iPad e l'MVP non dichiara supporto tablet.
- L'icona usa il wordmark esistente centrato su canvas quadrato scuro; l'illustrazione originale non è stata ridisegnata.
- Le variabili Expo pubbliche sono documentate in `mobile/.env.example`; il file reale `.env` resta locale e ignorato da Git.
- Il tracker conserva stato e turni per utente e campagna su questo dispositivo tramite SecureStore, dividendolo in record piccoli e pubblicando il nuovo manifest solo dopo aver scritto tutti i record. Non è sincronizzato fra dispositivi; eventuali errori di archiviazione sono mostrati nel tracker.

## Avvio locale

```bash
cd mobile
npm install
cp .env.example .env
# Impostare EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
npm run start
```

La chiave anon di Supabase è una chiave pubblica destinata al client e non sostituisce RLS. Non inserire `service_role`, segreti server o chiavi APNs/FCM in variabili `EXPO_PUBLIC_*`.

## Progetto e credenziali richiesti al proprietario

1. Collegamento Expo completato nell'account del proprietario `alexiit33`; `app.json` contiene owner e ID reali.
2. Inserire URL e chiave anon Supabase nell'ambiente EAS usato per le build, oltre che nel `.env` locale.
3. Per iPhone fisici, usare un account Apple Developer attivo e configurare la firma EAS. La distribuzione interna ad hoc richiede UDID registrati; TestFlight usa la build `production` e il flusso di App Store Connect.
4. Per Android, configurare la firma del package `com.barberanddragons.mobile`. L'APK preview può essere installato direttamente; la produzione genera un artefatto store, ma non lo invia.
5. Firebase Cloud Messaging Android configurato su EAS; APNs iOS ancora da configurare. La consegna delle notifiche deve essere provata su telefono.
6. Dispatch server `GET /api/mobile/push/dispatch`, protetto da `CRON_SECRET`, attivo ogni cinque minuti tramite Supabase Cron/pg_net con segreto nel Vault. Script operativo: `scripts/mobile-push-scheduler.sql`. Prima verifica autenticata HTTP 200 con coda vuota; consegna reale ancora da provare sul telefono.

Il file Firebase pubblico `mobile/google-services.json` è incluso nella configurazione Android. La chiave privata del service account resta fuori dal repository. Firma Android e ambiente EAS preview completati. `.easignore` limita gli archivi EAS alla sola app mobile.

## Comandi EAS

Dalla cartella `mobile/`, dopo il collegamento al progetto e il login EAS:

```bash
npm run eas:build:development -- --platform ios
npm run eas:build:preview -- --platform android
npm run eas:build:preview -- --platform ios
npm run eas:build:production -- --platform all
```

La build di sviluppo iOS è per simulatore. La preview Android produce APK; la preview iOS richiede firma ad hoc e dispositivi registrati. La build production non pubblica automaticamente negli store. EAS Update non è configurato.

## Matrice minima per la beta

| Dispositivo | Build | Verifiche richieste |
|---|---|---|
| Android fisico supportato | Preview APK | Installazione pulita e aggiornamento, login/logout, cold start, rete assente, cambio campagna, tracker/HP, permessi camera e push foreground/background/chiusa |
| iPhone fisico supportato | Preview ad hoc o TestFlight | Stesse verifiche Android, in più permessi notifiche e riapertura dal tocco della notifica |
| iPad | Non supportato nell'MVP | Nessuna matrice di collaudo prevista finché `supportsTablet` rimane `false` |

Prima del beta chiudere la matrice su almeno un dispositivo fisico per piattaforma. Verificare dati dopo riapertura, azioni autorizzate per ruolo e comportamento con sessione scaduta. Expo Go non sostituisce una build nativa quando si verificano notifiche e permessi di sistema.

## Checklist store

- [ ] Account Apple Developer e Google Play Console del titolare; identificativi di team e package verificati.
- [x] Progetto Expo reale collegato.
- [ ] Ambiente EAS compilato senza segreti client.
- [ ] Firma iOS/Android, APNs e FCM configurati e conservati negli account del titolare.
- [ ] Beta Android e iOS installata e verificata sulla matrice sopra; difetti bloccanti chiusi.
- [ ] Informativa privacy accessibile, contatto assistenza, istruzioni di cancellazione account e gestione segnalazioni operativi.
- [ ] Screenshot, descrizione, classificazione età, schede privacy e credenziali account review pronte.
- [ ] Requisiti Google Play applicabili all'account completati; distribuzione e rollout approvati dal titolare.
- [ ] Endpoint di dispatch protetto da `CRON_SECRET` schedulato ogni cinque minuti tramite Supabase Cron dopo deploy e verifica del segreto.
