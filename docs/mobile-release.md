# Release mobile Android e iOS

Stato: progetto Expo `@alexiit33/barber-and-dragons-mobile` collegato (ID `20cc1c5a-482a-49fd-bf41-cb5f86592eb7`). Firebase Android/FCM V1, firma Android e ambiente preview configurati. Build APK cloud completata con successo: `962faf0b-7568-400d-9613-8b73288d259b`. Backend e scheduler distribuiti dopo approvazione. Nessuna pubblicazione store.

## Configurazione presente

- Expo SDK 58, React Native 0.88, identificatore `com.barberanddragons.mobile`.
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

### Accesso con Google su sito e app

Prima di distribuire i pulsanti, applicare la migrazione `20261124091306_restrict_social_signup.sql` e attivare `public.hook_restrict_social_signup` come **Before User Created** in Supabase Auth Hooks. Il controllo consente di usare Google con l’email verificata di un account esistente e mantiene la registrazione dei nuovi utenti nel flusso email del sito, che richiede la data di nascita.

In Supabase Auth → URL Configuration, autorizzare `com.barberanddragons.mobile://auth/callback` come URL di reindirizzamento aggiuntivo. Il sito usa `https://barberanddragons.com/auth/callback/google` con un eventuale parametro `next` per tornare alla pagina richiesta. Se `https://barberanddragons.com` è il Site URL di Supabase, i reindirizzamenti su quell’origine sono già consentiti. [Documentazione Supabase](https://supabase.com/docs/guides/auth/redirect-urls)

Ricompilare i client iOS e Android per includere lo schema di reindirizzamento e le dipendenze native. Provare l’accesso con un account esistente, l’annullamento e il tentativo con un account Google mai registrato. Su iOS il pulsante Google viene mostrato quando è disponibile anche l’accesso con Apple.

### Accesso con Apple su iOS

1. Abilitare **Sign in with Apple** sull’App ID `com.barberanddragons.mobile` in Apple Developer e aggiornare il profilo di provisioning iOS. Conservare lo stesso App ID per build e backend.
2. In Supabase confermare che il provider Apple accetti l’audience nativa `com.barberanddragons.mobile` e abilitare **Allow manual linking**. Verificare che l’hook **Before User Created** indicato sopra sia attivo per mantenere la registrazione con verifica dell’età. [Configurazione Apple in Supabase](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple) · [Collegamento identità](https://supabase.com/docs/guides/auth/auth-identity-linking)
3. Configurare sul server `APPLE_SIGNIN_TEAM_ID`, `APPLE_SIGNIN_KEY_ID`, `APPLE_SIGNIN_PRIVATE_KEY` (contenuto della chiave Apple Sign in with Apple `.p8`) e `APPLE_SIGNIN_TOKEN_KEY` (32 byte casuali codificati in base64url). Conservare la chiave di cifratura finché esistono token cifrati con quella chiave.
4. Applicare `20261124205433_apple_signin_token_revocation.sql`, distribuire il backend e verificare che `GET /api/mobile/apple-sign-in` restituisca `enabled: true`. La risposta conferma la presenza di chiavi e tabelle. Lo scambio con Apple si verifica con una build firmata.
5. Su un iPhone testare accesso con l’email verificata dell’account, collegamento da **Account** con «Nascondi la mia email», riaccesso allo stesso profilo, annullamento e tentativo con un Apple ID privo di account associato. Poi eliminare un account di prova dall’admin, controllare esito della revoca Apple, email di conferma e accesso successivo. Nelle note per la review fornire un profilo di prova e le istruzioni per collegarlo. [Revoca Apple](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple)

### Accesso con Apple sul sito e su Android

- Registrare in Apple Developer un **Services ID** associato all’App ID iOS. Autorizzare il dominio Supabase e il suo callback HTTPS `/auth/v1/callback`. In Supabase inserire prima il Services ID, poi `com.barberanddragons.mobile`, e impostare il client secret del Services ID. [Configurazione OAuth Apple](https://supabase.com/docs/guides/auth/social-sign-in/auth-apple)
- Su Vercel impostare `APPLE_SIGNIN_WEB_CLIENT_ID` al Services ID, mantenendo le chiavi server Apple già usate da iOS. Applicare la migrazione `apple_web_signin_revocation` prima del deploy. Il sito e Android usano il Services ID. iOS mantiene il login nativo e l’App ID. La procedura di cancellazione revoca entrambe le autorizzazioni quando presenti.
- Verificare il redirect ad Apple e il ritorno allo stesso account su web, iOS e Android. Gli utenti con «Nascondi la mia email» possono collegare Apple da Account nell’app iOS.

Usare l’[inventario privacy mobile](privacy-account-owner-inputs.md#inventario-per-le-schede-privacy-degli-store) per preparare le dichiarazioni store della build candidata.


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
- [x] Ambiente EAS configurato con sole variabili pubbliche client.
- [ ] Firma iOS/Android, APNs e FCM configurati e conservati negli account del titolare.
- [ ] Beta Android e iOS installata e verificata sulla matrice sopra; difetti bloccanti chiusi.
- [ ] Informativa privacy accessibile, contatto assistenza, istruzioni di cancellazione account e gestione segnalazioni operativi.
- [ ] Screenshot, descrizione, classificazione età, schede privacy e credenziali account review pronte.
- [ ] Requisiti Google Play applicabili all'account completati; distribuzione e rollout approvati dal titolare.
- [ ] Endpoint di dispatch protetto da `CRON_SECRET` schedulato ogni cinque minuti tramite Supabase Cron dopo deploy e verifica del segreto.

## Beta Android disponibile — 13 ottobre 2026

Build Expo completata: https://expo.dev/accounts/alexiit33/projects/barber-and-dragons-mobile/builds/962faf0b-7568-400d-9613-8b73288d259b

APK versione 1.0.0, distribuzione interna. Installazione e verifica su telefono ancora da eseguire; compilazione riuscita non prova login, salvataggi o consegna push sul dispositivo.
