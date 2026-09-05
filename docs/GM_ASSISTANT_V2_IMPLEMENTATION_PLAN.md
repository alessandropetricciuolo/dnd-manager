# Roadmap di prodotto e tecnica — Assistente GM

## Decisione

L'Assistente GM diventa il punto di ingresso conversazionale per le funzioni AI di Barber & Dragons. Non è un agente autonomo: è un workspace in chat in cui il GM prepara, rivede e conferma artefatti reali della campagna.

I percorsi legacy restano operativi in parallelo. Non vengono migrati o rimossi in questa roadmap: possono essere riusati internamente come motori di dominio, ma il GM non deve uscire dalla chat per completare un flusso iniziato nell'Assistente.

## Principi non negoziabili

1. **Accesso.** AI disponibile solo ad Admin e GM autorizzati sulla campagna. I giocatori non accedono a retrieval, provider, thread, artefatti o azioni AI.
2. **All-in-one.** Un flusso iniziato nella chat si completa nella chat. Se un servizio fallisce, la bozza resta recuperabile e l'Assistente consente retry o correzione contestuale; non rimanda al legacy.
3. **Conferma esplicita.** Il modello non scrive direttamente dati canonici. Ogni write richiede schema server, revisione UI e conferma del GM.
4. **Risultati composti.** Per campagna + copertina o PG + PDF, l'Assistente non comunica successo parziale. Mantiene un work state riprendibile o annulla con sicurezza ciò che non è confermato.
5. **Canone.** I fatti di campagna devono avere fonti citate. Ciò che è creativo è marcato come proposta. Tag e relazioni nascono solo da riferimenti realmente risolti.
6. **Regole.** Il sistema è D&D 5e. I manuali ufficiali prevalgono su memoria, cataloghi e conoscenza del modello; house rule, conflitti e fonti assenti sono espliciti.
7. **Adapter di dominio.** Ogni capacità ha uno schema e un adapter tipizzati verso Action Registry o servizio esistente. Non usare mapping generici da tipo di artefatto ad azione.
8. **Legacy.** Nessuna rimozione o refactor dei percorsi storici senza evidenza live per quella singola capacità.
9. **Audit.** Salvare solo riferimenti, esiti, versioni e metriche sicure; mai segreti, embedding, chunk completi o binari.

## Modello di prodotto

Assistente GM (Admin / GM autorizzato)
  -> thread: campagna selezionata o onboarding nuova campagna
  -> router di capacità tipizzate
       -> Wiki e immagini
       -> piani e bozze missioni
       -> interrogazione memoria
       -> interrogazione manuali D&D 5e
       -> bozza PG e handoff al generatore PDF
       -> bozza campagna e copertina
  -> chat + artefatto revisionabile
  -> validazione server + conferma GM
  -> adapter di dominio + persistenza + indicizzazione

Le risposte informative non creano artefatti salvabili. Ogni writer possiede un contratto dedicato, incluse fonti consentite, validazione, transizioni e adapter di persistenza.

### Thread e cronologia

- Ogni nuova chat UI crea un thread distinto; non riusa lo storico completo della campagna.
- Un thread appartiene a una sola campagna, salvo un thread temporaneo di onboarding per creare una campagna.
- La cronologia mostra le chat della campagna corrente: titolo automatico rinominabile, nuova chat, riapertura e archivio.
- Solo thread e bozza attivi influiscono sulla risposta. Vecchi turni non richiamati non possono introdurre dettagli personali, professionali o visivi.

### Stati comuni

draft -> ready_for_review -> prepared -> saved

Sono ammessi anche needs_input, failed e discarded. Le revisioni preservano i campi non modificati. Ogni conferma confronta artefatto e revisione corrente.

## Roadmap

### R0 — Stabilizzazione Wiki e test live

**Stato:** in corso e non bloccante. Wiki, immagini, relazioni e salvataggio
costituiscono il pilot; il legacy resta affiancato. R1 e le fasi successive
possono iniziare mentre il GM continua i test live di R0.

