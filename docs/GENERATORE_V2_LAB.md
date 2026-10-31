# Generatore V2 del Bardo

Percorso: `/generator-v2`, riservato a GM e Admin. Il generatore attuale include un collegamento al laboratorio e, dopo aver generato un Bardo, il pulsante **Genera scheda V2**. Lo stesso pulsante è presente nel laboratorio. Nessun salvataggio V2 automatico sui personaggi.

## Flusso

Il modulo condiviso `generator-client.tsx` conserva il flusso originale: dati, anteprima e conferma delle scelte, generazione. L’esportazione tradizionale e il suo endpoint restano invariati. La V2 conserva una copia degli input confermati e li invia a `/api/sheet-pdf-v2`; il server autentica nuovamente l’utente, valida la richiesta e rigenera i dati mediante `generateSheetAction`. Il client non può inviare testi di regole, statistiche o PDF arbitrari.

Perimetro: Bardo, livelli 1–20, otto collegi nei quattro manuali locali (PHB, Xanathar, Tasha e Van Richten), comprese le scelte manuali già disponibili nel generatore. Dal livello 3 la Sapienza espone tre competenze aggiuntive, distinte da quelle già possedute. Factotum (abilità non competenti, iniziativa e percezione passiva) e le competenze del Valore vengono applicati nella sola preparazione V2, su una copia dei dati: nessun cambiamento al motore condiviso.

## Documento

La prima pagina usa componenti vettoriali fantasy, logo in alto a sinistra, risorse del Bardo, caratteristiche, salvezze, attacchi, PF e contatori da segnare a matita. Le capacità sono estratti del manuale, selezionati per livello con una mappa esplicita dei privilegi PHB. I paragrafi di sblocco futuro separati vengono esclusi; le progressioni contenute nelle regole restano fedeli al testo originale.

Le pagine successive contengono capacità che non entrano davanti, identità, linguaggi, competenze, tratti razziali, inventario e background. La tabella incantesimi mantiene le colonne livello, nome, componenti, rituale/concentrazione ed effetto. Il testo completo dal manuale prosegue su più righe e pagine con indicazione di continuazione. La storia viene inclusa solo quando richiesta; il manuale rapido conserva l’opzione torneo.

Il numero di pagina degli incantesimi dipende dalle continuazioni: la struttura della vecchia terza pagina è mantenuta, non la posizione fisica. Nessun PDF compilabile o servizio AI viene impiegato nell’impaginazione. Se manca il testo del manuale di una capacità essenziale o di un incantesimo, l’esportazione segnala il problema.

## Verifica

- `npm run test:sheet-generator`: 114 test, inclusi confini dei livelli e dadi, filtro privilegi, Factotum, competenze Sapienza, dati originali invariati e impaginazione di testi lunghi ai livelli 1, 5 e 20.
- `npx playwright test --config=playwright.sheet-v2.config.ts`: flusso delle scelte e download del PDF, V1 disponibile, desktop/mobile senza overflow, rifiuto di richieste anonime e di payload arbitrari.
- L’integrazione browser usa un backend di autenticazione fittizio esclusivamente locale (`test-server.cjs`), con il vero modulo, le vere azioni e il vero endpoint PDF. I ruoli degli utenti reali non vengono modificati. Gli account QA salvati come GM/Admin risultavano entrambi player: il controllo accessi reale ha correttamente rifiutato quelle sessioni.
- TypeScript, lint e build di produzione; controllo visivo del documento scaricato.

Le altre dodici classi rimangono fuori dal primo test concordato.

## Revisione prima pagina (31 ottobre 2026)

L’header ripetuto contiene logo a sinistra e tabella con nome, razza/sottorazza, background, allineamento, emblema vettoriale del Bardo, classe, sottoclasse e livello. I blocchi delle caratteristiche mostrano valore piccolo sopra il modificatore grande; salvezza e abilità sono affiancate a destra.

La colonna destra usa la trascrizione fissa di `Bardo 5e V1.4.pdf`, pagina 1, fornito dall’utente: Ispirazione Bardica (con aggiunta di recupero dal livello 5), Canto di Riposo, Maestria, Controfascino, Segreti Magici e Ispirazione Superiore. La provenienza è esplicita in `bard-reference-copy.ts` e nel piè di pagina. Il testo non viene riassunto da AI. Per richiesta esplicita dell’utente, la sola ultima frase di Controfascino è corretta secondo il manuale: interromperlo volontariamente non richiede un’azione.

I testi integrali del manuale, inclusi privilegi di sottoclasse e opzioni selezionate, restano nelle pagine successive. Le capacità sono filtrate per livello e i valori numerici restano calcolati dal motore, separati dai testi del riferimento.

## Tutti i collegi dei manuali locali

- Manuale del Giocatore: Sapienza e Valore.
- Xanathar: Sussurri, Incanto e Spade.
- Tasha: Eloquenza e Creazione.
- Van Richten: Spiriti (aggiunto al catalogo condiviso, con fonte già presente nel sito).

Il server V2 carica il testo completo della sezione del collegio tramite il resolver dei manuali esistente. `bard-colleges.ts` identifica i confini dei privilegi e i livelli di sblocco (3/6/14). Non usa la sintesi legacy delle sottoclassi: i titoli spezzati di Tasha provocavano la perdita di Parole Inquietanti e Linguaggio Universale. Nessuna modifica al filtro legacy condiviso.

I sotto-blocchi interni restano nel privilegio di appartenenza: per esempio, statistiche e azioni dell’Oggetto Danzante di Creazione e la tabella dei Racconti degli Spiriti. Un titolo o testo mancante provoca un errore esplicito, non una ricostruzione inventata. Ogni privilegio riporta il manuale e la sezione effettivamente usati.

Le Spade permettono di scegliere Duellare oppure Combattere con Due Armi. Il PDF riporta solo lo stile scelto con il suo testo sorgente; le condizioni di utilizzo si leggono nella regola (il modello attuale non rappresenta quali armi si impugnano contemporaneamente). Le competenze in armature medie e scimitarra sono aggiunte solo nella preparazione V2.

Spiriti aggiunge Guida senza consumare una scelta di trucchetto. Il testo viene dal PHB e la gittata di 18 metri viene estratta da Sussurri Guida in Van Richten. I dati del generatore condiviso restano invariati.

Verifica estesa: 114 test del generatore; otto collegi ai livelli 2/3/6/14; test specifici per intestazioni Tasha, tabelle Van Richten, statistiche di Creazione, entrambi gli stili, fonti mancanti e PDF di ogni collegio. Tre test browser locali includono download di tutti gli otto collegi e dei due stili delle Spade.
