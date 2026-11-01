# Generatore V2: Bardo, Barbaro, Chierico, Artefice, Druido, Guerriero, Ladro, Mago, Monaco, Paladino e Ranger

Percorso: `/generator-v2`, riservato a GM e Admin. Il generatore attuale include un collegamento al laboratorio e, dopo aver generato un Bardo, un Barbaro o un Chierico, il pulsante **Genera scheda V2**. Lo stesso pulsante è presente nel laboratorio. Nessun salvataggio V2 automatico sui personaggi.

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

Le altre nove classi attendono i relativi riferimenti; la rifinitura grafica viene dopo l’integrazione del motore per tutte le classi.

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


## Barbaro (31 ottobre 2026)

Riferimento fornito: `/Users/alessandropetricciuolo/Downloads/schede/Barbaro 5e v14.pdf`, pagina 1. Trascrizione fissa in `barbarian-reference-copy.ts`; nessun ritaglio raster o generazione di testi a runtime. Correzioni approvate dall’utente: i benefici di Ira richiedono di non indossare un’armatura pesante; l’interruzione per inattività richiede sia l’assenza di attacchi sia l’assenza di danni subiti. La trascrizione PHB locale conteneva la stessa congiunzione errata: la correzione è applicata anche nell’appendice V2, senza modificare il manuale condiviso. Le condizioni di Ira Persistente e Ira Implacabile mantengono rispettivamente la durata massima di un minuto e l’eccezione della morte istantanea.

Sette cammini estratti integralmente dalle fonti locali:
- PHB: Berserker e Combattente Totemico.
- Xanathar: Guardiano Ancestrale, Araldo della Tempesta, Zelota.
- Tasha: Bestia e Magia Selvaggia.

Scelte esplicite nell’esportazione: animale totemico ai livelli 3, 6 e 14 (anche diversi); ambiente dell’Araldo; tipo di danni dello Zelota. Le scelte dinamiche della Bestia restano tutte disponibili nel testo. La tabella d8 di Magia Selvaggia è inclusa per intero nel privilegio. I titoli con refusi nella scansione locale sono conservati nelle mappe di estrazione per rendere verificabile la provenienza.

`barbarian-source.ts` legge la progressione di utilizzi e danni di Ira direttamente dalle venti righe della tabella PHB. I testi di classe e cammino vengono validati per nome e livello; una fonte mancante ferma l’esportazione. I rituali totemici e i due incantesimi di Consultare gli Spiriti sono aggiunti con testo completo e restrizioni del privilegio, senza creare o consumare slot. Non viene creata una pagina incantesimi vuota.

La preparazione V2 aggiunge Movimento Veloce dal livello 5 e Campione Primordiale al livello 20, aggiornando caratteristiche, modificatori, salvezze, Atletica, attacchi, PF e CA senza armatura. Rimane la convenzione PF già usata dal progetto: dado vita massimo per ogni livello. Il generatore non modella l’armatura indossata: la velocità e la CA seguono l’equipaggiamento base senza armatura, con le condizioni dei privilegi visibili nei testi. Ira non somma danni a ogni attacco automaticamente: il bonus condizionale è separato nel riquadro risorse.

Il renderer `character-sheet-v2.ts` è condiviso; `experimental-bard-sheet.ts` mantiene la compatibilità con i chiamanti del Bardo. I riquadri comuni, le continuazioni e la tabella incantesimi non sono duplicati per classe. Il Barbaro usa un emblema vettoriale ad ascia, Ira e combattimento nella colonna centrale. Impaginazione ancora provvisoria: testi completi nelle pagine seguenti, numero di pagine non ottimizzato.

Verifica di questa estensione: 120 test del generatore; tutti i sette cammini ai livelli 2/3/6/10/14/20; progressione Ira ai venti livelli; scelte totemiche e ambiente; incantesimi concessi e sorgenti immutabili; quattro test browser con download V1/V2, otto collegi e sette cammini, selezioni del Totemico e rifiuto di scelte incompatibili. L’autenticazione browser rimane simulata esclusivamente nel processo locale di test. Build e controllo visivo del PDF di prova.


## Chierico (31 ottobre 2026)

Riferimento: `/Users/alessandropetricciuolo/Downloads/schede/Chierico 5e v14.pdf`, prima pagina. Le altre pagine sono moduli vuoti per identità/dotazione, incantesimi ed equipaggiamento. La V2 conserva la tabella degli incantesimi già condivisa dalle altre classi. La prima pagina usa l’emblema vettoriale di un simbolo sacro generico, il contatore comune di Incanalare Divinità, la magia basata su Saggezza, gli incantesimi di dominio e il testo di un privilegio caratteristico del dominio. Le regole complete continuano nell’appendice.

Dodici domini dei tre manuali locali:
- PHB: Conoscenza, Guerra, Inganno, Luce, Natura, Tempesta, Vita.
- Xanathar: Forgia e Tomba.
- Tasha: Crepuscolo, Ordine, Pace.

Il dominio è richiesto dal livello 1 nella V2. `cleric-source.ts` valida la progressione PHB (slot e trucchetti), ricava gli utilizzi condivisi di Incanalare Divinità dalla tabella della classe e la soglia di Distruggere Non Morti dalla relativa tabella. Nessun contatore separato per ciascun effetto di Incanalare Divinità. Intervento Divino è disponibile dal livello 10, con successo automatico al livello 20. La descrizione compatta completa le omissioni del riferimento: durata fino a danni, divieto di reazioni/avvicinamento per Scacciare Non Morti; sette giorni di recupero se Intervento Divino riesce, riposo lungo altrimenti.

I privilegi di dominio sono blocchi nominati, con sblocco 1/2/6/8/17; le progressioni interne (per esempio Colpo Divino a livello 14) restano nel testo originale. Il titolo del Dominio dell’Ordine nella scansione Tasha è privo di marcatori Markdown: l’estrattore condiviso riconosce anche i soli titoli esatti del catalogo, senza includere il dominio seguente. I metadati dei privilegi di Tasha non vengono scambiati per il loro testo.

Gli incantesimi di dominio sono estratti dalle cinque righe della tabella di ogni dominio, sempre preparati e aggiuntivi al limite quotidiano. Se uno era già tra le scelte ordinarie del generatore, la V2 conserva quel dominio e completa la preparazione ordinaria dalla lista PHB del Chierico (rispettando il filtro combattimento quando la richiesta è torneo). I testi indicano le preparazioni integrate automaticamente; non viene rimossa una scelta manuale valida. I nomi di pagina/intestazione riconosciuti nella vecchia lista (`207`, `CAPITOLO 11 | INCANTESIMI`) sono esclusi come artefatti di scansione e i posti vengono riempiti con veri incantesimi. Nomi mancanti diversi da questi artefatti causano un errore esplicito.

