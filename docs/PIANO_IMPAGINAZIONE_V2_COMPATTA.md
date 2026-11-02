# Scheda V2 compatta: piano di grafica e impaginazione

Stato: proposta tecnica per Antigravity, da discutere con Alessandro. Nessuna modifica al motore o al renderer inclusa in questo documento.
Data: 1 novembre 2026.

## Decisioni del proprietario

- Applicare le stesse regole editoriali a tutte le 13 classi già integrate.
- Stampa come uso principale; mantenere uno stile fantasy, il renderer modulare e il generatore precedente.
- Usare il nuovo logo `/Users/alessandropetricciuolo/Desktop/b&d/logo.svg`.
- Separare CA, iniziativa, velocità; separare PF max, attuali, temporanei e dadi vita. Valori importanti grandi e in grassetto.
- Bonus di competenza in una casella autonoma sopra le caratteristiche.
- Caratteristica da incantatore, CD e attacco degli incantesimi soltanto sulle pagine incantesimi, in tre caselle autonome e leggibili.
- Nessuna fonte o riferimento ai manuali nella stampa.
- Eliminare i brani di spiegazione generale della classe e della progressione indicati nella richiesta, il blocco Identità duplicato e tutto il background da manuale.
- Riassumere i tratti razziali, conservando gli effetti utili.
- Compagni come il difensore d'acciaio in mini schede statistiche.
- Confermato da Alessandro: riassunti operativi per tutti gli incantesimi della lista del personaggio; testi integrali consultabili sul sito.

## Diagnosi verificata sul PDF campione

Campione: `/Users/alessandropetricciuolo/Downloads/eg-v2.pdf`, Artefice 8, Fabbro da battaglia, elfo alto, INT 20, BC +3. Totale 21 pagine.

| Pagine attuali | Contenuto e problema |
| --- | --- |
| 1 | Scheda di gioco; alcuni privilegi molto lunghi, altri utili relegati dietro. |
| 2–5 | Regole generali, progressione, preparazione incantesimi, infusioni e privilegi di classe. Numerose spiegazioni da eliminare o convertire in promemoria. |
| 6–7 | Fabbro da battaglia e difensore d'acciaio; blocco statistiche spezzato, formule non risolte e tabella caratteristiche stampata come testo. |
| 8–9 | Tutte le 6 infusioni conosciute, anche le 3 non applicate, più assegnazioni e identità ripetute. |
| 10–12 | Tratti razziali integrali, inventario e background con tabelle e descrizioni narrative. |
| 13–21 | 15 incantesimi con testo completo. La nota sul focus dell'Artefice è ripetuta 15 volte. Ultima pagina quasi vuota, occupata soltanto da una continuazione. |

Il codice attuale in `src/lib/pdf/character-sheet-v2.ts` stampa le carte iniziali e poi ristampa l'intero `model.features`; aggiunge integralmente razza, sottorazza e background; infine inserisce `fullTextMd` di ogni incantesimo. Cambiare font o margini non risolve questo modello editoriale.

## Obiettivo misurabile

Per il campione: obiettivo 4 pagine, accettabile 5 se il compagno o le sintesi richiedono spazio. È una previsione da validare sul prototipo, non una promessa già misurata.

- Personaggio senza magie e senza compagni: orientativamente 2–3 pagine.
- Incantatore di livello intermedio: orientativamente 3–5 pagine.
- Personaggi con molte magie/capacità o più compagni: pagine aggiuntive motivate dal contenuto. Non imporre un massimo universale.

Mai raggiungere il numero di pagine riducendo tutto a caratteri minuscoli, tagliando il testo dopo N righe o eliminando eccezioni determinanti. Il risultato deve essere utilizzabile senza ricordare a memoria ogni capacità; per i casi complessi rimane disponibile la regola integrale sul sito.

## Regola editoriale comune

Ogni capacità deve avere un'identità stabile e una destinazione esplicita. Classificare per significato, non attraverso una blacklist globale di parole come «Incantesimi», che eliminerebbe anche privilegi specifici importanti.

