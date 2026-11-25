# Audit della scheda PG Long per Antigravity

Preparato il 25 novembre 2026 dall’audit della copia di lavoro di Barber & Dragons. Il report riguarda la compilazione e l’uso della scheda PG nelle campagne `long` sul sito e nelle app iOS e Android.

**Priorità proposta.** Prima del rifacimento dell’interfaccia, allineare il significato e la provenienza dei dati letti dai tre client. Oggi anagrafica, scheda tecnica e risorse di gioco hanno percorsi di scrittura diversi. Alcuni campi sono duplicati e il sito, l’app e il server possono scegliere valori diversi per lo stesso personaggio.

## Percorsi di inserimento attuali

| Percorso | Attore e persistenza |
| --- | --- |
| Creazione e assegnazione | Il GM/Admin crea il PG dal registro web. Nome, classe, sottoclasse, livello, CA, PF correnti, retroscena, riferimenti al ritratto e al PDF finiscono in `campaign_characters`. Le scelte di razza e background alimentano anche uno snapshot di regole derivate. L’assegnazione al giocatore avviene a parte tramite `assigned_to`. [Creazione](../src/app/campaigns/character-actions.ts#L345) · [Assegnazione](../src/app/campaigns/character-actions.ts#L877) |
| Import e recupero | L’import da catalogo copia dati di base e PDF e ricalcola le regole derivate. Lo script di recupero può inserire dati strutturati parziali dai campi di un PDF compilabile, con provenienza `recovered` e controllo della revisione. Il normale upload del PDF Long allega il file. [Catalogo](../src/app/campaigns/character-catalog-actions.ts#L190) · [Recupero PDF](../scripts/recover-character-sheets.ts#L13) · [Upload](../src/app/campaigns/character-actions.ts#L461) |
| Compilazione tecnica | Il GM/Admin apre **Scheda manuale** dal registro web. Inserisce caratteristiche, abilità, tiri salvezza, attacchi, equipaggiamento, lingue, competenze, privilegi, incantesimi e PF massimi. Il salvataggio con controllo della revisione scrive `rules_snapshot.character_sheet`, aggiorna alcune colonne anagrafiche e mantiene le risorse già registrate. [Editor Long](../src/components/characters/long-character-sheet-editor.tsx#L128) · [Scrittura Long](../src/app/campaigns/character-actions.ts#L798) |
| Risorse del giocatore | Sul sito il giocatore aggiorna PF, PF temporanei, ispirazione e slot usati. Le app aggiungono riposi, dadi vita, usi delle capacità, tiri salvezza contro morte e monete. Entrambi inviano operazioni a `PATCH /api/mobile/characters/[id]/state` con verifica di permessi, validazione lato server e controllo di `updated_at`. I PF correnti e le monete stanno in colonne dedicate. Le altre risorse persistono nello snapshot. [Web](../src/components/characters/character-sheet-resources.tsx#L73) · [App](../mobile/src/hooks/usePlayerCharacter.ts#L383) · [API](../src/app/api/mobile/characters/%5Bid%5D/state/route.ts#L6) |
| Progressione e ricompense | Il GM può aggiornare PE e confermare il passaggio di livello. La chiusura della sessione può aggiornare PE e assegnare ricompense in monete. Tenere conto di queste scritture quando si interviene sui salvataggi della scheda. [PE e chiusura](../src/app/campaigns/actions.ts#L2124) · [Economia](../src/app/campaigns/actions.ts#L2462) · [Level-up](../src/app/campaigns/character-actions.ts#L999) |

## Riscontri e criteri di accettazione

### Priorità alta · Un’azione estranea ai PF li porta da assenti a zero

Riprodotto in locale con una riga avente `hit_points: null`. Attivare l’ispirazione o aggiornare le monete restituisce `hit_points: 0`. L’API include i PF correnti nell’aggiornamento anche per queste operazioni. Un personaggio con salute ancora da compilare può così risultare a zero PF. [Operazioni](../mobile/src/lib/character-state.ts#L74) · [Persistenza API](../src/app/api/mobile/characters/%5Bid%5D/state/route.ts#L33)

**Accettazione.** Partire da PF correnti assenti, salvare ispirazione, monete o slot e rileggere il record. I PF restano assenti. Ripetere con PF correnti pari a zero e verificare che rimangano zero. Danno, cura e riposi continuano ad applicare i vincoli esistenti.

### Priorità alta · I client possono leggere valori diversi per lo stesso PG

Per i PF massimi, web e server preferiscono `character_sheet.hpMax`. L’app preferisce `rules_snapshot.max_hp`. Per classe e CA, il flusso **Modifica personaggio** aggiorna le colonne e conserva la scheda tecnica esistente. La vista web usa i valori di registro con i propri fallback, mentre la proiezione mobile può preferire la scheda tecnica. Le due funzioni GM applicano anche vincoli diversi sul livello e sulla sottoclasse. [Vista web](../src/components/characters/character-sheet-panel.tsx#L98) · [Risorse web](../src/components/characters/character-sheet-resources.tsx#L49) · [Proiezione mobile](../mobile/src/hooks/usePlayerCharacter.ts#L62) · [Modifica personaggio](../src/app/campaigns/character-actions.ts#L650) · [Scrittura Long](../src/app/campaigns/character-actions.ts#L829)

**Accettazione.** Su un PG Long con colonne e snapshot discordanti, sito, iOS, Android e validazione server devono usare lo stesso valore effettivo per i campi condivisi. Provare una modifica del GM da ciascun percorso ancora disponibile e rileggere i dati da ogni client. Coprire schede manuali, schede recuperate parziali e personaggi con soli dati precedenti alla scheda strutturata. Conservare e rendere riconoscibile l’eventuale differenza fra livello del PDF recuperato e livello di registro.

### Priorità alta · Il level-up può sovrascrivere le risorse salvate durante il ricalcolo

Il level-up legge lo snapshot, ricalcola le regole e riscrive lo snapshot per ID. La scrittura manca del controllo di `updated_at` adottato dall’editor Long e dall’API delle risorse. Se un giocatore consuma uno slot durante il ricalcolo, la scrittura del GM può ripristinare lo stato precedente. Rischio rilevato dal codice. [Level-up](../src/app/campaigns/character-actions.ts#L1010) · [Scrittura con revisione](../src/app/campaigns/character-actions.ts#L859)

**Accettazione.** Intercalare una spesa di risorsa del giocatore tra la lettura e la scrittura del level-up. Il salvataggio del GM preserva lo stato più recente oppure segnala il conflitto e permette di riprovare. Verificare la persistenza dopo la rilettura.

### Priorità media · L’editor rende difficile inserire righe e cancellare valori

Inventario, lingue e competenze vengono normalizzati a ogni battitura. L’editor elimina subito l’ultima riga vuota e rende difficile aggiungerne una digitando. La cancellazione del valore di un’abilità o tiro salvezza conserva quello precedente. Svuotare la CA conserva la colonna del registro e svuotare i PF massimi può lasciare attivo il valore precedente in `max_hp`. [Gestione input](../src/components/characters/long-character-sheet-editor.tsx#L91) · [Salvataggio](../src/app/campaigns/character-actions.ts#L829)

**Accettazione.** Digitare e incollare più righe, salvare e riaprire la scheda. Provare la cancellazione di un bonus, della CA e dei PF massimi dove consentita. Il valore effettivo dopo la rilettura deve rispettare la scelta del GM anche quando era presente un valore precedente. Provare separatamente il valore esplicito zero.

## Sequenza proposta

1. Partire da [PRODUCT.md](../PRODUCT.md) e dallo stato Git. La copia esaminata includeva modifiche locali alla scheda mobile e ad altri flussi. Preservare il lavoro già presente.
2. Concordare per classe, CA, livello, PF massimi e risorse quale dato prevalga, come si consultino le schede precedenti e come il GM possa cancellare un valore. Usare la stessa regola nelle viste, nell’editor e nella validazione server. Verificare la compatibilità dei flussi Quest, Oneshot e Torneo perché usano parti dello stesso codice.
3. Correggere le scritture che possono cambiare campi estranei all’operazione o perdere aggiornamenti concorrenti. Poi correggere l’input manuale. Usare un PG Long parziale assegnato a un giocatore come prova end-to-end.
4. Dopo il collaudo dei dati, definire il rifacimento dell’interfaccia scheda con Alessandro. La copertura funzionale dei controlli web e mobile può essere decisa insieme al nuovo flusso.

## Evidenze da riportare ad Alessandro

L’audit ha verificato la copia di lavoro in sola lettura. Sono passati **33 test mirati** su modello scheda, risorse, revisione, PE e recupero PDF. Il caso dei PF correnti da assenti a zero è stato riprodotto separatamente chiamando la funzione locale. Il comportamento del sito pubblicato, delle build installate e la completezza delle schede in produzione restano da verificare.

Per un successivo incarico di implementazione, restituire il diff, l’esito delle verifiche per ciascun criterio e la matrice web, iOS e Android. Evidenziare eventuali conflitti nei dati esistenti che richiedono una decisione di Alessandro.