La ricerca delle descrizioni è limitata al capitolo PHB «Descrizione degli Incantesimi»: evita il precedente omonimo dell’azione Aiuto. I metadati con i due formati di due punti grassetto sono normalizzati senza riscrivere il testo. Il refuso «bagliare lunare» della tabella Crepuscolo è collegato esplicitamente a «bagliore lunare». I nomi e livelli degli incantesimi vengono verificati contro la descrizione sorgente. Tutti i testi delle magie nella V2 del Chierico sono ricostruiti da questa fonte, senza riutilizzare riassunti legacy potenzialmente errati.

Altre concessioni: Luce aggiunge Luce se non già conosciuto; Tomba aggiunge Salvare i Morenti con gittata 9 metri e lancio come azione bonus da Cerchio di Mortalità; Natura permette di scegliere un trucchetto PHB da Druido aggiuntivo. Conoscenza permette due abilità con doppio bonus e due linguaggi distinti; Natura, Ordine e Pace permettono le competenze del dominio. I valori e la percezione passiva vengono aggiornati su una copia della scheda. Le armi della scheda usano il modificatore effettivo indicato nei danni (Forza o Destrezza), non il massimo fra i due.

Le competenze in armature pesanti, armi da guerra e strumenti da fabbro vengono aggiunte solo quando concesse dal dominio. Il carico base della V2 usa scaglie e scudo per i domini senza armature pesanti, cotta e scudo per gli altri. Anima della Forgia aggiunge il bonus permanente dal livello 6; Benedizione della Forgia resta una scelta quotidiana nel testo e non somma automaticamente un secondo +1 alla CA. Non è stato aggiunto un gestore di equipaggiamento indossato o di effetti temporanei. Restano le convenzioni del generatore originale per PF e velocità razziale di base. I privilegi opzionali di Tasha (come Colpi Benedetti in sostituzione del privilegio di livello 8) non vengono attivati implicitamente: questa integrazione riguarda classe PHB e domini dei supplementi.

Correzione locale documentata: il Santuario del Crepuscolo nella scansione Tasha dice erroneamente di infliggere una condizione affascinato/spaventato. Il testo V2 termina un effetto che causa tale condizione, e il chierico può scegliere di concedere il beneficio. Verifica sul testo ufficiale generato da D&D Beyond, sezione TCoE Twilight Sanctuary: https://www.dndbeyond.com/sheet-pdfs/f5psf6gmvn_142395168.pdf. Il manuale condiviso resta invariato.

Verifiche: 128 test del generatore, inclusi tutti i dodici domini ai livelli 1/2/6/8/14/17/20, progressioni PHB ai venti livelli, incantesimi sempre preparati, abilità/linguaggi, magie concesse e fonti mancanti. PDF di tutti i domini ai livelli 1 e 20. Cinque test browser locali comprendono scelte della Conoscenza, esportazione dei dodici domini e regressione Bardo/Barbaro. Build, TypeScript, lint e controllo visivo del documento di prova. Il documento è ancora esteso (16 pagine per la prova Vita livello 5): riduzione dell’ingombro e rifinitura grafica rimangono nella fase concordata dopo le classi.


## Artefice e correzione condivisa delle infusioni (31 ottobre 2026)

Riferimento fornito: `/Users/alessandropetricciuolo/Downloads/661729627-Scheda-D-D-Artefice-5e-editabile.pdf`. Le quattro pagine sono state ispezionate staticamente: prima pagina con privilegi e tabella infusioni, identità/inventario, incantesimi e sagoma equipaggiamento/sintonie. Il PDF di riferimento è compilabile e contiene JavaScript; viene letto come fonte visiva, senza eseguirlo. La nuova esportazione resta un PDF statico per la stampa.

Questa volta il cambiamento interessa anche il motore originale, come richiesto: `buildGeneratedCharacterSheet` applica la preparazione dell’Artefice dopo aver risolto i dati base. Le altre classi non passano in questa fase. Il renderer V2 riusa le statistiche già preparate e non applica i bonus una seconda volta. Sono disponibili Alchimista, Armaiolo, Artigliere e Fabbro da battaglia.

### Fonti e selezione

`artificer-source.ts` legge la progressione dalla tabella dell’Artefice in Tasha: infusioni conosciute (0/4/6/8/10/12), oggetti infusi (0/2/3/4/5/6), trucchetti e slot. Prerequisiti e sintonia delle quindici infusioni nominate vengono letti dalle loro descrizioni. Replicare un Oggetto Magico è rappresentata da 49 scelte specifiche, tratte dalle quattro tabelle di Tasha; le descrizioni sono risolte nella Dungeon Master locale, senza inventarle. Un testo mancante impedisce la scelta. Non sono inclusi automaticamente tutti gli altri oggetti comuni esterni alle tabelle.

La proposta automatica sceglie tutte le conoscenze previste e assegna oggetti fino alla capacità utilizzabile, con priorità diverse per il Fabbro da battaglia e le altre specializzazioni. Non viene dichiarata una build universalmente ottimale. Non vengono scelti implicitamente la gemma costosa dell’Omuncolo o gli oggetti replicati; restano selezionabili. I supporti generici (veste, bacchetta, stivali, elmo, anello) sono quelli della dotazione proposta: il generatore non tiene una contabilità monetaria o verifica il possesso dell’equipaggiamento reale in campagna. La gemma dell’Omuncolo è marcata come requisito da almeno 100 mo.

L’anteprima condivisa permette di modificare armatura, scudo, modello dell’Armaiolo, ogni infusione conosciuta e ogni abbinamento infusione-oggetto. Una conoscenza rimossa libera le sue assegnazioni; una nuova assegnazione libera eventuali altri usi della stessa infusione o dello stesso oggetto. Il server ricontrolla sempre livelli, compatibilità, unicità, capacità, sintonia e resistenza scelta. I due posti aggiuntivi dell’Armaiolo dal livello 9 sono utilizzabili solo per parti dell’armatura arcana. Le repliche di stivali possono usare gli stivali dell’armatura come supporto.

### Applicazione dei bonus

Gli stati sono distinti: usato dal PG, usato e in sintonia, portato non usato, portato e in sintonia, assegnato ad altri. Le infusioni conosciute ma non assegnate non producono bonus; quelle assegnate ad altri o non usate non modificano i valori del PG. Se serve sintonia, indossare l’oggetto da solo non basta. I limiti personali sono 3/4/5/6 ai livelli 1/10/14/18. Al livello 20 Anima dell’Artificio conta solo le sintonie effettive degli oggetti tracciati, anche se portati e non usati; non conta le conoscenze, gli oggetti senza sintonia o quelli assegnati ad altri. Gli altri oggetti magici preesistenti della campagna non sono acquisiti automaticamente dal generatore.

