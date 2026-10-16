# Push-to-talk app → GM Screen: audit tecnico

Data: 16 ottobre 2026. Audit e piano aggiornati dopo l’implementazione locale. Nessuna migrazione live o prova con dati reali.

## Stato implementazione

Flusso MVP implementato nel checkout: PTT nativo Android, testo modificabile, trasporto sul pairing QR esistente, proposta PC revisionabile e conferma atomica da telefono o GM Screen. L’app invia solo testo; il PC mantiene parser, contesto e transizione autorevoli. La modalità IA è opzionale e parte soltanto dopo la scelta esplicita “Chiedi IA” sul telefono, usando la sessione GM del PC.

La prima versione supporta le sessioni Long. Un focus torneo (`match_id`) viene rifiutato esplicitamente. Ambiguità o dati mancanti richiedono la correzione del testo e una nuova analisi; il telefono non può completare o inventare dati di regola. La risposta HTTP del trasporto resta “accodata”; lo stato “Applicato” appare solo dalla ricevuta nello snapshot pubblicato dopo la transizione PC.

La coordinazione request/proposta/ricevuta è separata dalla firma dello stato di combattimento. Il provider Long resta autorità anche se il tracker non è montato; tutte le mutazioni passano da un commit sincrono condiviso con la ref corrente. Cambio campagna/sessione/pairing, firma stale, identificatore riusato con contenuto diverso e doppia conferma sono rifiutati o deduplicati. Le risposte IA tardive non possono ripubblicare proposte dopo il cambio contesto.

## Raccomandazione

Usare il riconoscimento vocale nativo del telefono, inviare soltanto la trascrizione tramite il telecomando già abbinato con QR e far interpretare/applicare il comando al PC. Il PC rimane autorità sul combattimento. Conferma della proposta possibile dal telefono o dal PC, con un solo esito condiviso.

Prima consegna su Android. Niente nuovo servizio di trascrizione, registrazione persistente dell'audio, ascolto ambientale o nuovo database.

## Riscontri attuali

- `mobile/package.json`: Expo ~57.0.28, React Native 0.86.3; manca un modulo speech-to-text.
- `mobile/src/contexts/GmLiveContext.tsx`: pairing persistente, verifica della campagna, stato online, polling snapshot e invio tramite endpoint remoto esistono già.
- `mobile/src/screens/gm/GmCombatTrackerScreen.tsx`: controlli live del combattimento già collegati al PC; posizione naturale per il pulsante e la revisione del testo.
- `src/app/api/gm-remote/[publicId]/command/route.ts`: autentica il token di pairing, valida i payload iniziativa e inserisce il comando. La risposta `ok` prova accodamento, non esecuzione sul PC.
- `src/components/gm/gm-remote-command-bridge.tsx`: riceve INSERT realtime, deduplica i command_id e inoltra ai gestori del PC. Non gestisce ancora richieste di interpretazione o conferme di proposte.
- `src/lib/gm-remote/initiative-commands.ts`: snapshot con combattenti e stato, ma nessuna proposta tattica o ricevuta applicativa. Servono estensioni esplicite a tipi, validatori, serializzazione e firma.
- `src/lib/fight-mode/command-parser.ts` e `state-transitions.ts`: parser, validazione e applicazione atomica riutilizzabili sul PC; non duplicarli nell'app.
- La migrazione locale `20260515090000_gm_remote_control.sql` definisce `type TEXT`, `payload JSONB` e unicità `(session_public_id, command_id)`. Indica che non serve una nuova tabella per il trasporto; non costituisce verifica dello schema live.

## Flusso da implementare

1. Nel tracker mobile, premere e tenere premuto «Parla al GM Screen». Il primo utilizzo richiede autorizzazione microfono/riconoscimento.
2. Al rilascio fermare l'ascolto e attendere l'ultimo risultato; mostrare testo correggibile. Annullamento e uscita dalla schermata interrompono il riconoscimento.
3. «Invia al PC» spedisce testo, request_id stabile, riferimento alla sessione/scontro corrente e modalità locale/IA esplicitamente scelta. Nessun audio raggiunge il backend B&D.
4. Il PC genera una proposta con il parser esistente, senza mutare il combattimento. Se richiesto esplicitamente, l'IA usa la sessione GM del PC e il controllo sulla specifica campagna.
5. Lo snapshot remoto espone proposta sanitizzata, request_id, proposal_id, contesto scontro e stato: in elaborazione, da completare, pronta, applicata o rifiutata.
6. Telefono o PC risolvono bersagli/dati mancanti e mostrano tutte le operazioni effettive prima di confermare. Eventuali correzioni devono passare dalla stessa logica di validazione.
7. Conferma mobile invia proposal_id e selezione operazioni, senza affidare al telefono una riscrittura arbitraria delle regole. Il PC verifica firma corrente, autorizzazione del pairing, contesto e idempotenza, poi applica una sola transizione.
8. Il telefono mostra «Applicato» soltanto dopo ricevuta del PC; altrimenti mostra «In attesa del PC». Una proposta obsoleta richiede nuova analisi.

