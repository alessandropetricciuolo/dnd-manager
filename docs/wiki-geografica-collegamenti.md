# Wiki geografica: consegna e istruzioni per i collegamenti

## Pagina

Percorso: `/campaigns/{campaignId}/gm-only/wiki-geografica`.
Accesso: campagna → **Strumenti GM → Wiki geografica**. La mappa concettuale precedente resta disponibile.

La pagina legge i dati correnti e non scrive nulla. Non ci sono migrazioni, modifiche alle voci o normalizzazioni automatiche. **Aggiorna** ricarica indice, relazioni e dossier, mantenendo la selezione quando ancora disponibile. Il testo completo e le immagini sono caricati alla selezione della voce. I Documenti di campagna e le voci archiviate restano fuori da questa vista Wiki; le voci Solo Admin non sono inviate ai GM.

La struttura geografica arriva da `maps.parent_map_id`. I collegamenti Wiki provengono da `wiki_relationships`. I dati non vengono ricostruiti dai tag o dalle citazioni nel testo. Origine, luogo di nascita, eventi passati e appartenenza a una gilda non significano presenza attuale.

### Collegamenti a più passaggi

Il pannello centrale **Collegamenti di…** permette di espandere ogni nodo mantenendo visibili i precedenti. Selezionare il nome apre il dossier, senza sostituire l’albero; il comando **Collegamenti** apre o chiude il ramo. Le frecce indicano il verso reale della relazione rispetto al nodo sopra. Più relazioni con la stessa voce sono raccolte sotto un solo nodo, conservando etichette e versi distinti.

Le espansioni seguono soltanto righe salvate: non creano collegamenti diretti fra nodi raggiunti in due passaggi. I ritorni a una voce già presente nel percorso sono segnati e non si espandono ulteriormente. Dopo quattro livelli si può proseguire usando quella voce come nuovo punto di partenza, per mantenere la leggibilità su telefono.

Esempio verificato nell’interfaccia autenticata il 18 ottobre: la Locanda della Sirena ha collegamenti diretti a Ella e Dan; espandendo Dan compaiono Patrizio ed Ella. La relazione Patrizio → Dan è `padre di`. Nei dati osservati non risultano collegamenti diretti Locanda → Patrizio o Patrizio → Ella: l’albero non li inventa.

Scheda e mappa sono presentate insieme soltanto se collegate esplicitamente da `wiki_entity_id` o da una relazione di identità riconosciuta e non ambigua, per esempio `Lore`, `Mappa della bottega`, `Mappa cittadina`. Nessun accorpamento per semplice somiglianza del nome. Il dossier conserva la direzione sorgente → etichetta → destinazione e raggruppa i doppioni logici senza cancellare righe.

## Cosa chiedere all’agente che crea le voci

«Menzionato nel testo» è già una relazione salvata, ma descrive soltanto una citazione. Migliorarla significa identificare il significato reale e aggiornare la coppia esistente quando la fonte lo permette. Non significa creare una seconda riga identica, né trasformare ogni citazione in una residenza.

Per le nuove voci, aggiungere al momento della creazione i collegamenti precisi sostenuti dal testo approvato. Per la revisione dello storico, rileggere prima le fonti e proporre un delta. Nessun altro agente deve riscrivere la storia per giustificare una relazione.

### Etichette geografiche consigliate

Usare l’etichetta senza ripetere il nome del bersaglio: il nome è già mostrato sulla destinazione.

| Sorgente | Etichetta | Destinazione |
|---|---|---|
| PNG | `Vive a` | Mappa della città di residenza |
| PNG | `Vive e lavora a` | Mappa della città, solo se entrambi i fatti sono espliciti |
| PNG | `Lavora presso` | Bottega, locanda o altro luogo pertinente |
| PNG / organizzazione | `Opera a` | Luogo di attività verificato |
| Luogo Wiki | `Si trova in` | Mappa del luogo geografico che lo contiene |
| Organizzazione / sede | `Ha sede a` | Luogo della sede, senza dedurre dove siano tutti i membri |
| Luogo Wiki | `Mappa del luogo` | Mappa della stessa identica località |