Sono applicati i bonus permanenti alle statistiche rappresentate nella scheda:
- Arma Migliorata, Arma Splendente, Ritorno dell’Arma e Colpo Ripetuto: tiro per colpire e danni della sola arma assegnata; il +2 di Arma Migliorata scatta dal livello 10.
- Difesa Migliorata: CA dell’armatura indossata o dello scudo impugnato, +2 dal livello 10. Scudo della Repulsione aggiunge il proprio +1 solo se impugnato e in sintonia. Le infusioni non si cumulano sullo stesso oggetto.
- Focus Arcano Migliorato: +1/+2 ai tiri per colpire con incantesimi quando impugnato, senza aumentare la CD.
- Fabbro da battaglia: Intelligenza disponibile per colpire/danni solo per armi magiche; l’arma ordinaria conserva Forza/Destrezza. Armaiolo: arma speciale del modello e incremento di velocità dell’Infiltrato; bonus di velocità e guanti dell’Armatura a Propulsione Arcana quando attiva.
- Repliche: i punteggi conferiti da Amuleto della Salute, Fascia dell’Intelletto, Guanti del Potere Orchesco e Cintura dei Giganti delle Colline sono ricavati dal testo/tabella della Dungeon Master. Si aggiornano modificatori, abilità, salvezze, PF secondo la convenzione massimizzata del progetto, attacchi, CD/attacco magico e limite di preparazione. Il punteggio non viene abbassato se era già superiore. Mantello e Anello di Protezione aggiornano CA/salvezze; Bracciali della Difesa solo senza armatura e scudo; Guanti Ladreschi aggiornano Rapidità di Mano. Velocità particolari e competenze degli altri oggetti vengono indicate con le loro condizioni.

Le proprietà a cariche, le attivazioni temporanee e i vantaggi condizionali restano nel testo e nelle note: nessun successo automatico permanente alla concentrazione, nessun +5 fisso all’iniziativa per il vantaggio e nessun raddoppio permanente da Stivali della Velocità. Bracciali dell’Arciere non aumentano i danni della balestra; Colpo Ripetuto non rende la balestra leggera utilizzabile a una mano. Il carico proposto distingue scudo impugnato/non impugnato; usare la balestra richiede comunque di riporlo. I bonus al focus o alle armi descrivono il loro uso nel rispettivo attacco, senza simulare automaticamente cambi di impugnatura e azioni in combattimento.

### Esportazione e testi

`GeneratedCharacterSheet.artificer` mantiene le conoscenze, gli abbinamenti, gli stati, le capacità e le fonti. `ArtificerInfusions` nel payload dei campi conserva i dati strutturati; inventario e privilegi PDF antepongono gli oggetti infusi. Il generatore precedente e quello incorporato allegano anche un’appendice completa delle infusioni, per evitare la perdita delle scelte nei campi corti del PDF compilabile. La V2 include quelle informazioni nelle proprie pagine di continuazione, senza duplicare l’appendice del percorso precedente.

Gli incantesimi della specializzazione sono sempre preparati e non consumano preparazioni ordinarie. Le preparazioni ordinarie liberate o aumentate da una caratteristica vengono completate dalla lista dell’Artefice. Le descrizioni esatte e il livello sono verificati in PHB, Xanathar e Tasha; il lettore gestisce intestazioni e metadati spezzati senza usare riassunti generati. L’Artefice richiede il focus degli Strumenti Necessari anche quando il singolo incantesimo non ha M nella descrizione generica: la tabella lo segnala, mantenendo i requisiti di materiali costosi/consumati. I trucchetti ora passano a tre dal livello 10 e quattro dal livello 14 anche nel motore condiviso.

L’estrazione conserva statistiche e azioni di Cannone Occulto, Difensore d’Acciaio e Servo Omuncolo, e l’intera tabella degli Elisir. Le tabelle future degli incantesimi della specializzazione sono separate dai privilegi, evitando di stamparle dentro il primo privilegio di livello 3. Il cambio di modello dell’armatura è selezionabile; gli usi quotidiani e le reazioni dei privilegi sono documentati, senza attivarli automaticamente.

Correzioni esplicite di trascrizione, senza modificare i manuali condivisi: nomi delle repliche con OCR errato (per esempio «Amuieto», «Broccoli», «malleggiati»), nomi delle magie delle specializzazioni («oura», «trama iprotica», «raggia», ecc.) e titolo «LENZA ELETTRZANTE» collegato alla voce corretta della lista. La formula PF del Difensore corregge l’uguale in più, secondo l’errata ufficiale Wizards: https://media.wizards.com/2020/dnd/downloads/ERftLW-Errata.pdf; il modificatore di INT 4 è -3. In Maestria nella Chimica «cara ferita» è corretto in Guarigione, verificato nel testo TCoE esportato da D&D Beyond nel campione https://d1vzi28wh99zvq.cloudfront.net/pdf_previews/362765-sample.pdf (Chemical Mastery). La scheda di riferimento viene completata con i minimi previsti dal manuale e la durata di sei secondi del messaggio di Invenzione Magica.

Verifiche: 137 test complessivi, inclusi i venti livelli per tutte le quattro specializzazioni e la classe base; assegnazione di tutte le 64 opzioni; incompatibilità, cumuli e limiti; oggetti non usati/di altri; sintonie; bonus a livello 10, caratteristiche delle repliche, Fabbro e Armaiolo. PDF di tutte le specializzazioni ai livelli 1/3/9/20. Sei prove browser locali comprendono modifica delle conoscenze e delle assegnazioni, il percorso precedente e la V2, esportazione delle quattro specializzazioni e rifiuto di input incompatibili. Nessun ruolo di un account reale viene cambiato. TypeScript, lint e build; controllo visivo delle pagine del PDF di prova. La grafica resta provvisoria e il documento contiene ancora molte pagine di regole.

## Druido (1 novembre 2026)

Il riferimento `/Users/alessandropetricciuolo/Downloads/schede/Druido 5e v14.pdf` è una scansione di quattro pagine; la prima pagina è stata renderizzata a piena risoluzione e controllata visivamente. Il motore V2 legge i privilegi di classe e le progressioni di trucchetti e slot dal PHB, e importa i privilegi integrali da tutti i sette circoli locali: Terra e Luna (PHB), Sogni e Pastore (Xanathar), Fiamma, Spore e Stelle (Tasha).

Il Circolo della Terra consente di scegliere terreno e trucchetto bonus, carica gli incantesimi del terreno sempre preparati e senza consumare il limite. Fiamma e Spore caricano le rispettive liste sempre preparate; Spore aggiunge Tocco Gelido; Stelle aggiunge Guida e Dardo Tracciante. Le descrizioni sono risolte nei manuali locali e una fonte mancante interrompe l’esportazione. La scansione Tasha di Profezia Cosmica attribuisce per errore un bonus anche a Sventura: il testo V2 corregge la direzione del d6 (sottrarre), lasciando invariato il manuale condiviso.