- Eseguire almeno 10 scenari: creazione, modifica parziale, immagine, relazione canonica, fonte assente, NPC, luogo, oggetto, mostro e lore.
- Registrare feedback leggero in chat: utile, da correggere, errato, con nota.
- Correggere regressioni riproducibili senza rifattorizzare i generatori legacy.

**Accettazione:** il salvataggio confermato conserva testo e immagine nella stessa Wiki e mostra fonti e relazioni comprensibili.

I feedback di R0 producono correzioni mirate quando emerge una regressione
riproducibile, ma non sono una condizione per avviare R1. Ogni nuova fase deve
soltanto preservare i flussi Wiki gia' funzionanti.

### R1 — Fondazioni conversazionali e cronologia

**Obiettivo:** rendere la chat un workspace affidabile prima di aggiungere nuovi writer.

- Completare ripresa, archivio, rinomina e nuova chat.
- Rendere gli artefatti schema-specifici e introdurre un router esplicito delle capacità.
- Mostrare stato di lavoro, errori sicuri, retry e feedback in chat.
- Applicare la guardia GM/Admin prima di retrieval, provider, persistenza e audit.

**Fuori scope:** chat giocatori, memoria cross-campagna, automazioni senza conferma e sostituzione del legacy.

**Accettazione:** una chat riaperta conserva il suo contesto senza contaminare altre chat; un errore provider non distrugge la bozza e si risolve nella conversazione.

### R2 — Interrogazione di memorie e manuali

**Obiettivo:** risposte affidabili e citate, senza scritture di dominio.

#### Memorie della campagna

- Intent esplicito domanda/risposta oltre al grounding usato nelle generazioni.
- Ricerca prioritaria per nome degli elementi Wiki, mappe e missioni citati dal GM.
- Fonti visibili; se un fatto non è in memoria, dichiararlo.
- Rispettare la disponibilità reale della memoria per ogni tipo di campagna: nessuna base memoria viene inventata automaticamente.

#### Manuali D&D 5e

- Capacità solo consultiva: nessun comando “applica questa regola”.
- Mostrare manuale e pagina/sezione quando disponibili, con stato ufficiale, supporto, non trovata o conflitto.
- Citazioni brevi e conformi; nessun testo ricostruito viene presentato come fonte ufficiale.

**Accettazione:** domande su memoria e manuali restituiscono fonti corrette; una fonte assente non produce falsa certezza.

### R3 — Missioni Long come pacchetti revisionabili

**Obiettivo:** creare missioni solo per campagne long, usando il dominio missioni già esistente.

#### Flusso dei pacchetti

1. Il GM chiede, ad esempio, tre missioni di grado D.
2. L'Assistente produce un **piano**, non bozze dettagliate: massimo cinque proposte per pacchetto. Ogni proposta contiene grado, titolo, premessa, committente, luogo e riferimenti canonici.
3. Il GM approva, modifica, scarta o seleziona le proposte da sviluppare.
4. Solo le proposte selezionate diventano bozze dettagliate indipendenti.
5. Per ogni missione, PNG, luoghi, oggetti e relazioni vengono prima proposti solo in testo. Nessuna bozza Wiki è creata senza approvazione specifica del GM.
6. Le missioni selezionate sono salvabili singolarmente o in gruppo; il fallimento di una non blocca le altre.

**Schema minimo:** grado, titolo, committente, ubicazione, paga, urgenza, descrizione, punti ricompensa e stato iniziale open.

**Accettazione:** la richiesta di tre missioni non genera automaticamente testo lungo o Wiki. Dopo l'approvazione, ogni missione selezionata è salvabile e indicizzata nella memoria della campagna.

### R4 — Nuovi PG e PDF in chat

**Obiettivo:** creare un nuovo personaggio giocante dall'inizio alla fine, riusando generatore e PDF esistenti come motore di dominio.