Per collocare una voce, preferire un bersaglio Atlante già esistente, risolto per UUID. È supportato anche un bersaglio Wiki con un’identità geografica esplicitamente collegata all’Atlante. Le località Wiki senza mappa restano consultabili nel dossier e nei collegamenti, senza inventare mappe soltanto per far apparire un nodo.

La pagina riconosce anche alcune etichette preesistenti (`vive qui`, `Risiede a`, `Sede cittadina`, `Bancarella al mercato` e altre elencate in `src/lib/wiki/geography.ts`). Le etichette nuove non riconosciute restano comunque consultabili fra gli altri legami e nel dossier: non vengono scartate né interpretate arbitrariamente.

### Relazioni narrative

Usare predicati specifici come `Padre di`, `Appartiene alla gilda`, `Dirige`, `Collabora con`, `Ha ingaggiato`, `Ha sede a`, `Luogo di nascita`. Non usare `Conosce` quando la fonte prova soltanto una menzione o una presenza nello stesso racconto. Le relazioni storiche devono restare storiche, per esempio `Ha fondato` o `Si rifugiò a`.

Una relazione organizzativa o storica è utile anche se non colloca la voce nella città. Non occorre una relazione inversa per farla comparire nel dossier: la pagina mostra già entranti e uscenti con la loro direzione. Non generare inverse in massa.

## Procedura per revisionare lo storico senza interferire con altre scritture

1. Leggere Canon Gate, gerarchia Atlante e le entità pertinenti tramite MCP B&D. Paginare `list_wiki_relationships` fino alla fine, includendo l’opt-in Admin solo nel contesto autorizzato. Non usare i numeri del mockup come inventario corrente.
2. Stabilire uno scope piccolo, per esempio una città o una gilda. Coordinare con Alessandro le voci già in modifica altrove; evitare batch concorrenti sulle stesse coppie.
3. Preparare il delta: UUID sorgente, UUID destinazione, relazione/etichetta attuale, nuova etichetta, passaggio della fonte che la prova, visibilità e motivo. Segnalare separatamente conflitti o fatti non definiti.
4. Dopo l’autorizzazione alla revisione concreta, rileggere la coppia subito prima di modificarla. `upsert_wiki_relationship` aggiorna una coppia già presente: non creare copie e non sovrascrivere un’etichetta cambiata da un altro agente dopo l’audit. Se lo stato è cambiato, riconciliare prima la differenza.
5. Il connettore non espone qui un token di concorrenza per la riga di relazione: la rilettura riduce il rischio ma non rende sicure due scritture simultanee sulla stessa coppia. Evitare gli stessi endpoint in due batch contemporanei.
6. La coppia sorgente/destinazione è unica. Se sostiene più fatti, non alternare due upsert che si sovrascrivono a vicenda. Scegliere l’etichetta più utile o una combinazione esplicita come `Vive e lavora a`, preservando il dettaglio nel contenuto.
7. Non modificare testo, immagini, tag, stato editoriale, archiviazione o visibilità nel solo lavoro sui collegamenti. Preservare i confini pubblici, GM e Solo Admin; non creare inverse che rivelino informazioni protette.
8. Rileggere ogni mutazione con MCP, poi verificare il risultato nella Wiki geografica con **Aggiorna**. Rendicontare modifiche applicate, omesse e ancora ambigue, senza confondere salvataggio e verifica nel browser.

## Esempi concreti da rileggere prima di intervenire

Questi sono i casi osservati il 18 ottobre 2026, non istruzioni di scrittura basate su uno snapshot immutabile.