Forma Selvatica riporta usi, riposo, durata, limiti correnti di GS e movimento, ritorno alla forma normale e conversione dei PF. Le schede delle bestie non vengono generate né collegate automaticamente. Il Circolo della Luna mostra il GS effettivo e i privilegi disponibili; Incantesimi Bestiali consente il lancio in forma bestiale dal livello 18. Nessuna modifica al generatore V1. La grafica V2 resta provvisoria.

Verifica: nove test mirati Druido per circoli, livelli di sblocco, magie duplicate, livello 1 e ambienti; suite completa del generatore (146 test) e TypeScript. Sette prove browser V2 passano, inclusi scelta del terreno, trucchetto bonus, download PDF e rifiuto di una scelta incompatibile. PDF Druido del Circolo della Terra al livello 5 scaricato dal flusso browser (18 pagine) e controllato visivamente alle pagine 1, 2 e 18. Verificate tutte le sette sottoclassi, le soglie d'incantesimo e tutte le otto scelte di terreno.

## Guerriero (1 novembre 2026)

Riferimento fornito: `Guerriero_5e_v14.pdf`, scansione di 4 pagine. Prima pagina ispezionata: colonna sinistra con Stile di Combattimento e Recuperare Energie; colonna centrale con Azione Impetuosa, Attacco Extra, Indomito e riquadri risorse (Azione Impetuosa, Indomito, Risorsa di Archetipo, Trucchetti/Slot); colonna destra con privilegi di classe e archetipo. Testo fisso fedele al riferimento trascritto in `fighter-reference-copy.ts`.

Otto archetipi marziali estratti dai manuali locali:
- PHB: Campione, Maestro di Battaglia, Cavaliere Mistico.
- Xanathar: Arciere Arcano, Cavaliere, Samurai.
- Tasha: Guerriero Psionico, Cavaliere delle Rune.

Meccaniche, opzioni e calcoli integrati:
- Stile di Combattimento: selezione stile (Tiro, Difesa, Duellare, Combattere con Grandi Armi, Protezione, Combattere con Due Armi); il Campione seleziona un secondo stile al livello 10.
- Risorse e tracciatori con caselle spuntabili: Recuperare Energie (1d10 + livello, 1/riposo breve o lungo), Azione Impetuosa (1 uso ai liv. 2-16, 2 usi dal liv. 17), Indomito (1 uso ai liv. 9-12, 2 usi ai liv. 13-16, 3 usi dal liv. 17), Attacco Extra (2 attacchi al liv. 5, 3 attacchi al liv. 11, 4 attacchi al liv. 20).
- Risorse di Archetipo dedicate: Dadi Superiorità e Manovre (Maestro di Battaglia), Frecce Arcane (Arciere Arcano), Spirito Guerriero (Samurai), Marchio Temerario (Cavaliere), Dadi Energia Psionica (Guerriero Psionico), Uso Rune (Cavaliere delle Rune), Slot Incantesimi (Cavaliere Mistico).
- Calcoli e competenze applicati sulla copia V2 della scheda (`fighter-print-model.ts`):
  - Campione: Atleta Straordinario (+ceil(bonus_competenza/2) arrotondato per eccesso a Iniziativa e prove di Forza/Destrezza/Costituzione senza competenza).
  - Samurai: Cortigiano Elegante (somma modificatore Saggezza alle prove di Carisma [Persuasione], conferisce competenza nei tiri salvezza su Saggezza o a scelta Intelligenza/Carisma se già competente). Competenze bonus selezionabili tra Storia, Intuizione, Intrattenere, Persuasione o un linguaggio.
  - Arciere Arcano: Tiro Arcano, selezione trucchetto bonus tra Prestidigitazione e Artificio Druidico, competenza bonus tra Arcano e Natura.
  - Cavaliere: Nato per la Sella, competenza bonus selezionabile (tra le abilità sociali o un linguaggio).
  - Cavaliere delle Rune: Competenza strumenti da fabbro e Gigante.
  - Cavaliere Mistico: progressione slot da un terzo di incantatore, CD e tiro per colpire basati su Intelligenza.
  - Guerriero Psionico: Dadi Energia Psionica crescenti (d6 a d12, 2x competenza), con concessione dell'incantesimo Telecinesi al livello 18 senza slot.
- Risoluzione fonti manuali locali:
  - PHB capitolo Guerriero sezionato usando il marcatore `## ARCHETIPI MARZIALI` per evitare la perdita di testo dovuta alla doppia intestazione `# GUERRIERO`.
  - Tasha: arresto dell'estrazione per Guerriero Psionico su `# GUIDE PER IL MAESTRO DI BATTAGLIA` per isolare il privilegio di livello 18.
- Verifica e test:
  - 159 test unitari e di integrazione superati (`npm run test:sheet-generator`), inclusi tutti gli 8 archetipi a vari livelli, progressioni risorse, bonus Atleta Straordinario, Cortigiano Elegante, incantesimi concessi e generazione PDF.
  - 8 test browser end-to-end con Playwright (`playwright.sheet-v2.config.ts`) superati: download Guerriero V2, selezione opzioni, tutti gli 8 archetipi e rifiuto scelte incompatibili.
  - Lint e build Next.js di produzione riusciti senza errori.
  - Campione PDF generato e controllato visivamente: `output/pdf/guerriero-v2-test.pdf`.

## Ladro (1 novembre 2026)

Riferimento fornito: `Ladro 5e v14.pdf`, scansione di 4 pagine. Prima pagina ispezionata: colonna sinistra con caratteristiche e doppio indicatore per competenza e maestria; colonna centrale con grande riquadro dedicato ad Attacco Furtivo, risorse e magia di archetipo, e le regole essenziali per Attacco Furtivo e Gergo Ladresco; colonna destra con progressione dei privilegi di classe e archetipo. Testo fisso fedele trascritto in `rogue-reference-copy.ts`.

Nove archetipi ladreschi estratti integralmente dai manuali locali:
- PHB: Furfante, Assassino, Mistificatore Arcano.
- Xanathar: Esploratore, Indagatore, Pianificatore, Spadaccino.
- Tasha: Fantasma, Lama Spirituale.