| Tipo di informazione | Trattamento |
| --- | --- |
| Spiegazioni su cos'è la classe, come si sceglie la sottoclasse, come aumentano le caratteristiche, esempi di calcolo | Non stampare. |
| Scelte già compiute e bonus permanenti già incorporati | Mostrare il risultato nel campo pertinente; nota breve solo se serve a capire quando si applica. |
| Capacità con azione, reazione, limite, condizione o uso pratico | Una sola sintesi operativa, con eventuale contatore vicino. |
| Regole particolari della classe necessarie al gioco | Un promemoria breve, una sola volta, nel punto pertinente. |
| Compagni e creature effettivamente selezionati | Mini scheda strutturata con valori risolti. |
| Regole narrative, descrizioni del popolo, scelte future e opzioni non scelte | Non stampare nella scheda compatta. |

La sintesi di una capacità conserva: attivazione e innesco, bersagli, portata, effetto, durata, costo/usi, recupero ed eccezioni che ne cambiano l'utilizzo. Non troncare dopo un numero fisso di caratteri.

Esempi Artefice: niente capitolo «Infusioni Conosciute», ma contatori e assegnazioni restano; niente capitolo «Strumenti Necessari», ma una nota comune sul focus resta sulla pagina magie; niente spiegazione della scelta della specializzazione, ma i privilegi realmente ottenuti restano. «Lo strumento più adatto» perde il brano integrale; l'eventuale utilità concreta può stare in una riga nel riepilogo fuori combattimento. Nessuna scheda dedicata all'Aumento dei punteggi: i valori sono già aggiornati; eventuali talenti scelti, invece, conservano le proprie regole operative.

Il background da manuale è eliminato completamente, compresi privilegio e tabelle. Restano nome nell'header e risultati già acquisiti (competenze, linguaggi, equipaggiamento). La storia scritta dal giocatore, se richiesta, è un'esportazione separata opzionale, esclusa dal conteggio della scheda di gioco.

## Struttura delle pagine

### Pagina 1 — gioco immediato

Conservare le tre colonne, senza obbligare le classi ad avere lo stesso contenuto centrale e destro.

- Header completo: nuovo logo a sinistra; nome, razza/sottorazza, classe, sottoclasse, livello, background, allineamento; riga compatta per età, sesso, altezza e peso quando compilati. Nessun blocco Identità successivo.
- Sinistra: casella Bonus di competenza sopra le sei caratteristiche. Modificatore maggiore del punteggio, abilità a fianco come richiesto in precedenza. Percezione passiva in un campo distinto, senza confonderla con il bonus di competenza.
- Centro: tre caselle distinte CA, Iniziativa, Velocità; PF con caselle Max, Attuali, Temporanei, Dadi vita disponibili/totali e spazio per registrarne la spesa; salvezze dalla morte; attacchi con colonne nome/TpC/danni/tipo; risorse specifiche della classe.
- Negli attacchi mostrare valori risolti (es. `1d4+6`, non `1d4+INT+1`) e numero di attacchi quando previsto. Conservare separati i contributi nei dati e i danni condizionali, senza applicarli automaticamente a ogni colpo.
- Destra: capacità usate più spesso, soprattutto azioni bonus, reazioni e impieghi in combattimento. Nell'esempio Lampo di Genio e Attacco Extra hanno priorità sulla lunga spiegazione dell'Invenzione Magica.
- Caratteristica da incantatore/CD/attacco magico non compaiono qui. Si propone di spostare anche gli slot sulla pagina magie, così la pagina di gioco non duplica contatori da segnare a matita.

Contatori e descrizione della stessa capacità possono stare insieme; non ristampare poi la capacità integrale. Non omettere silenziosamente le carte che non entrano: passarle al flusso delle capacità della pagina 2.

### Pagina 2 — capacità, razza e dotazione

Due colonne con flusso automatico invece dei grandi riquadri a tutta larghezza per ogni paragrafo. Ogni capacità ha titolo, breve testo e contatore se necessario. Evitare cornici e titoli alti ripetuti per blocchi di due righe.

- Capacità non già descritte nella pagina 1, incluse utilità fuori combattimento.
- Tratti razziali operativi: sensi, resistenze/immunità, vantaggi, riposi speciali, capacità attivabili e magie razziali. Eliminare età tipica, cultura, colore degli occhi/capelli e incrementi già applicati. Riunire razza e sottorazza senza duplicazioni.
- Linguaggi e competenze in poche righe, separando strumenti/armature/armi. Non ristampare abilità già segnate accanto alle caratteristiche.
- Inventario in tabella compatta con quantità, stato e spazio note/monete. Niente doppio elenco di oggetti infusi.
- Equipaggiamento speciale: oggetto, stato (usato/trasportato/assegnato), sintonia, effetto attuale e cariche/recupero. Evidenziare che i bonus permanenti sono già inclusi, senza applicarli due volte.
- Artefice: descrivere gli oggetti infusi attuali; per le infusioni note non applicate mostrare solo un elenco compatto dei nomi, eventualmente una riga di funzione. Non trattarle come effetti attivi.

