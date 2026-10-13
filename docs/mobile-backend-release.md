# Backend beta mobile: rilascio da approvare

Preparazione verificata il 13 ottobre 2026. Nessuna modifica al sito o al database di produzione è stata applicata.

## Destinazioni verificate

- Vercel: progetto `barberanddragons.com`, ID `prj_VWIycW1AAAEpC6r5ApySXmp9yCW6`, team `team_U5mIM0YyqRgF8Xz51STyBFFH`. Produzione corrente READY: `dpl_FUBsYTn5HwgGWKkbtvfdLjcwwqHn`.
- Supabase: `dnd-campaign-manager`, ID `wgygueccztselxysletl`, PostgreSQL 17.6. Schema delle tabelle necessarie verificato in sola lettura. Nessuna delle nuove tabelle mobile è già presente.
- Expo: `@alexiit33/barber-and-dragons-mobile`. Firebase Android e FCM V1 già collegati; build APK ancora da generare.

## Cosa cambia in produzione

- Endpoint autenticati per salvataggi operativi della scheda, registrazione/rimozione dispositivi e richiesta di cancellazione.
- Endpoint riservato al dispatcher per inviare notifiche Expo.
- Pagine privacy, assistenza e richiesta cancellazione.
- Cinque tabelle nuove: dispositivi, coda push, richieste cancellazione, blocchi e segnalazioni.
- Due trigger accodano notifiche in seguito a sussurri e modifiche delle sessioni. Non inviano direttamente messaggi.
- La policy INSERT dei sussurri mantiene la relazione con il GM della campagna e aggiunge il controllo dei blocchi reciproci. Questo controllo vale anche per invii dal sito, non soltanto dall'app.
- Nessuna cancellazione automatica di account, personaggi, campagne o messaggi. Richieste e segnalazioni restano da gestire manualmente.

## Verifiche completate

- Build web completa di produzione e controllo TypeScript globale superati.
- 141 test superati: 29 mobile/policy, 101 Sheet Generator, 11 Wiki/M6.
- Due migrazioni eseguite su PGlite con verifiche di autorizzazione, trigger, coda e deduplicazione.
- Schema reale e policy sussurri confrontati in sola lettura; permessi delle nuove tabelle espliciti anche con i nuovi default Supabase.
- Chiave privata Firebase fuori repository. Il file google-services pubblico corrisponde al package dell'app.
- Nessuna prova autenticata delle nuove funzioni in produzione; nessuna consegna push reale ancora verificata.

## Ordine operativo proposto

1. Salvare il rilascio in Git includendo solo i file mobile/backend, le fixture necessarie alla compilazione e questa documentazione. Escludere `artifacts/`, `output/` e l'audit Eldaria preesistente.
2. Generare un segreto casuale per il dispatcher e configurarlo come `CRON_SECRET` in Vercel produzione, senza stamparlo o inserirlo in Git. Preparare poi una build Vercel con ambiente produzione senza assegnare subito i domini; verificarne pagine ed endpoint senza scritture. Il segreto deve esistere prima della build, perché la configurazione ambiente è legata al deployment.
3. Applicare esclusivamente `20261013180754_mobile_push_notifications.sql` e `20261013181537_mobile_account_and_whisper_safety.sql`, in questo ordine, tramite migrazioni mirate. Non usare un push indiscriminato di tutte le migrazioni locali: lo storico remoto usa alcuni timestamp differenti.
4. Rileggere tabelle, grant, policy, trigger e RPC appena creati; controllare gli advisor. Non creare dati fittizi in campagne reali per la verifica.
5. Conservare lo stesso segreto in Supabase Vault con nome `mobile_push_cron_secret`, verificarne la presenza senza leggere il valore e mantenere il dispatcher non schedulato fino alla promozione della build.
6. Promuovere la build verificata e rileggere pagine/endpoint sul dominio pubblico. Fare le eventuali prove autenticate su un account/campagna di collaudo concordati.
7. Attivare `scripts/mobile-push-scheduler.sql`: abilita pg_cron e pg_net (disponibili ma non installati), poi chiama il dispatcher ogni cinque minuti. Verificare risposte HTTP e coda. Supabase documenta questa combinazione con Vault: https://supabase.com/docs/guides/functions/schedule-functions .
8. Configurare solo URL/chiave pubblica Supabase e URL del sito nell'ambiente EAS, preparare la firma Android e generare l'APK preview. Testare consegna push e salvataggi su telefono.

## Arresto e recupero

- Sospendere gli invii con `SELECT cron.unschedule('mobile-push-dispatch');`.
- Ripristinare il precedente deployment Vercel se il sito presenta regressioni; verificare nuovamente l'assegnazione dei domini.
- Lasciare le nuove tabelle per conservare richieste e registrazioni. Non proporre un rollback distruttivo dopo l'arrivo di dati reali.
- Se i nuovi trigger bloccano scritture esistenti, rimuovere soltanto `mobile_whisper_push` e `mobile_session_push`, conservando la coda e investigando l'errore. I trigger, come gli altri trigger PostgreSQL, partecipano alla transazione che li attiva.

La conferma richiesta riguarda modifiche esterne al sito/database e l'attivazione degli invii automatici. Non include pubblicazione sugli store, acquisto di piani o completamento legale della privacy.