## Vincoli di affidabilità

- Legare proposta e ricevuta a campagna, sessione remota e scontro attivo. Un cambio sessione o focus torneo invalida la proposta precedente.
- Riutilizzare request_id nei retry di trasporto: oggi `sendCommand` crea sempre un nuovo UUID e non basta per distinguere un retry da un nuovo intento.
- Non applicare automaticamente comandi vocali arretrati al ritorno online. Il PC deve rifiutare contesti obsoleti e richieste scadute.
- Una sola proposta attiva per scontro è sufficiente per il primo rilascio. Conferma su PC e telefono concorrenti deve avere un solo vincitore, verificabile tramite proposal_id.
- Rifiutare payload sconosciuti, troppo lunghi o fuori contesto nell'endpoint prima di registrarli.
- Rispettare scadenza/revoca del pairing; non aggiungere credenziali IA nell'app.
- Non trasferire all'app l'intero stato interno o gli snapshot ricorsivi di annullamento per consentire la conferma: pubblicare solo ciò che serve alla revisione.
- PC chiuso, connessione persa o controlli non pronti: bloccare invio/conferma e conservare soltanto il testo modificabile.

## Dettatura e build

Il progetto `expo-speech-recognition` documenta supporto SDK 57/RN 0.86 e usa Android SpeechRecognizer/iOS SFSpeechRecognizer. Richiede plugin e nuova build nativa; l'APK attuale non contiene il modulo e Expo Go non prova questa integrazione.

La soluzione non aggiunge una tariffa STT per chiamata a carico del backend B&D. Il servizio vocale del sistema può richiedere rete e può elaborare audio tramite il fornitore del dispositivo: non promettere offline o audio sempre locale. L'interpretazione IA opzionale conserva i costi OpenRouter esistenti. Una build cloud può consumare quota EAS e non viene avviata da questo audit.

Fonti primarie consultate:
- https://github.com/jamsch/expo-speech-recognition#installation
- https://github.com/jamsch/expo-speech-recognition/releases

## Criteri di completamento

- Test protocollo: token/sessione scaduti, payload errato, request_id duplicato, proposta obsoleta, cambio scontro, doppia conferma PC/telefono e ricevuta rifiutata.
- Test motore: comandi ambigui e dati mancanti non modificano lo stato; conferma produce un'unica applicazione completa.
- Prova Android con build dedicata: permessi concessi/negati, rilascio mentre il permesso è aperto, risultati finali tardivi, cambio schermata/background e servizio vocale assente.
- Prova completa su campagna di test: dettatura → correzione testo → proposta PC → conferma telefono → aggiornamento PF/effetti → ricevuta mobile, anche con perdita di rete durante conferma.
- Separare report di codice/test, build APK, installazione e prova sul dispositivo. Nessuna di queste prove è stata eseguita durante l'audit.

## Verifiche locali e limiti

- TypeScript root e `mobile` superato; ESLint sui file web modificati superato.
- 66 test fight-mode + gm-remote superati, più 2 test hook native. La prova controller attraversa richiesta, parsing locale reale, conferme PC/telefono concorrenti, singola applicazione con PF temporanei/PF/danni ricevuti e ricevuta; verifica anche retry request, stato stale dopo mutation remota e invalidazione sessione con risposta IA tardiva. I test di parser esistenti coprono ambiguità, bersagli e dati mancanti.
- La configurazione Expo è stata risolta e il bundle Android locale esportato con Metro. Non è una build APK nativa.
- Il modulo `expo-speech-recognition` è pin `57.0.0` nel manifest e lockfile. La nuova build nativa è necessaria perché l’APK installato non contiene il modulo; build EAS, installazione e microfono Android non sono stati verificati. ADB/emulatore non sono disponibili in questo ambiente. La vecchia build resta avviabile e mostra un avviso con input testo funzionante.
- Non sono state eseguite prove browser autenticate, migrazioni o scritture Supabase live, chiamate IA pagate o test con dati reali di campagna.