Il compagno può occupare una colonna o la parte finale di questa pagina se entra leggibile. Se non entra, dedicargli una pagina. Non promettere sempre mezzo foglio.

### Compagni — mini schede statistiche

Componente condiviso per difensore d'acciaio, omuncolo, compagni del Ranger, spiriti e altre creature effettivamente selezionate. Non stampare un bestiario delle forme o evocazioni possibili. Gestire le trasformazioni con una scheda della forma selezionata, quando il prodotto dispone di tale scelta e dei dati necessari; non introdurre ora un simulatore di tutte le forme.

Mini scheda: nome/tipo/taglia; CA, PF max/attuali, DV, velocità; sei caratteristiche; TS e abilità; immunità/resistenze, sensi e linguaggi; tratti; Azioni; Reazioni; regola di comando e ordine del turno; usi, recupero e rigenerazione/riparazione.

Risolvere le formule con i valori del personaggio senza confondere formule diverse. Nel campione, dalle formule presenti nel PDF: Difensore CA 15, PF 47 (2+5+5×8), velocità 12 m, BC +3, attacco +8, danni 1d8+3 forza. L'eventuale formula di spiegazione può restare nei dati, non sostituire il valore durante il gioco. Conservare comando con azione bonus, Schivata predefinita ed eccezioni del proprietario incapacitato.

Non spezzare una mini scheda tra due pagine quando può entrare intera. Per blocchi realmente lunghi separare soltanto sezioni complete e indicare la continuazione.

### Pagine incantesimi — tabella operativa

Mantenere il concetto di tabella della scheda attuale. Stampare tutti gli incantesimi della lista del personaggio (trucchetti, selezionati/preparati e concessi), non l'intero elenco teorico della classe o il libro completo di un Mago. Distinguere le voci conosciute ma non preparate se sono incluse per scelta esplicita.

In alto, tre caselle con valore grande e grassetto: Caratteristica (es. INT +5), CD incantesimi (16), Attacco incantesimi (+8). Slot con contatori e recupero, preparabili/conosciuti e concessi in una riga. Magia del Patto e Arcanum non diventano slot ordinari.

Se magie di razza, talenti o oggetti usano un'altra caratteristica, stampare un gruppo secondario o un'indicazione nella singola voce con i valori corretti. Non applicare una caratteristica globale a tutto e non dedurre la caratteristica dal solo nome della classe.

Colonne proposte: Livello + stato; Nome; Lancio; Gittata/area; Durata; V/S/M e R/C; Effetto. Le intestazioni vanno misurate: se sette colonne comprimono troppo l'effetto, unire i metadati in una cella su due righe, preservandone il significato. Non sacrificare metà pagina a colonne quasi vuote.

Ogni sintesi conserva:

- tempo di lancio e innesco della reazione, se presente;
- gittata, area e bersagli rilevanti;
- durata, concentrazione e rituale;
- tiro per colpire o TS, conseguenze di successo e fallimento quando previste;
- danni/cura/condizioni, limiti ed eccezioni determinanti;
- potenziamento con slot superiori e progressione dei trucchetti;
- componenti costose/consumate con valore e consumo, anche quando esiste un focus;
- stato sempre preparato/razziale/da oggetto ed eventuali usi senza slot.

Una riga non significa una sola riga tipografica: usare l'altezza necessaria. Un incantesimo complesso può richiedere più spazio. Vietati tagli automatici dopo 2–3 righe o sintesi come «infligge danni» prive delle condizioni.

La regola comune del focus Artefice compare una volta a inizio sezione; la colonna componenti resta corretta. Nome, livello, rituale e concentrazione non vanno ripetuti dentro l'effetto. «Sempre preparato» diventa un simbolo o una dicitura breve con legenda, non un paragrafo per ogni voce. Ordinare per livello e poi nome.

Esempio dal campione: Scudo può esprimere sinteticamente reazione quando colpito o bersagliato da Dardo Incantato, +5 CA anche contro l'attacco innescante fino all'inizio del turno successivo, nessun danno da Dardo Incantato. Il suo testo non deve occupare una continuazione a sé.