- Scope iniziale: solo nuovi PG; nessuna modifica AI di PG esistenti.
- L'Assistente raccoglie dati e preferenze, consulta i manuali ufficiali e produce una bozza completa.
- Campi non determinabili con sicurezza non vengono inventati: il GM li completa nell'interfaccia del generatore incorporata nella chat.
- L'handoff precompila il generatore PDF; il generatore esistente resta la sorgente finale per le scelte manuali.
- PG e PDF restano bozze fino alla conferma. Alla conferma si salva il PG, si genera e associa il PDF. Nessun successo è comunicato finché entrambi sono disponibili.

**Accettazione:** il GM completa e stampa una scheda senza lasciare l'Assistente. Un errore PDF mantiene la bozza e si recupera nella stessa chat.

### R5 — Creazione campagne da prompt

**Obiettivo:** creare una campagna D&D 5e interamente in chat.

#### Tipi

- oneshot e quest: stesso comportamento del sito; cambia solo l'etichetta scelta.
- long: abilita i moduli long già presenti, comprese le missioni.

#### Flusso obbligatorio

1. Senza campagna selezionata, il GM chiede di crearne una.
2. L'Assistente prepara una bozza con nome, tipo, descrizione, tono, note GM, visibilità privata e copertina generata automaticamente.
3. Nome, testo e immagine sono modificabili via prompt. La copertina è obbligatoria: se fallisce, la chat conserva tutto il contesto e permette retry o correzione; la campagna non viene creata senza copertina.
4. Alla conferma, un adapter crea campagna, ownership GM, visibilità privata e copertina come un unico risultato percepito.
5. Solo dopo successo effettivo viene creato e aperto un thread dedicato alla nuova campagna.
6. Se il prompt iniziale è vago, l'Assistente propone il prossimo passo — struttura, prima missione, Wiki, PNG o luoghi — e attende istruzioni. Non crea dati canonici automaticamente.

**Fuori scope:** template, sistemi diversi da D&D 5e, iscrizioni e contenuti giocatore generati senza richiesta.

**Accettazione:** una oneshot, quest e long possono essere create senza uscire dalla chat; sono private, assegnate al GM, con copertina approvata e nuovo thread contestuale.

### R6 — Scene, mappe, overlay e Fog of War

**Stato:** programma futuro bloccato da una riprogettazione del dominio.

**Risultato finale:** generazione completa di una scena con mappa, aree Fog of War e componenti collegati. Non aggiungere prompt AI al sistema attuale.

Prima di implementare generazione, approvare un piano dedicato che definisca:

- ownership e ciclo di vita distinti di scena, mappa, overlay e regioni FoW;
- modello dati, relazioni, versioning e azioni GM;
- editor umano, anteprima giocatore e comportamento live;
- input/output AI, revisioni e confine tra tecnica e narrativa;
- migrazione del dato esistente e rollback.

Solo dopo questa discovery l'AI potrà proporre una specifica di scena e, con conferma, artefatti tecnici.

## Convergenza futura del legacy

Ogni capacità è valutata separatamente dopo uso live. Per convergere un percorso legacy servono:

1. flusso chat completo e verificato;
2. correttezza della persistenza e dei permessi;
3. recupero degli errori senza uscire dall'Assistente;
4. feedback GM positivo e nessuna regressione del percorso esistente.

Senza queste prove il legacy resta disponibile. Non esiste una data automatica di rimozione.

## Matrice minima di verifica

Per ogni capacità verificare:

- utente non autenticato e player respinti prima di retrieval, provider e write;
- GM autorizzato e GM non autorizzato su un'altra campagna;
- richiesta corretta, ambigua, fonte assente e provider fallito;
- modifica parziale e conflitto di revisione;
- conferma, scarto, retry e salvataggio parziale dei pacchetti;
- persistenza reale, autorizzazione e riapertura della chat;
- test del contratto, build e un flusso manuale autenticato.

## Fuori scope finché non approvato

- AI per giocatori;
- sistemi diversi da D&D 5e;
- modifiche AI a PG esistenti;
- template di campagna;
- PNG, luoghi, missioni o Wiki creati automaticamente senza conferma;
- rimozione o refactor del legacy;
- generazione Scene/FoW/mappe prima della riprogettazione del dominio.