Meccaniche, opzioni e calcoli integrati:
- Attacco Furtivo: progressione da 1d6 a 10d6 calcolata dal livello, presentata nel riquadro centrale della prima pagina con dadi e condizioni.
- Risorse di Archetipo dedicate:
  - Mistificatore Arcano: slot incantesimi da un terzo di incantatore, CD e tiro per colpire basati su Intelligenza, concessione automatica del trucchetto *Mano magica* invisibile.
  - Lama Spirituale: Dadi Energia Psionica crescenti da d6 a d12 (numero pari al doppio del bonus di competenza), recupero con riposo lungo o azione bonus, Lame Psichiche (1d6 danni psichici, 18m lancio, seconda lama azione bonus per 1d4).
  - Fantasma: Lamenti dalla Tomba con tracciatore di utilizzi (pari al bonus di competenza) e danno necrotico scalato (`ceil(sneakDice / 2)` d6), Pegni dei Defunti dal livello 9 (max bonus di competenza).
  - Indagatore: Combattimento Intuitivo, Orecchio per l'Inganno, Occhio per i Dettagli, Occhio Infallibile con utilizzi calcolati su Saggezza dal livello 13.
  - Spadaccino: Audacia del Fanfarone (somma del modificatore di Carisma all'iniziativa, Attacco Furtivo in duello 1v1 senza vantaggio), Gioco di Gambe per evitare attacchi di opportunità.
  - Esploratore: Schermagliatore per movimento rapido in reazione.
  - Pianificatore: Maestro di Tattiche (azione di Aiuto come azione bonus a distanza di 9 metri).
  - Furfante: Mani Veloci (uso di arnesi da scasso e oggetti con Azione Scaltra), Lavoro al Secondo Piano.
  - Assassino: Assassinare (vantaggio sui nemici che non hanno agito e colpo critico automatico su creature sorprese).
- Calcoli e competenze applicati sulla copia V2 della scheda (`rogue-print-model.ts`):
  - Esploratore: Survivalista conferisce competenza e maestria raddoppiata in Natura e Sopravvivenza (valori aggiornati a mod + 2 * prof); Mobilità Superiore incrementa la velocità base di 3 metri dal livello 9.
  - Spadaccino: Audacia del Fanfarone aggiunge permanentemente il modificatore di Carisma all'iniziativa.
  - Assassino: competenze bonus negli strumenti per camuffamento e sostanze da avvelenatore.
  - Pianificatore: competenze bonus in trucchi per il camuffamento, arnesi da falsario, un set di gioco a scelta e due linguaggi a scelta.
  - Base: Mente Sfuggente al livello 15+ conferisce competenza nei tiri salvezza su Saggezza.
  - Fantasma: Sussurri dei Morti permette di selezionare una competenza aggiuntiva temporanea.
- Risoluzione fonti manuali locali:
  - PHB capitolo Ladro sezionato tra `# LADRO` e `# ARCHETIPI LADRESCHI` per isolare tutti gli 11 privilegi di classe base.
  - Ripulita l'intestazione di Spadaccino in `character-subclass-catalog.ts` dal refuso `"SCHERMAGLIATORE"`, che causava un arresto prematuro dell'estrazione dell'archetipo Esploratore in Xanathar.
  - Aggiunta protezione `stops.delete(norm(title))` in `extractManualSubclassFeatures` per garantire che i privilegi attesi di un archetipo non fungano mai da stop per se stessi.
  - Tasha: verificato il titolo esatto del privilegio di 17° livello del Fantasma (`COMPAGNO DELLA MORTE`).
- Verifica e test:
  - 171 test unitari e di integrazione superati (`npm run test:sheet-generator`), inclusi tutti i 9 archetipi a livelli 1, 3, 5, 9, 11, 13, 15, 17, 20, progressione Attacco Furtivo, Survivalista, Audacia del Fanfarone, Mente Sfuggente, Dadi Psionici, Lamenti dalla Tomba e generazione PDF.
  - 9 test Playwright end-to-end (`playwright.sheet-v2.config.ts`) superati: download Ladro V2, opzioni, tutti i 9 archetipi e rifiuto payload incompatibili.
  - Lint e build di produzione completati senza errori.
  - Campione PDF generato e verificato: `output/pdf/ladro-v2-test.pdf`.

## Mago (1 novembre 2026)

Riferimento fornito: `Mago 5e.pdf`, scansione di 4 pagine. Prima pagina ispezionata: colonna sinistra con caratteristiche e salvezze (Intelligenza e Saggezza competenti); colonna centrale con difese, PF (dado vita d6), attacchi, CD e bonus attacco incantesimi basati su Intelligenza, tracciatore per Recupero Arcano e risorsa di tradizione, e slot incantesimi; colonna destra con progressione dei privilegi di classe (Recupero Arcano a livello 1, Maestria negli Incantesimi a livello 18, Incantesimi Personali a livello 20) e Tradizione Arcana. Testo fisso fedele trascritto in `wizard-reference-copy.ts`.

Undici tradizioni arcane estratte integralmente dai manuali locali:
- PHB: Scuola di Abiurazione, Scuola di Ammaliamento, Scuola di Divinazione, Scuola di Evocazione, Scuola di Illusione, Scuola di Invocazione, Scuola di Necromanzia, Scuola di Trasmutazione.
- Xanathar: Magia della Guerra.
- Tasha: Canto della Lama, Ordine degli Scribi.

Meccaniche, opzioni e calcoli integrati:
- Recupero Arcano: slot totali recuperabili = `Math.ceil(level / 2)` (max slot di 5° livello), calcolati da livello 1 con tracciatore a diamanti.
- Slot Incantesimi Full Caster: progressione completa dal 1° al 9° livello derivata dalla tabella HTML ufficiale del PHB.
- Incantesimi Preparabili e Trucchetti: preparabili = `Math.max(1, level + intMod)`, trucchetti = 3 al lv 1-3, 4 al lv 4-9, 5 al lv 10+.
- Risorse di Tradizione dedicate:
  - Scuola di Abiurazione: Interdizione Arcana con calcolo automatico dei PF massimi (`2 * level + intMod`) e ricarica con incantesimi di abiurazione.
  - Scuola di Divinazione: Portento con 2 dadi d20 per riposo lungo (3 dadi dal 14° livello con Portento Superiore).
  - Magia della Guerra: Ingegno Tattico al livello 2+ aggiunge permanentemente il modificatore di Intelligenza all'iniziativa; Impulso di Potere dal livello 6+ calcola cariche massime (`max(1, intMod)`) e danno da forza (`Math.floor(level / 2)`).
  - Canto della Lama: Arte della Guerra e del Canto al livello 2+ conferisce competenza nelle armature leggere, in un'arma da mischia a una mano a scelta (`BLADESINGER_WEAPONS`), e nell'abilità Intrattenere; Melodia della Lama traccia utilizzi pari al bonus di competenza, bonus CA (`max(1, intMod)`), velocità (+3m) e vantaggio ad Acrobazia.
  - Ordine degli Scribi: Mente Manifesta dal livello 6+ con tracciatore di utilizzi pari al bonus di competenza per lancio da spazio spettrale.
- Incantesimi concessi automaticamente dai manuali:
  - Scuola di Illusione: concede *Illusione Minore* al livello 2+ (Illusione Minore Migliorata).
  - Scuola di Necromanzia: aggiunge *Animare Morti* al livello 6+ (Servitori Non Morti).
- Risoluzione e allineamento fonti:
  - In `manuale_giocatore.md`, risolta un'anomalia di scansione OCR a due colonne tra la Scuola di Abiurazione e la Scuola di Ammaliamento: ripristinato l'ordine originale dei paragrafi (completamento di Sguardo Ipnotico e Fascino Istintivo sotto Ammaliamento; Abiurazione Migliorata e Resistenza agli Incantesimi sotto Abiurazione).
  - In `character-subclass-catalog.ts`, aggiunto l'alias `SCUOLA DI NEGROMANZIA` a fianco di `SCUOLA DI NECROMANZIA` per garantire la risoluzione robusta del capitolo PHB.
- Verifica e test:
  - 179 test unitari e di integrazione superati (`npm run test:sheet-generator`), inclusi tutte le 11 tradizioni a livelli 1, 2, 6, 10, 14, 18, 20, progressioni slot e trucchetti, Ingegno Tattico, Arte della Guerra e del Canto, incantesimi concessi e generazione PDF per ogni tradizione.
  - 10 test Playwright end-to-end (`playwright.sheet-v2.config.ts`) superati: download Mago V2 con Canto della Lama, opzioni armi, esportazione di tutte le 11 tradizioni e rifiuto scelte non valide.
  - Lint e build Next.js di produzione completati con successo.
  - Campione PDF generato e verificato: `output/pdf/mago-v2-test.pdf`.

## Monaco (1 novembre 2026)

Riferimento fornito: `Monaco 5e.pdf`, scansione di 4 pagine. Prima pagina ispezionata: colonna sinistra con caratteristiche e salvezze (Forza e Destrezza competenti); colonna centrale con CA Difesa Senza Armatura (`10 + DES + SAG`), velocità incrementata con Movimento Senza Armatura (`+3m` fino a `+9m` con superfici verticali e liquide dal lv 9), box dedicato a **Punti Ki e Arti Marziali** (con scudo fantasy per il dado di Arti Marziali, contatore a diamanti per i Punti Ki scalati da livello 2 a 20 con ricarica a riposo breve o lungo, CD tiri salvezza Ki) e box **Capacità del Ki e Movimento** (Raffica di Colpi, Difesa Paziente, Passo del Vento, Deviare Proiettili con riduzione `1d10 + DES + livello`, risorse di sottoclasse); colonna destra con progressione dei privilegi di classe di primo livello e successivi (Caduta Lenta lv 4, Attacco Extra lv 5, Colpo Stordente lv 5, Colpi Ki Potenziati lv 6, Elusione lv 7, Mente Lucida lv 7, Purezza del Corpo lv 10, Lingua del Sole e della Luna lv 13, Anima Adamantina lv 14, Corpo Senza Tempo lv 15, Corpo Vuoto lv 18, Perfezione Interiore lv 20). Trascrizione fissa fedele in `monk-reference-copy.ts`.

Tutte le otto Tradizioni Monastiche estratte integralmente dai manuali locali:
- PHB: Via della Mano Aperta, Via dell'Ombra, Via dei Quattro Elementi.
- Xanathar: Via del Kensei, Via del Maestro Ubriaco, Via dell'Anima Solare.
- Tasha: Via del Sé Astrale, Via della Misericordia.

Meccaniche, opzioni e calcoli integrati:
- Arti Marziali: dado scala da 1d4 (livello 1) a 1d6 (lv 5), 1d8 (lv 11), 1d10 (lv 17).
- Punti Ki: progressione da livello 2 (2 punti) fino a livello 20 (20 punti), con CD tiri salvezza Ki calcolata come `8 + competenza + mod SAG`. Tracciatore vettoriale scalabile fino a 20 diamanti.
- Movimento Senza Armatura: incremento di velocità (+3 m a lv 2, +4,5 m a lv 6, +6 m a lv 10, +7,5 m a lv 14, +9 m a lv 18), con nota automatica per il movimento lungo pareti verticali e liquidi a partire dal livello 9.
- Difesa Senza Armatura: CA aggiornata a `10 + DES mod + SAG mod` quando non indossa armature.
- Anima Adamantina: a partire dal livello 14 conferisce automaticamente competenza in TUTTI i sei tiri salvezza (Forza, Destrezza, Costituzione, Intelligenza, Saggezza, Carisma) con ricalcolo corretto dei bonus.
- Risorse e opzioni di sottoclasse dedicate:
  - Via del Kensei: selezione delle armi Kensei (una da mischia e una a distanza tra le opzioni regolamentari) che conferiscono competenza e contano come armi da monaco; competenze negli strumenti da calligrafo o da pittore.
  - Via del Maestro Ubriaco: competenza bonus nell'abilità Intrattenere e negli strumenti da birraio; Tecnica dell'Ubriaco (Disimpegno gratuito e +3m quando usa Raffica di Colpi).
  - Via della Misericordia: competenze bonus in Intuizione, Medicina e strumenti da erborista; Mano Guaritrice con dadi curativi calcolati (`dado + SAG mod`) e Mano del Dolore.
  - Via dell'Ombra: concessione automatica del trucchetto *Illusione Minore* al livello 3+.
  - Via del Sé Astrale: Braccia del Sé Astrale (danni da forza con dado marziale e portata 1,5m).
  - Via della Mano Aperta: Integrità del Corpo al livello 6+ con calcolo automatico dei PF curati (`3 * livello`).
- Risoluzione e robustezza dell'estrazione:
  - Normalizzazione avanzata degli apostrofi tipografici curvi/dritti in `monkTraditionFromLabel`.
  - Rimozione sicura dei sottotitoli descrittivi di terzo livello (es. `*Privilegio della Via del Sé Astrale di 3° livello*`) aggiornando i pattern di `manual-subclass-features.ts`.
- Verifica e test:
  - 187 test unitari e di integrazione superati (`npm run test:sheet-generator`), inclusi tutte le 8 tradizioni, livelli 1-20, progressione dado e movimento, Punti Ki e CD, Difesa Senza Armatura, Anima Adamantina e PDF di ogni tradizione.
  - 11 test Playwright end-to-end (`playwright.sheet-v2.config.ts`) superati: download Monaco V2 con Via del Kensei, opzioni armi, esportazione di tutte le 8 tradizioni, rifiuto scelte non valide e verifica layout mobile.
  - Build Next.js di produzione completata con successo.
  - Campione PDF generato e verificato: `output/pdf/monaco-v2-test.pdf`.

## Paladino (1 novembre 2026)

Riferimento fornito: `Paladino 5e v14.pdf`, scansione di 4 pagine. Prima pagina ispezionata: colonna sinistra con caratteristiche e salvezze (Saggezza e Carisma competenti); colonna centrale con CA, Iniziativa, Velocità, PF (dado vita d10), tabella attacchi a 3 righe, box dedicato a **Magia e Risorse Divine** (CD incantesimi, tiro per colpire, slot half-caster da 1° a 5° livello tracciati a diamanti, incantesimi preparabili e Stile di Combattimento) e box **Capacità del Paladino** (Imposizione delle Mani con riserva di 5 x livello PF, Percezione del Divino con 1 + mod CAR utilizzi per riposo lungo, Incanalare Divinità, Punizione Divina con danno scalato su slot, Aura di Protezione e Aura di Coraggio con raggio 3m/9m a lv 18, Punizione Divina Migliorata, Tocco Purificatore con mod CAR utilizzi, e risorse di sottoclasse); colonna destra con progressione dei privilegi di classe di primo livello e successivi (Stile di Combattimento lv 2, Punizione Divina lv 2, Salute Divina lv 3, Attacco Extra lv 5, Aura di Protezione lv 6, Aura di Coraggio lv 10, Punizione Divina Migliorata lv 11, Tocco Purificatore lv 14). Trascrizione fissa fedele in `paladin-reference-copy.ts`.

Tutti i sette Giuramenti Sacri estratti integralmente dai manuali locali:
- PHB: Giuramento di Devozione, Giuramento degli Antichi, Giuramento di Vendetta.
- Xanathar: Giuramento di Conquista, Giuramento di Redenzione.
- Tasha: Giuramento di Gloria, Giuramento delle Sentinelle.

Meccaniche, opzioni e calcoli integrati:
- Stile di Combattimento: opzione configurabile tra Combattere con Armi Possenti, Difesa, Duellare e Protezione; Difesa applica +1 permanente alla CA quando indossa un'armatura.
- Aura di Protezione (Livello 6+): aggiunge automaticamente il modificatore di Carisma (minimo +1) a TUTTI i sei tiri salvezza (Forza, Destrezza, Costituzione, Intelligenza, Saggezza, Carisma).
- Giuramento di Gloria - Aura di Alacrità (Livello 7+): incrementa la velocità base di 3 metri (+3 m).
- Slot Incantesimi e Preparazione: tabella half-caster completa da 1° a 5° livello con tracciatori vettoriali per gli slot disponibili; incantesimi preparabili calcolati come `Math.floor(level / 2) + mod CAR` (minimo 1), a cui si aggiungono gli incantesimi di giuramento sempre preparati.
- Incantesimi di Giuramento: risolti e caricati automaticamente per tutti i 7 giuramenti dai manuali locali in base al livello (3, 5, 9, 13, 17) senza consumare le scelte ordinarie.
- Emblema vettoriale: creato `drawPaladinEmblem` in `fantasy-sheet-graphics.ts` (scudo cavalleresco con spada radiosa e croce sacra).
- Risoluzione e robustezza dell'estrazione:
  - Mappati i titoli esatti delle fonti con gestione del refuso OCR di Tasha (`INGANALARE DIVINITÀ`).
  - Regex di rimozione sottotitoli in `manual-subclass-features.ts` estesa con `|Giuramento|Paladino|Giuramento Sacro`.
- Verifica e test:
  - 195 test unitari e di integrazione superati (`npm run test:sheet-generator`), inclusi tutti i 7 giuramenti, livelli 1-20, progressione slot, Aura di Protezione a tutti i TS, Aura di Alacrità, Stile di Combattimento e PDF di ogni giuramento.
  - 12 test Playwright end-to-end (`playwright.sheet-v2.config.ts`) superati: download Paladino V2 con Giuramento di Devozione, selezione stile, esportazione di tutti i 7 giuramenti, rifiuto scelte non valide e verifica layout mobile.
  - Build Next.js di produzione completata con successo.
  - Campione PDF generato e verificato: `output/pdf/paladino-v2-test.pdf`.

## Ranger (1 novembre 2026)

Riferimento fornito: `Ranger 5e v14.pdf`, scansione di 4 pagine. Prima pagina ispezionata: colonna sinistra con caratteristiche e salvezze (Forza e Destrezza competenti); colonna centrale con CA, Iniziativa, Velocità, PF (dado vita d10), tabella attacchi a 3 righe, box dedicato a **Nemico Prescelto ed Esploratore** (selezione e tracciamento dei nemici prescelti a lv 1, 6, 14 e dei terreni prescelti a lv 1, 6, 10; sintesi dei benefici di viaggio e tracciamento), box **Magia e Archetipo Ranger** (CD incantesimi, tiro per colpire, slot half-caster da 1° a 5° livello tracciati a diamanti, incantesimi conosciuti, Stile di Combattimento e box compagno animale/capacità di sottoclasse); colonna destra con progressione dei privilegi di classe di primo livello e successivi (Consapevolezza Primordiale lv 3, Attacco Extra lv 5, Andatura sul Territorio lv 8, Nascondersi in Piena Vista lv 10, Svanire lv 14, Sensi Ferini lv 18, Sterminatore di Nemici lv 20). Trascrizione fissa fedele in `ranger-reference-copy.ts`.

Tutti i sette Archetipi Ranger estratti integralmente dai manuali locali:
- PHB: Cacciatore, Signore delle Bestie.
- Xanathar: Cacciatore delle Tenebre, Uccisore di Mostri, Viandante dell'Orizzonte.
- Tasha: Custode degli Sciami, Viandante Fatato.

Meccaniche, opzioni e calcoli integrati:
- Stile di Combattimento: opzione configurabile tra Combattere con Due Armi, Difesa, Duellare e Tiro; Difesa applica +1 permanente alla CA quando indossa un'armatura.
- Cacciatore delle Tenebre (Livello 3+): Imboscata Terrificante aggiunge automaticamente il modificatore di Saggezza all'Iniziativa; Mente di Ferro (Livello 7+) conferisce competenza nei tiri salvezza su Saggezza (o Intelligenza se già posseduta).
- Viandante Fatato (Livello 3+): Fascino Ultraterreno aggiunge automaticamente il modificatore di Saggezza (minimo +1) a tutte le prove di Carisma (Inganno, Intimidire, Intrattenere, Persuasione) e concede una competenza bonus tra Inganno, Intrattenere e Persuasione.
- Signore delle Bestie (Livello 3+): statistiche del compagno animale (Lupo) calcolate secondo le regole PHB (PF pari al massimo tra base e `4 * livello`, CA e attacchi potenziati dal bonus di competenza).
- Slot Incantesimi e Incantesimi Conosciuti: tabella half-caster completa da 1° a 5° livello con tracciatori a diamanti; conteggio incantesimi conosciuti calcolato secondo tabella PHB (da 2 a 11).
- Incantesimi di Archetipo: risolti e caricati automaticamente per tutti i 5 archetipi che concedono magie (Cacciatore delle Tenebre, Uccisore di Mostri, Viandante dell'Orizzonte, Custode degli Sciami, Viandante Fatato) senza consumare le scelte ordinarie dei conosciuti.
- Emblema vettoriale: creato `drawRangerEmblem` in `fantasy-sheet-graphics.ts` (frecce incrociate e arco ricurvo da cacciatore dei boschi).
- Risoluzione e robustezza dell'estrazione:
  - Risolta l'ambiguità tra "Cacciatore" e "Cacciatore delle Tenebre" in `rangerArchetypeFromLabel` tramite corrispondenza esatta prioritaria.
  - Gestita la precisione di confronto in virgola mobile per la larghezza dei banner fantasy (`drawFantasyBanner`).
  - Regex di rimozione sottotitoli in `manual-subclass-features.ts` estesa per `Ranger`, `Archetipo Ranger`, `Custode degli Sciami`, `Viandante Fatato`, `Viandante dell'Orizzonte`, `Uccisore di Mostri`, `Cacciatore delle Tenebre`.
- Verifica e test:
  - 203 test unitari e di integrazione superati (`npm run test:sheet-generator`), inclusi tutti i 7 archetipi, livelli 1-20, progressione slot e conosciuti, Imboscata Terrificante all'iniziativa, Fascino Ultraterreno alle prove CAR, Stile di Combattimento e PDF di ogni archetipo.
  - 13 test Playwright end-to-end (`playwright.sheet-v2.config.ts`) superati: download Ranger V2 con Cacciatore, selezione stile, esportazione di tutti i 7 archetipi, rifiuto scelte non valide e verifica layout mobile.
  - Build Next.js di produzione completata con successo.
  - Campione PDF generato e verificato: `output/pdf/ranger-v2-test.pdf`.

## Stregone (1 novembre 2026)

Riferimento fornito: `Stregone 5e v14.pdf`, scansione di 4 pagine. Prima pagina ispezionata: colonna sinistra con caratteristiche e salvezze (Costituzione e Carisma competenti); colonna centrale con CA, Iniziativa, Velocità, PF (dado vita d6), tabella attacchi a 3 righe, box dedicato a **Fonte di Magia e Punti Stregoneria** (CD incantesimi, tiro per colpire incantesimi, trucchetti e incantesimi conosciuti, riserva di Punti Stregoneria tracciata a diamanti, tabella di conversione tra slot e punti stregoneria e modalità di recupero) e box **Metamagia e Origine Stregonesca** (opzioni di metamagia scelte con costo e descrizione sintetica, e privilegi distintivi dell'Origine Stregonica); colonna destra con progressione dei privilegi di classe di primo livello e successivi (Fonte di Magia lv 2, Metamagia lv 3, 10, 17, Ripristino Stregonesco lv 20). Trascrizione fissa fedele in `sorcerer-reference-copy.ts`.

Tutte le sette Origini Stregonesche estratte integralmente dai manuali locali:
- PHB: Discendenza draconica, Magia selvaggia.
- Xanathar: Anima Divina, Magia delle Ombre, Stregoneria della Tempesta.
- Tasha: Anima Meccanica, Mente Aberrante.

Meccaniche, opzioni e calcoli integrati:
- Resilienza Draconica (Discendenza Draconica): aumenta il massimo dei punti ferita di +1 per livello da stregone (`sheet.hpMax += sheet.level`) e imposta la Classe Armatura base a `13 + DES` quando il personaggio non indossa armature.
- Selezione Antenato Draconico: scelta tra i 10 draghi (Argento, Bianco, Blu, Bronzo, Nero, Oro, Ottone, Rame, Rosso, Verde) con associazione del tipo di danno elementale e benefici di Affinità Elementale (lv 6+).
- Metamagia: opzioni configurabili tra le 8 opzioni del Player's Handbook (Incantesimo Celato, Incantesimo Distante, Incantesimo Esteso, Incantesimo Intensificato, Incantesimo Potenziato, Incantesimo Preciso, Incantesimo Raddoppiato, Incantesimo Rapido), con limite a 2 opzioni al lv 3, 3 al lv 10 e 4 al lv 17.
- Punti Stregoneria e Fonte di Magia: progressione esatta secondo tabella PHB (0 al lv 1, poi pari al livello della classe da 2 a 20), tracciatore visivo vettoriale a diamanti e sintesi dei costi di creazione degli slot (1°: 2 pt, 2°: 3 pt, 3°: 5 pt, 4°: 6 pt, 5°: 7 pt) e della conversione di slot in punti.
- Slot Incantesimi e Progressione Full-Caster: tabella completa da 1° a 9° livello con tracciatori a diamanti per ogni livello di slot; incantesimi conosciuti (da 2 a 15) e trucchetti conosciuti (da 4 a 6) calcolati rigorosamente.
- Incantesimi Aggiuntivi di Sottoclasse: risolti e caricati automaticamente per Anima Meccanica (10 magie), Mente Aberrante (10 magie + trucchetto Scheggia della Mente), Magia delle Ombre (Oscurità a lv 3 lanciabile anche a 2 pt), e Anima Divina (magia di affinità tra Cura Ferite, Infliggi Ferite, Benedizione, Anatema, Protezione dal Bene e dal Male).
- Emblema vettoriale: creato `drawSorcererEmblem` in `fantasy-sheet-graphics.ts` (fiamma arcana / cresta magica ancestrale a doppia aura).
- Risoluzione e robustezza dell'estrazione:
  - Risolta la collisione tra la razza Dragonide (`### DISCENDENZA DRACONICA` a riga 1529) e la sottoclasse dello Stregone garantendo che la ricerca della sezione inizi dal capitolo della classe di appartenenza.
  - Gestito il refuso OCR della traduzione italiana di Xanathar (`PORTAVOGE DEL VENTO` vs `PORTAVOCE DEL VENTO`) e deduplicata la doppia intestazione `INCANTESIMI PSIONICI` di Tasha.
  - Regex di rimozione sottotitoli in `manual-subclass-features.ts` estesa per `Stregone`, `Origine Stregonica`, `Origine Stregonesca`, `Anima Divina`, `Magia delle Ombre`, `Stregoneria della Tempesta`, `Anima Meccanica`, `Mente Aberrante`.
- Verifica e test:
  - 210 test unitari e di integrazione superati (`npm run test:sheet-generator`), inclusi tutte le 7 origini, livelli 1-20, progressione slot 1-9, Punti Stregoneria, Resilienza Draconica (PF e CA), Metamagia, incantesimi concessi e PDF di ogni origine.
  - 14 test Playwright end-to-end (`playwright.sheet-v2.config.ts`) superati: download Stregone V2 con Discendenza draconica, selezione antenato, metamagia, esportazione di tutte le 7 origini, rifiuto scelte non valide e verifica layout mobile.
  - Build Next.js di produzione completata con successo.
  - Campione PDF generato e verificato: `output/pdf/stregone-v2-test.pdf`.