Conservare sul sito le descrizioni integrali già verificate. Se il sito mostra attualmente soltanto un'anteprima, aggiungere un accesso esplicito al testo completo nella vista del personaggio; non basta promettere che il contenuto esiste da qualche parte nel compendio. Non richiedere QR o collegamento internet per interpretare i normali effetti della sintesi stampata.

## Come produrre sintesi senza allucinazioni

Questa è la parte più impegnativa del lavoro, soprattutto per gli incantesimi: non è risolvibile soltanto cambiando il renderer.

- Nessuna chiamata AI a ogni generazione della scheda.
- Preparare sintesi redazionali verificate una volta, nel repository, collegate alla regola/spell e alla sua versione. I metadati affidabili si estraggono dal manuale; il riassunto dell'effetto va verificato sul testo completo.
- Separare dati meccanici, sintesi approvata e testo integrale. `GeneratedSpell.summary` attuale può contenere note del generatore, non una vera sintesi: non usarlo come se fosse già il catalogo operativo.
- Conservare fonti e riferimenti nei dati interni/test e nella consultazione sul sito; sopprimerli solo nella stampa. Non cancellare la provenienza dal motore.
- Valutare prima gli strumenti di estrazione e i riassunti già presenti nel progetto. Riutilizzarli solo se conservano gli elementi obbligatori.
- Una sintesi mancante deve produrre un avviso chiaro prima della stampa, con possibilità di consultazione integrale. Non sostituirla silenziosamente con il testo completo, che farebbe ricomparire il problema delle pagine, né con un testo inventato o troncato.
- Il catalogo cresce per regole condivise: lo stesso incantesimo non viene riassunto separatamente per ogni classe. Gli override specifici (focus Artefice, caratteristica, livello, concessione) restano metadati separati.

## Grafica e impaginazione comuni

- A4 verticale, stampabile in bianco e nero; margini di sicurezza circa 10 mm. Nuovo logo senza deformazioni, controllato anche su carta. Il file SVG contiene anche una bitmap incorporata: verificare il risultato reale, non presumere che sia tutto vettoriale. Se serve una conversione, produrla una volta come asset di stampa, non a ogni richiesta.
- Prima pagina con header completo; pagine successive con header ridotto (logo piccolo, nome, classe/livello, titolo sezione). Non ripetere tutta l'anagrafica su ogni foglio.
- Font dei valori chiave 15–20 pt secondo spazio; testo operativo 9–10 pt, preferibilmente 9,5; interlinea circa 11,5–12. Non usare la riduzione automatica a 6–7 pt per far entrare un blocco.
- Cornici fantasy leggere, ornamenti soprattutto per titoli/sezioni; meno padding verticale e niente grandi riquadri per una sola frase. Niente sfondi scuri che consumano inchiostro.
- Contatori e campi scrivibili con spazio sufficiente per una matita. Non comprimere PF attuali e note fino a renderli inutilizzabili.
- Titolo sempre insieme al contenuto; righe incantesimo intere quando entrano in una pagina; niente pagine create anticipatamente e poi lasciate vuote; gestire le righe orfane. Una continuazione inevitabile deve essere leggibile e motivata, non nascondere testo.
- Piè di pagina: nome personaggio/sezione e numero pagina. Nessuna fonte, versione di manuale o nota tecnica.

## Applicazione a tutte le classi

Il criterio comune è mostrare scelte e valori attuali, non capitoli di progressione. I moduli esistenti rimangono responsabili delle regole.

- Bardo: ispirazione, privilegi del collegio e magie scelte.
- Barbaro: Ira attuale, usi/recupero, attacchi e privilegi del cammino.
- Chierico/Paladino: capacità di dominio/giuramento e risorse di Incanalare, magie concesse marcate.
- Druido: limiti attuali di Forma Selvatica e capacità del circolo, nessuna appendice di tutte le bestie.
- Artefice: infusioni applicate, nomi delle note non applicate, compagno selezionato.
- Guerriero/Ladro: risorse e scelte di archetipo, manovre/tecniche effettivamente note; magie solo se presenti.
- Mago: preparati e capacità della tradizione; libro integrale escluso dalla stampa ordinaria.
- Monaco: ki e tecniche disponibili con costi, nessuna spiegazione del sistema di classe.
- Ranger: capacità selezionate, magie e compagno quando previsto.
- Stregone: punti stregoneria e metamagie selezionate con costo.
- Warlock: slot del Patto e recupero, Arcanum, dono e suppliche scelte senza ristampare tutte le opzioni.