- **Giorgio e Armeria:** la riga `5de62615-0a44-4b04-b2e7-4e68bd54dfcf` parte da Armeria Wiki `1dfb4408-3c56-4870-b69d-aa61b86a1b85` e arriva a Giorgio `18cef934-2efd-4377-85e5-db2c0d6c68c2` con `lavora qui`. Chiarire il verso, per esempio `Vi lavora` se si mantiene questa direzione. Esiste già Giorgio → mappa della bottega `a3735ba3-3382-4bb8-b26b-134a751c3c87` con `Lavora nella bottega`: non introdurre un’altra copia dello stesso fatto.
- **Garzia:** mantenere distinti `vive a` Portico e `Bancarella al mercato` a Bastione Scarlatto. Il testo letto conferma l’attività a Bastione; questo non prova che il legame di residenza a Portico sia errato.
- **Ospedale:** mappa `d28c4063-a403-4e4d-9b18-056f40193963` con `parent_map_id=null`, associata alla Wiki `984ad85f-f1c4-4062-a938-c8c281db72ab`. La scheda lo colloca a Portico. Proposta: impostare come padre la mappa Portico `99a4e80e-6a84-4a71-8d89-a5e7d114da04`, senza assegnare un quartiere non verificato. Questo è un intervento sulla gerarchia Atlante, non un semplice upsert Wiki; usare una funzione supportata di modifica della mappa o l’interfaccia autorizzata. Non ricreare la mappa per aggirare l’assenza di una funzione MCP.

## Messaggio pronto da affidare all’altro agente

> Integra la creazione delle nuove voci con relazioni esplicite e verificate seguendo `docs/wiki-geografica-collegamenti.md`. Leggi il canone live e le righe reali prima di scrivere. Per la geografia usa l’Atlante e preferisci etichette standard come `Vive a`, `Lavora presso`, `Opera a`, `Si trova in`, `Ha sede a`. Per i rapporti narrativi descrivi il fatto specifico, non la semplice presenza di un nome nel testo. Non trasformare automaticamente le menzioni in localizzazioni. Usa UUID reali, evita duplicati e inverse inutili e preserva contenuti e visibilità. Per correggere le relazioni storiche, prepara prima il delta motivato; applicalo soltanto quando Alessandro autorizza quella revisione. Rileggi ogni scrittura e non operare sulle stesse coppie contemporaneamente a un altro agente.

Questo messaggio è una consegna preparata: non è stato inviato ad altri agenti e non autorizza da solo nuove mutazioni.

## Verifica dello sviluppo

- Compilazione di produzione completata; nuova route presente nel build. Solo avvisi preesistenti in componenti estranei alla modifica.
- TypeScript e lint mirato passati; controllo del diff senza errori.
- 19 test passati: localizzazioni, citazioni, identità ambigue, direzione, doppioni logici, cicli, autorizzazioni GM/Admin, documenti, archivi, isolamento di campagna e paginazione di 1.205 righe; aggiunti casi per espansioni su due passaggi, raggruppamento di relazioni opposte e mantenimento degli endpoint accessibili.
- Componente React effettivo verificato in un’anteprima isolata con i dati acquisiti per il mockup e letture simulate: navigazione, ritorno, dossier e immagini. Nessun errore console; nessuno scorrimento orizzontale a 1440, 768 e 390 px.
- Il percorso reale senza autenticazione reindirizza al login. Completata anche la verifica locale autenticata Admin sul caso Locanda → Dan → Patrizio/Ella: espansione del ramo, lettura di Patrizio nel dossier senza perdere il percorso e visualizzazione del ritorno circolare. Nessun errore console e nessuno scorrimento laterale a 390 px. Non è una prova browser con un account GM distinto, che rimane coperto dai test di autorizzazione lato server.
- Nessuna migrazione o scrittura dei dati della campagna. Modifiche preesistenti al progetto mobile e altri file estranei preservati. La pubblicazione del codice è separata dalla revisione delle relazioni e non applica correzioni ai dati.

## Rami sotto le città

La vista cittadina raccoglie luoghi e organizzazioni con membri, fondatori, personale o abitanti esplicitamente collegati. I rami sono chiusi inizialmente e mostrano il numero di voci; il nome apre il dossier, la freccia apre il ramo. La stessa voce può apparire in più gruppi senza duplicare il record. Le persone già raccolte nei gruppi non compaiono anche fra le altre voci cittadine; la lista completa resta disponibile in «Tutte le voci e i luoghi della città».

I gruppi sono una presentazione delle relazioni esistenti, non modificano la collocazione geografica. «Menzionato nel testo», rapporti storici, ostilità e apprendistati futuri non stabiliscono appartenenza attuale: restano accessibili attraverso tutti i legami della voce. Una mappa e una voce omonime continuano a essere distinte in assenza di un collegamento di identità esplicito.