Nessun elenco futuro, catalogo di sottoclassi o testo dei privilegi non scelti. Talenti, razza e oggetti possono introdurre magie anche in classi non incantatrici: non decidere la presenza della pagina magie soltanto dal nome della classe.

## Piano esecutivo per Antigravity

1. Congelare il campione e ricostruire lo stesso personaggio come fixture locale: non copiare soltanto le cifre del PDF. Separare difetti di presentazione da difetti del motore. Esempio da verificare: il campione descrive lo scudo infuso come usato, mentre l'inventario dice «Scudo: non impugnato»; mostrare uno stato coerente senza cambiare arbitrariamente la CA.
2. Definire un piccolo modello di stampa comune con capacità operative, risultati già applicati, risorse, oggetti, tratti razziali, creature e sintesi magie; agganciarlo ai modelli delle 13 classi. Niente 13 renderer separati o riscrittura del motore.
3. Prototipo completo sul campione: nuovo logo, prima pagina, capacità/dotazione, difensore e sintesi dei 15 incantesimi. Rivedere visivamente tutte le pagine e misurare il numero effettivo. Questo prototipo valida il compromesso prima di estendere il catalogo.
4. Applicare classificazione e sintesi alle altre classi e a tutte le opzioni realmente supportate; completare il catalogo di incantesimi condiviso. Non dichiarare finita l'estensione con i soli 15 incantesimi della fixture.
5. Collegare accesso ai testi integrali sul sito, controlli di copertura delle sintesi e segnalazioni prima della stampa. La scheda compatta diventa il PDF V2 ordinario; non aggiungere modalità e menu non necessari.
6. Eseguire test, controlli visivi e campioni estremi; documentare ciò che rimane fuori. I file del generatore precedente e le modifiche estranee nel checkout restano esclusi.

## Verifiche di accettazione

- Campione 21 pagine: 4–5 pagine leggibili, tutti i 15 incantesimi presenti e tutte le capacità operative rappresentate una volta, non un manuale ristampato.
- Controllo di copertura sui privilegi di ogni classe/sottoclasse: classificati come risultato applicato, sintesi, creatura o esclusione motivata. Nessuna capacità persa perché non entrava nel foglio.
- Tracciabilità delle sintesi ai manuali e verifica degli elementi critici; controlli specifici su concentrazione/rituale, inneschi delle reazioni, materiali costosi/consumati, TS a successo parziale, progressioni e concessioni senza slot.
- Test di assegnazioni e contributi già applicati: una nota o una riga del PDF non deve riapplicare bonus al motore.
- Campioni di tutte le 13 classi a livello basso/intermedio/alto, incluse terze progressioni, Warlock, magie razziali con altra caratteristica, personaggi con/senza compagni, nomi lunghi e testi complessi. Verifica esaustiva delle opzioni a livello dati; campioni visivi rappresentativi, non ogni combinazione possibile.
- Nessuna fonte stampata, nessuna Identità o background integrale, niente note tecniche ripetute. Conservare nei dati le fonti.
- Valori della prima pagina identici al motore validato; difensore calcolato al livello corrente e leggibile come mini scheda.
- Test significativi di impaginazione: assenza di sovrapposizioni, contenuti fuori pagina, font illeggibili, righe orfane evitabili e PDF vuoti. Controllare anche l'aspetto a dimensione di stampa e in scala di grigi.
- Suite generatore, TypeScript, lint pertinente, flusso browser/download e build come in `docs/ANTIGRAVITY_GENERATORE_V2_HANDOFF.md`, in sequenza quando condividono `.next`. Aggiornare le aspettative dei test che imponevano vecchi brani integrali: non cancellare le verifiche sulla correttezza delle regole.

## Priorità e rapporto lavoro/beneficio

Beneficio immediato alto, lavoro contenuto: rimozione delle duplicazioni, background, testi generali, fonti, anagrafica ripetuta e nota focus ripetuta; header successivi ridotti. Non basta a risolvere le nove pagine degli incantesimi.

Beneficio alto, lavoro medio: prima pagina, tabella oggetti, tratti razziali operativi e mini schede dei compagni.

Beneficio decisivo, maggiore lavoro editoriale: sintesi affidabili degli incantesimi e dei privilegi per tutte le classi. Far validare il prototipo Artefice prima di completare quel catalogo evita di rifare il lavoro. Automatizzare la verifica e il riuso; non affidarsi a riassunti generati liberamente a ogni stampa.
