# Piano Tecnico Revisionato: Sistema di Condizioni, Buff & Concentrazione (GM Screen 2.0)

**Data revisione:** 16 Ottobre 2026  
**Ambito:** GM Screen 2.0 (`GmTacticalScreen`, `InitiativeTracker`, `ActiveCombatantCard`, `TacticalInitiativeCards`, `ConditionsCell`, `GmScreenLongStateProvider`, `GmRemote`, `FightProjection`)  
**Edizione Regole Verificata:** D&D 5a Edizione (2014) in lingua italiana  
**Contesto d'uso:** Gioco di ruolo **dal vivo al tavolo** — soluzione proporzionata all'architettura esistente del GM Screen, senza introdurre infrastrutture esterne non necessarie.

---

## 1. Audit del Repository: Fatti Verificati nel Codice vs Ipotesi

Ogni scelta progettuale di questo piano è ancorata a quanto **effettivamente verificato nel codice sorgente**:

### 1.1 Edizione delle regole utilizzata dal progetto (Verificato)
- **[`src/lib/combat-conditions.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/combat-conditions.ts#L1-L153)**: contiene i testi estratti da `public/manuals/manuale_giocatore.md`, Appendice A, pp. 290–292 (edizione **D&D 5e 2014** italiana, es. *Indebolimento* strutturato su 6 livelli).
- **[`src/lib/torneo/__tests__/initiative-conditions.test.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/torneo/__tests__/initiative-conditions.test.ts#L22-L33)**: esegue `assert.equal(COMBAT_CONDITIONS.length, 15)` e verifica che ogni singolo paragrafo di `COMBAT_CONDITIONS` sia contenuto in `public/manuals/manuale_giocatore.md`. Pertanto l'export `COMBAT_CONDITIONS` **non va alterato nei suoi 15 elementi**, ma affiancato dal nuovo catalogo esteso (`COMBAT_STATUS_CATALOG`).
- **[`src/lib/manual-book-catalog.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/manual-book-catalog.ts#L3-L12)**: i manuali indicizzati sono 5e 2014 (*Manuale del Giocatore*, *Manuale dei Mostri*, *Guida di Xanathar*, *Calderone di Tasha*, *Mostri del Multiverso*, *Eberron*, *Van Richten*, *DMG*).

### 1.2 Stato attuale di `InitiativeEntry` e `InitiativeTrackerState` (Verificato)
- In **[`src/components/gm/initiative-tracker.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/initiative-tracker.tsx#L101-L155)**, `InitiativeEntry` memorizza solo `conditions?: CombatConditionId[]` (array piatto di ID stringa), `armorClass: number` (intero singolo), `hp: number`, `maxHp: number`.
- **Verifica PF Temporanei (`tempHp`)**: `temp_hp` esiste nella scheda personaggio ([`src/components/characters/character-sheet-resources.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/characters/character-sheet-resources.tsx#L52) e [`mobile/src/screens/player/CharacterSheetScreen.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/mobile/src/screens/player/CharacterSheetScreen.tsx#L145)), ma **non esiste oggi su `InitiativeEntry`**.
- **Bug esistente verificato**: in **[`src/components/gm/screen-tactical/tactical-initiative-cards.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/screen-tactical/tactical-initiative-cards.tsx#L62)** la mappa `CONDITION_ICONS` usa la chiave `privo_di_sensi` (con underscore) anziché `privo-di-sensi` (con trattino).

### 1.3 Percorsi di Persistenza, Sincronizzazione e Telecomando/Mobile (Verificati)
Nel codice esistono **due modalità di esecuzione** per `InitiativeTracker` e **otto snodi di sincronizzazione**:
1. **Modalità Controllata (`isControlled === true`)**: usata sia in `GmScreenLongLayoutV2` sia in `GmScreenLegacyLayoutV2` (poiché anche [`gm-screen-legacy-layout-v2.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/gm-screen-legacy-layout-v2.tsx#L47) avvolge il workspace in `GmScreenLongStateProvider`!) e in Torneo (`useTorneoMatchInitiativeSync`). Lo stato autorevole risiede nel parent (`GmScreenLongStateProvider` in [`src/components/gm/gm-screen-long-state.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/gm-screen-long-state.tsx#L348)) e viene passato a `InitiativeTracker` tramite `value` e `onChange`.
2. **Modalità Non Controllata (`isControlled === false`)**: usata quando `InitiativeTracker` è montato fuori da `GmScreenLongStateProvider`.
3. **Duplicazione critica rilevata tra PC e Telefono**:
   - Quando il Master usa il **telefono** (pagina web [`src/components/gm/gm-remote-initiative-panel.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/gm-remote-initiative-panel.tsx) o app mobile [`mobile/src/screens/gm/GmCombatTrackerScreen.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/mobile/src/screens/gm/GmCombatTrackerScreen.tsx)), i comandi arrivano a [`GmRemoteCommandBridge`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/gm-remote-command-bridge.tsx#L131-L147).
   - Se `initiativeHandlers` è passato (come avviene in `GmScreenLongLayoutV2` riga 300 e `GmScreenLegacyLayoutV2` riga 143), i comandi remoti eseguono le funzioni definite in [`gm-screen-long-state.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/gm-screen-long-state.tsx#L78-L98) (`advanceRemoteTurn`, `adjustInitiativeHp`, `setHp`, `setConditions`, `toggleCondition`, `removeCombatant`), **bypassando completamente** i metodi interni di `InitiativeTracker` (`nextTurn`, `applyHpChange`, ecc.)!
   - Inoltre, in [`mobile/src/screens/gm/GmCombatTrackerScreen.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/mobile/src/screens/gm/GmCombatTrackerScreen.tsx#L9-L16), l'app mobile invia 3 ID non allineati a `COMBAT_CONDITIONS` (`'esausto'`, `'sotto_tiro'`, `'concentrato'`), che oggi vengono scartati da `isValidInitiativeRemotePayload` in [`src/lib/gm-remote/initiative-commands.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/gm-remote/initiative-commands.ts#L280-L282).

### 1.4 Struttura reale di `rules_snapshot` nelle Schede PG (Verificato)
- In **[`src/components/gm/initiative-tracker.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/initiative-tracker.tsx#L1192-L1243)**, `addPcEntry` riceve `rules_snapshot` ma lo usa solo per `spellSlotsForCharacter`.
- **Verifica importante su `spellsListMd`**: in **[`src/lib/character-rules-snapshot.server.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/character-rules-snapshot.server.ts#L80-L110)**, la funzione `extractSpellListByMaxLevel` popola `rules_snapshot.spellsListMd` con **l'intera lista di classe del Manuale del Giocatore fino al livello massimo di slot**, e **non** con gli incantesimi scelti o preparati dal personaggio!
- Gli incantesimi specifici del personaggio si trovano invece in:
  - `rules_snapshot.character_sheet.spells` (`CharacterSheetSpell[]` definito in [`mobile/src/lib/character-sheet.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/mobile/src/lib/character-sheet.ts#L9-L19), strutturato con `name`, `level`, `concentration?: boolean`, `summary`, `fullTextMd`);
  - `rules_snapshot.spellsDetailsMd` (`Record<string, string>` con i testi Markdown degli incantesimi selezionati).
- Anche per gli incantesimi presenti in `character_sheet.spells`, il formato scheda non distingue tra "incantesimo nel libro/lista del PG" e "incantesimo preparato oggi dopo l'ultimo riposo lungo".

---

## 2. Specifiche Architetturali (Risoluzione dei 7 Punti di Revisione)

### 2.1 Identità degli Effetti e Collegamento con la Concentrazione
Un semplice array `conditions: CombatConditionId[]` o una mappa indicizzata per `conditionId` con un solo `sourceCasterId` non permette di distinguere:
- **Due fonti diverse che applicano la stessa condizione allo stesso bersaglio** (es. Goblin 1 è `Spaventato` dall'incantesimo a concentrazione *Paura* di Lyra e contemporaneamente `Spaventato` dall'*Ira Intimidatoria* di Thorin);
- **Due effetti applicati dallo stesso caster, uno a concentrazione e uno non a concentrazione** (es. un Chierico usa *Incanalare Divinità* non a concentrazione e poi mantiene la concentrazione su *Benedizione* o *Blocca Persone*).

#### Modello dati delle istanze (`CombatEffectInstance` & `ActiveConcentration`)
1. **Ogni applicazione di stato è un'istanza con `effectId` univoco**:
   ```ts
   export type CombatEffectInstance = {
     effectId: string;                  // ID univoco dell'istanza (es. "eff-1729001-abc")
     statusId: CombatStatusId;          // ID dal catalogo ("benedizione", "prono", ...) oppure "custom"
     customLabel?: string;              // Etichetta visibile per stati custom o varianti (es. "Guardiani Spirituali (Aura)")
     category: "condition" | "buff" | "tactical";
     targetId: string;                  // entry.id del combattente che subisce/riceve l'effetto
     sourceCasterId?: string;           // entry.id di chi ha originato l'effetto (opzionale se manuale/ambientale)
     sourceLabel?: string;              // es. "Benedizione (Lyra)" o "Veleno del Ragno"
     concentrationId?: string;          // ID univoco della specifica concentrazione da cui dipende (assente se l'effetto NON dipende da concentrazione)
     duration?: CombatEffectDuration | null;
     savePrompt?: {                     // Presente SOLO se questo specifico effetto concede un TS ripetuto
       timing: "start_of_turn" | "end_of_turn";
       ability: keyof SavingThrowsMap;
       dc: number;
     } | null;
     exhaustionLevel?: number;          // 1..6 se statusId === "indebolimento"
     createdAtRound: number;
   };
   ```
2. **Ogni concentrazione attiva ha un `concentrationId` univoco e la lista esplicita dei suoi effetti**:
   ```ts
   export type ActiveConcentration = {
     concentrationId: string;           // ID univoco di questa istanza di concentrazione (es. "conc-1729001-xyz")
     casterId: string;                  // entry.id del combattente che mantiene la concentrazione
     spellName: string;                 // Nome dell'incantesimo/effetto (es. "Benedizione" o "Guardiani Spirituali")
     linkedEffectIds: string[];         // Lista degli effectId creati da questa concentrazione (può essere [] per Guardiani Spirituali!)
     startedRound: number;
   };
   ```
3. **Regole di coesistenza e rimozione selettiva**:
   - **Concentrazione senza condizioni sui bersagli** (es. *Guardiani Spirituali*, *Sfera Infuocata*, *Muro di Fuoco*): imposta `activeConcentration` sul caster con `linkedEffectIds: []`.
   - **Concentrazione con condizioni/buff sui bersagli** (es. *Benedizione* su Thorin e Gimli): crea un `concentrationId = "conc-1"`, crea due `CombatEffectInstance` (`"eff-1"` su Thorin, `"eff-2"` su Gimli) entrambe con `concentrationId: "conc-1"`, e salva `linkedEffectIds: ["eff-1", "eff-2"]`.
   - **Interruzione della concentrazione (`breakConcentration(state, casterId)`)**:
     - Legge `concId = caster.activeConcentration?.concentrationId`.
     - Rimuove `activeConcentration` dal caster.
     - Su tutti i combattenti, rimuove **esclusivamente** le `CombatEffectInstance` che hanno `effect.concentrationId === concId` (o `effect.effectId` incluso in `linkedEffectIds`).
     - **Qualsiasi altro effetto** sullo stesso bersaglio — anche se applicato dallo stesso `sourceCasterId` (ma senza quel `concentrationId`) o se avente lo stesso `statusId` ma proveniente da un'altra fonte (`effectId` diverso) — **resta intatto**.
   - **Derivazione automatica di `entry.conditions`**:
     - `entry.conditions` viene sempre ricalcolato automaticamente da `entry.activeEffects` come lista deduplicata di `statusId` (`syncLegacyConditionsFromEffects(activeEffects)`). Finché almeno una `CombatEffectInstance` con `statusId === "spaventato"` rimane attiva su Goblin 1, `"spaventato"` resta presente anche in `entry.conditions`.

---

### 2.2 Durate, Cambio Turno e Casi Limite
In D&D 5e le durate brevi da combattimento non scadono a "inizio round globale", ma all'inizio o alla fine del turno di uno specifico combattente (solitamente chi ha lanciato l'effetto o chi lo subisce).

#### Modello `CombatEffectDuration`
```ts
export type CombatEffectDuration = {
  remainingTurns: number;               // Numero di occorrenze rimaste del turno-ancora (es. 1 = fino al prossimo turno; 10 = 1 minuto)
  tickOn: "turn_start" | "turn_end";    // Scatta all'inizio o alla fine del turno di anchorCombatantId
  anchorCombatantId: string;            // entry.id del combattente il cui turno fa avanzare il contatore
  anchorCombatantName?: string;         // Nome salvato per chiarezza nel tooltip UI
};
```
- **Effetti senza durata automatica (`duration: null`)**: condizioni come *Prono*, *Afferrato*, *Pietrificato* o buff lunghi/consumabili come *Ispirazione Bardica* (10 minuti fuori scala rispetto al singolo scontro) hanno `duration: null` e non scadono da soli col cambio turno.

#### Sequenza esatta su `nextTurn` (passaggio dal combattente $A$ al combattente $B$)
1. **Fine turno del combattente uscente $A$**:
   - **Promemoria TS di fine turno**: se $A$ ha in `activeEffects` istanze con `savePrompt?.timing === "end_of_turn"`, viene accodato un promemoria non bloccante `PendingSaveReminder` (con bottone `[Superato -> Rimuovi questo effetto]` e `[Fallito -> Mantieni]`).
   - **Tick `turn_end` ancorati ad $A$**: su tutti i combattenti in `entries`, ogni `CombatEffectInstance` con `duration.tickOn === "turn_end"` e `duration.anchorCombatantId === A.id` decrementa `remainingTurns` di 1. Se `remainingTurns <= 0`, l'istanza viene rimossa e registrata nel log di scadenza del turno.
2. **Attraversamento di eventuali mostri morti saltati (`isDeadMonster`)**:
   - In [`initiative-tracker.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/initiative-tracker.tsx#L721-L727), il ciclo `do ... while (isDeadMonster(entries[next]))` salta i mostri morti.
   - Se un mostro morto $M$ viene saltato ma esistono ancora su altri combattenti effetti non a concentrazione con `anchorCombatantId === M.id`, durante il salto vengono processati sia i tick `turn_start` sia i tick `turn_end` ancorati a $M.id$, così nessun effetto ancorato a un mostro appena ucciso resta bloccato all'infinito.
3. **Inizio turno del nuovo combattente attivo $B$**:
   - **Tick `turn_start` ancorati a $B$**: su tutti i combattenti, ogni `CombatEffectInstance` con `duration.tickOn === "turn_start"` e `duration.anchorCombatantId === B.id` (es. *Scudo +5 CA*, *Schivata*, *Aiuto* lanciati da $B$ nel giro precedente) decrementa `remainingTurns` di 1 e, se `<= 0`, scade e viene rimosso.
   - **Promemoria TS di inizio turno**: se $B$ ha istanze con `savePrompt?.timing === "start_of_turn"`, viene mostrato il relativo promemoria.

#### Comportamento nei Casi Limite
- **Tornare al turno precedente (`prevTurn`)**:
  - Manteniamo una coda locale degli ultimi 10 snapshot pre-avanzamento turno (`turnHistoryStack`).
  - Se il Master preme `Indietro` (`prevTurn`) subito dopo aver premuto `Turno Succ.` per annullare un avanzamento fatto per errore, il sistema **ripristina lo snapshot pre-`nextTurn`** (ripristinando `remainingTurns` e gli eventuali effetti scaduti in quel cambio turno).
  - Se invece il Master seleziona manualmente un turno con `handleSelectTurn(idx)` o usa `prevTurn` dopo aver già modificato lo stato del turno corrente, il cursore `currentTurnIndex` si sposta senza decrementare né alterare `remainingTurns`.
- **Riordinare l'iniziativa (`sortByInitiative`)**:
  - Poiché `anchorCombatantId`, `casterId` e `targetId` usano `entry.id` (e mai l'indice numerico nell'array `entries`), riordinare la lista non altera alcun collegamento e **non decrementa** alcuna durata.
- **Rimuovere un combattente dall'iniziativa (`removeEntry` / `removeCombatant`)**:
  - Se il combattente rimosso $R$ aveva `activeConcentration`, tutti gli effetti collegati a `R.activeConcentration.concentrationId` vengono rimossi dai bersagli.
  - Se restano effetti non a concentrazione su altri combattenti che avevano `duration.anchorCombatantId === R.id`, la loro `anchorCombatantId` viene riassegnata al rispettivo `targetId` (`tickOn: "turn_end"`), garantendo che continuino a scalare regolarmente.

---

### 2.3 Regole D&D 5e (2014) Effettivamente Supportate vs Manuali

#### A. Tiri Salvezza di Fine/Inizio Turno
- **Regola 5e**: La possibilità di ripetere un Tiro Salvezza a fine turno **non è una proprietà intrinseca della condizione** (es. *Avvelenato* da una pozione o *Paralizzato* da certi veleni non permette TS a ogni fine turno, mentre *Blocca Persone* sì; *Stordito* dal *Colpo Stordente* del Monaco termina a fine del prossimo turno del Monaco senza TS).
- **Cosa è automatizzato**: Il catalogo condizioni **non** imposta mai un TS di fine turno automatico sulla base del solo `statusId`. Il promemoria di TS compare **solo** quando l'istanza `CombatEffectInstance` possiede `savePrompt` valorizzato (perché creato da un'azione/incantesimo il cui testo specifica *"può ripetere il tiro salvezza alla fine di ciascuno dei suoi turni"* o perché attivato con l'apposita spunta dal Master).

#### B. Calcolo della CA (`computeEffectiveArmorClass`)
`InitiativeEntry.armorClass` è un singolo intero che rappresenta la **CA attuale di scheda** del combattente. Il sistema non conosce la formula con cui è stata calcolata sulla scheda (es. se include già uno scudo fisico, il modificatore di Destrezza o *Armatura Magica*). Pertanto:
1. **Formule di CA sostitutive (NON automatizzate nel calcolo numerico)**:
   - Stati come *Armatura Magica* ($13 + \text{DES}$) o *Pelle Corteccia* ($\min 16$) **non hanno `acBonus` numerico** nel catalogo (`acBonus: undefined`), perché sommare $+3$ a una CA che potrebbe già includere un'armatura o *Armatura Magica* stessa produrrebbe un calcolo errato. Restano badge informativi visibili, lasciando al Master l'eventuale modifica manuale della CA base.
2. **Copertura (Mutuamente Esclusiva, mai sommata tra sé)**:
   - `copertura-mezza` ($+2\text{ CA}$) e `copertura-tre-quarti` ($+5\text{ CA}$) appartengono al gruppo esclusivo `"cover"`.
   - Applicare `copertura-tre-quarti` a un bersaglio rimuove automaticamente `copertura-mezza` (e viceversa). Anche se entrambe fossero presenti in dati sporchi, `computeEffectiveArmorClass` applica solo $\max(+2, +5) = +5$.
3. **Non cumulabilità dello stesso effetto (Regola 5e Cap. 10 — Combinare Effetti Magici)**:
   - Se un bersaglio ha due istanze con lo stesso `statusId` (es. due *Scudo della Fede* da due caster diversi), il bonus CA di `scudo-della-fede` ($+2$) viene contato **una sola volta**.
4. **Bonus/Malus cumulabili supportati**:
   - Si sommano tra `statusId` distinti esclusivamente i modificatori piatti:
     - `scudo-della-fede`: $+2$
     - `velocita` (*Haste*): $+2$
     - `scudo` (*Shield*): $+5$
     - Copertura (`copertura-mezza` $+2$ **oppure** `copertura-tre-quarti` $+5$)
     - `lentezza` (*Slow*): $-2$
5. **Trasparenza in UI**:
   - Il badge CA mostra sempre il valore effettivo e il breakdown in tooltip: es. `CA 20` con sottotitolo/tooltip `Base 16 · +2 Scudo della Fede · +2 Copertura Mezza`.

#### C. Riepilogo Automatismi Affidabili vs Gestione Manuale
| Meccanica D&D 5e (2014) | Gestione nel Sistema | Motivazione |
| :--- | :--- | :--- |
| **Concentrazione unica per caster** | **Automatica** | Attivare una nuova concentrazione sullo stesso caster interrompe la precedente e rimuove solo gli `effectId` collegati al vecchio `concentrationId`. |
| **Perdita concentrazione a 0 PF / Morte / Condizioni incapacitanti** | **Automatica** | Scendere a `0 PF` o ricevere `incapacitato`, `paralizzato`, `pietrificato`, `privo-di-sensi`, `stordito` interrompe la concentrazione del caster e rimuove gli effetti collegati. |
| **Calcolo CD TS Concentrazione su danno** | **Automatico (con conferma esito del Master)** | Calcola $\text{CD} = \max(10, \lfloor\text{danno}/2\rfloor)$ per ogni singola fonte di danno e mostra il bonus TS COS del caster; il Master clicca `Superato` o `Fallito` in base al tiro di dado fisico al tavolo. |
| **Bonus CA piatti (+2/+5/-2) e Coperture** | **Automatico** | Deduplica per `statusId`, applica mutua esclusione tra coperture e mostra `CA Base ± Modificatori`. |
| **Formule CA base (*Armatura Magica*, *Pelle Corteccia*)** | **Manuale (solo badge)** | `InitiativeEntry` non conosce l'armatura indossata né il mod. DES separato. |
| **Vantaggio / Svantaggio / +1d4 (*Benedizione*, *Avvelenato*, *Prono*)** | **Promemoria visivo (dado fisico al tavolo)** | Giocando dal vivo i giocatori tirano dadi fisici; la card mostra i badge di avviso chiari (`✨ +1d4 a TxC e TS`, `⚠️ Svantaggio ai TxC`). |

---

### 2.4 Danni, Guarigione, PF Temporanei e Coda TS Concentrazione

#### 1. Distinzione tra Danno, Guarigione e Correzione Manuale dei PF
Nel codice attuale ([`initiative-tracker.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/initiative-tracker.tsx#L870-L917)), i pulsanti `-10/-5/-1`, l'input `±danno` e la modifica diretta della cella HP chiamano tutti `applyHpChange(entryId, nextHp)`.  
Per evitare falsi alert di concentrazione quando il Master corregge un refuso nei PF e per **impedire qualsiasi doppia sottrazione del danno**, sostituiamo la modifica diretta con una funzione pura unica **`applyCombatHpMutation(state, mutation)`** che riceve **lo stato PRIMA della modifica**:

```ts
export type CombatHpMutation =
  | { kind: "damage"; entryId: string; amount: number }      // amount > 0: danno inflitto da 1 fonte
  | { kind: "heal"; entryId: string; amount: number }        // amount > 0: guarigione
  | { kind: "set_exact"; entryId: string; exactHp: number; exactTempHp?: number }; // correzione manuale PF
```

- **Contratto pre/post danno**:
  - I chiamanti (pulsanti `-10, -5, -1`, input `±danno`, comando remoto `initiative.adjust_hp` con `delta < 0`) passano `{ kind: "damage", entryId, amount: Math.abs(delta) }` **senza sottrarre `amount` prima di invocare la funzione**.
  - `applyCombatHpMutation` legge `entry.hp` e `entry.tempHp ?? 0` dallo stato corrente e calcola internamente i nuovi valori.
- **Gestione PF Temporanei (`tempHp`)**:
  - Su `kind: "damage"`, `absorbedByTemp = Math.min(entry.tempHp ?? 0, amount)`, `nextTempHp = (entry.tempHp ?? 0) - absorbedByTemp`, `hpLoss = amount - absorbedByTemp`, `nextHp = Math.max(0, entry.hp - hpLoss)`.
  - Come da regola D&D 5e (PHB p. 198), anche se parte o tutto il danno viene assorbito dai PF temporanei, **il TS di Concentrazione si attiva comunque sull'intero `amount` subito** ($\text{CD} = \max(10, \lfloor\text{amount}/2\rfloor)$).
- **Comportamento di `kind: "heal"`**:
  - Aumenta `entry.hp` fino a `entry.maxHp` (senza modificare `tempHp` né `damageTaken`). Non attiva alcun check di concentrazione.
- **Comportamento di `kind: "set_exact"` (modifica cella HP o `initiative.set_hp`)**:
  - Imposta direttamente `entry.hp = clamp(exactHp, 0, maxHp)` (e `tempHp` se fornito).
  - **Non** incrementa `damageTaken` e, se `nextHp > 0`, **non** apre alert di TS Concentrazione (trattandosi di rettifica manuale del valore).
  - Se invece `nextHp === 0` (es. bottone `K.O.` da mobile che invia `initiative.set_hp` con `hp: 0`), la creatura scende a 0 PF e la sua eventuale `activeConcentration` viene automaticamente interrotta con rimozione degli effetti collegati.

#### 2. Più Fonti di Danno e Coda `pendingConcentrationChecks`
In D&D 5e, subire danni da più fonti separate richiede un TS di Concentrazione separato per ciascuna fonte. Pertanto in `InitiativeTrackerState` manteniamo una coda **`pendingConcentrationChecks?: PendingConcentrationCheck[]`**:
```ts
export type PendingConcentrationCheck = {
  checkId: string;
  casterId: string;
  casterName: string;
  concentrationId: string;
  spellName: string;
  damageAmount: number;
  dc: number;                     // Math.max(10, Math.floor(damageAmount / 2))
  conSaveBonus: number;           // entry.savingThrows?.cos ?? 0
  hasBlessBonus: boolean;         // true se il caster ha attivo "benedizione" (+1d4)
};
```
- Se un caster concentrato subisce due attacchi consecutivi (`-8` e `-16`), vengono accodati 2 check (`CD 10` e `CD 10`).
- Se il Master clicca `[ ✅ Superato ]` sul primo check, viene rimosso solo quel `checkId` dalla coda.
- Se il Master clicca `[ 💥 Fallito ]` su uno qualsiasi dei check (o se un terzo colpo porta il caster a `0 PF`), la concentrazione `concentrationId` viene interrotta, tutti gli effetti con quel `concentrationId` vengono rimossi dai bersagli e **tutti i restanti check in coda per quel `concentrationId` vengono automaticamente svuotati**.

---

### 2.5 Persistenza e Sincronizzazione (Tutti i Percorsi del Codice)

Ecco come i nuovi campi (`activeEffects`, `activeConcentration`, `tempHp` su `InitiativeEntry`, e `pendingConcentrationChecks` su `InitiativeTrackerState`) attraversano senza perdite tutti i percorsi:

| Percorso nel Codice | File e Linee Verificate | Intervento Previsto |
| :--- | :--- | :--- |
| **1. Normalizzazione e Migrazione Legacy** | [`src/components/gm/initiative-tracker.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/initiative-tracker.tsx#L167-L213) (`normalizeInitiativeEntry`, `sanitizeInitiativeTrackerState`) | Valida `activeEffects`, `activeConcentration`, `tempHp` e `pendingConcentrationChecks`. **Retro-compatibilità**: se un record salvato ha `conditions: ["prono"]` ma non `activeEffects`, genera automaticamente l'istanza `CombatEffectInstance` (`effectId: "legacy-${entry.id}-prono"`). Ricalcola sempre `entry.conditions` dagli `statusId` di `activeEffects`. |
| **2. Confronto di Uguaglianza Entries** | [`src/components/gm/initiative-tracker.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/initiative-tracker.tsx#L254-L290) (`areInitiativeEntriesEqual`) | Aggiunge il confronto di `tempHp`, `activeConcentration` e `activeEffects` (oltre a `pendingConcentrationChecks` nell'`useEffect` di sync controllato a riga 464). Senza questo, in modalità controllata (`GmScreenLongStateProvider`) le modifiche agli effetti non aggiornerebbero lo stato interno del tracker. |
| **3. Firma di Sincronizzazione** | [`src/components/gm/initiative-tracker.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/initiative-tracker.tsx#L225-L245) (`initiativeStateSyncSignature`) | Include `tempHp`, `activeConcentration`, `activeEffects` e `pendingConcentrationChecks` nel JSON della firma. Garantisce che anche attivare una concentrazione senza condizioni (es. *Guardiani Spirituali*) faccia scattare `onChange(state)` verso il parent e il salvataggio in `localStorage`/DB. |
| **4. Persistenza Sessione Long / Legacy V2** | [`src/components/gm/gm-screen-long-state.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/gm-screen-long-state.tsx#L672-L715) & [`src/lib/gm/session-xp-draft.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/gm/session-xp-draft.ts#L14) | In `gm-screen-long-state.tsx` riga 691, `initiativeDraftState` includerà anche `pendingConcentrationChecks`. `sessionXpDraftSchema` usa `snapshot: z.record(z.string(), z.unknown()).optional()`, quindi salva e ricarica l'intero `InitiativeTrackerState` senza richiedere migrazioni SQL. |
| **5. Persistenza Torneo Live** | [`src/lib/torneo/initiative-snapshot.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/torneo/initiative-snapshot.ts#L7-L20) & [`src/hooks/use-torneo-match-initiative-sync.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/hooks/use-torneo-match-initiative-sync.ts#L105-L126) | Entrambi delegano già a `sanitizeInitiativeTrackerState` e `initiativeStateSyncSignature`, quindi erediteranno automaticamente i nuovi campi. |
| **6. Logica Unificata PC + Telefono (GM Remote)** | [`src/components/gm/gm-screen-long-state.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/gm-screen-long-state.tsx#L78-L98) (`initiativeRemoteHandlers` righe 372–467) & [`src/lib/gm-remote/initiative-commands.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/gm-remote/initiative-commands.ts) | Eliminiamo la logica duplicata: sia `InitiativeTracker` sia `initiativeRemoteHandlers` in `gm-screen-long-state.tsx` invocheranno le **stesse funzioni pure** di `src/lib/fight-mode/state-transitions.ts` per cambio turno, danno/cura, toggle condizione, concentrazione e rimozione combattente. |
| **7. Protocollo Snapshot & Comandi Telecomando / Mobile** | [`src/lib/gm-remote/initiative-commands.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/gm-remote/initiative-commands.ts#L31-L290) & [`mobile/src/screens/gm/GmCombatTrackerScreen.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/mobile/src/screens/gm/GmCombatTrackerScreen.tsx#L9-L16) | `isValidInitiativeRemotePayload` accetterà tutti gli `statusId` del nuovo catalogo + mapperà gli alias mobile (`'esausto' -> 'indebolimento'`, `'concentrato' -> 'concentrazione'`). `toInitiativeRemoteSnapshot` esporrà `ac` effettiva e `activeConcentrationSpell?: string | null`. |
| **8. Secondo Schermo (`FightProjection`)** | [`src/lib/fight-mode/types.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/types.ts#L32-L58) & [`src/app/campaigns/[id]/fight-projection/page.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/app/campaigns/%5Bid%5D/fight-projection/page.tsx#L280-L303) | `FightProjectionState` mantiene `conditions` e aggiunge `activeConcentrationSpell?: string | null` su `activeCombatant` e `upcomingTurns`, renderizzando i Buff in verde/oro, le Condizioni in rosso/ambra, i Tattici in azzurro e il badge Concentrazione in viola. |

---

### 2.6 Estrazione dalle Schede (Dati Strutturati vs Deduzioni Markdown e Prevenzione Falsi Positivi)

#### 1. Separazione netta delle fonti dati per i PG
Quando un PG è in iniziativa (tramite `addPcEntry` o idratato da `availableCharacters` in `GmScreenLongStateProvider`):
- **Fonte Strutturata Affidabile (`rules_snapshot.character_sheet: CharacterSheetV1`)**:
  - `savingThrows`: se presenti sulla scheda, popolano direttamente `entry.savingThrows` (al posto della stima `estimatePcSaves`).
  - `weaponRows`: se presenti, popolano le armi reali mostrate in `ActiveCombatantCard` (al posto di `getDefaultPcWeapons`).
  - `spellSaveDc` e `spellAttackBonus`: popolano la CD Magia e il TxC Magico reali.
  - `spells` (`CharacterSheetSpell[]`): fornisce l'elenco degli incantesimi effettivamente presenti sulla scheda del PG, con il flag booleano `concentration`.
- **Fonte Testuale Markdown (`spellsDetailsMd`, `classPrivilegesMd`, `classFeaturesMd`, `subclassFeaturesMd`)**:
  - Usata **solo** per arricchire la descrizione degli incantesimi della scheda o per individuare privilegi di classe noti del PG (es. *Ispirazione Bardica*, *Ira*, *Incanalare Divinità*).
  - **Esclusione tassativa di `spellsListMd`**: come verificato in [`src/lib/character-rules-snapshot.server.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/character-rules-snapshot.server.ts#L80-L110), `spellsListMd` contiene l'intera lista di classe del PHB e **non verrà mai letto** dall'estrattore.
- **Gestione Incantesimi in Scheda vs Incantesimi Preparati**:
  - Poiché la scheda salvata non traccia quali incantesimi un Chierico/Mago ha preparato quella mattina al tavolo, gli incantesimi estratti da `character_sheet.spells` vengono presentati nella `ActiveCombatantCard` come **"Suggerimenti Rapidi dalla Scheda"** (non pre-attivati): il Master clicca sul chip solo quando il giocatore dichiara al tavolo di lanciare quell'incantesimo, e può sempre modificare bersagli, durata o CD nel popover prima di confermare.

#### 2. Prevenzione dei Falsi Positivi negli Statblock dei Mostri (`DenseStatblock`)
Per estrarre i chip di applicazione rapida dalle azioni dei mostri senza falsi positivi:
1. **Campi ignorati a priori**: `conditionImmunities`, `damageImmunities`, `damageResistances`, `damageVulnerabilities`, `senses`, `languages` non vengono mai passati all'estrattore di azioni.
2. **Analisi limitata a `actions`, `bonusActions`, `reactions`, `legendaryActions` (e `traits` offensivi)**:
   - Ogni frase del blocco viene spezzata per periodi (`.`, `;`).
   - **Filtro di esclusione difensivo/immunitario**: qualsiasi frase contenente pattern come `"immune"`, `"immunità"`, `"non può essere"`, `"vantaggio ai tiri salvezza contro"`, `"termina la condizione"`, `"rimuove"`, `"finché non è"`, `"se il [nome mostro] è"` viene **scartata**.
   - **Pattern di inflizione richiesta**: viene estratto un suggerimento solo se la frase contiene un predicato di inflizione sul bersaglio (es. `"il bersaglio deve superare un tiro salvezza... altrimenti è [condizione]"`, `"se fallisce, è [condizione]"`, `"il bersaglio è [afferrato/trattenuto/avvelenato/prono...]"`, `"cade prono"`).
3. **Controllo e correzione del Master**:
   - Il chip sotto l'azione del mostro (es. `[⚡ Applica Avvelenato · TS COS CD 13 ▾]`) apre un popover in cui il Master seleziona i bersagli, vede la frase originale dello statblock da cui è stato estratto e può spuntare/despuntare se richiede un TS a fine turno o una durata specifica prima di applicarlo.

---

### 2.7 Comandi IA e Vocali (Disambiguazione, Validazione, Auth GM, Idempotenza, Undo, Latenza)

1. **Tempi di risposta realistici**:
   - **Parser Locale Deterministico (`parseCombatCommandLocally`)**: eseguito sul client in `< 5 ms` senza rete per sintassi dirette (es. `"Benedizione su Thorin, Gimli"`, `"Lyra concentrazione Guardiani Spirituali"`, `"Goblin 2 prono"`).
   - **Interpretazione IA Server-Side (`interpretCombatCommandAction` via OpenRouter)**: latenza di rete tipica `800 ms – 2.5 s`, invocata su richiesta esplicita quando il comando parlato/scritto è discorsivo o complesso.
2. **Nessuna decisione autonoma su nomi ambigui o regole incerte**:
   - Se il comando cita `"Goblin"` e in iniziativa sono presenti `"Goblin 1"` e `"Goblin 2"` (o se un nome ha match parziale con più combattenti), il sistema **non sceglie mai un bersaglio arbitrario**: mostra nella barra una richiesta di disambiguazione con chip cliccabili (`[Goblin 1]`, `[Goblin 2]`, `[Tutti i Goblin]`).
   - L'IA non inventa mai regole, danni o CD non dichiarati: si limita a tradurre l'intento del Master in una lista di operazioni ammesse (`CombatCommandOperation[]`).
3. **Conferma Proposta, Prevenzione Doppie Applicazioni e Undo**:
   - Ogni risposta dell'IA viene presentata come **Proposta in Anteprima** con l'elenco delle singole operazioni (ciascuna deselezionabile) e i pulsanti `[ ✅ Applica ]` / `[ ✕ Annulla ]`.
   - Ogni invio è protetto da un `requestId` univoco e stato `isSubmitting` che blocca doppi invii; applicare una proposta salva lo stato precedente in `lastCommandUndoState`, mostrando per 15 secondi (o finché non avviene un'altra azione) il pulsante **`[ ↩ Annulla ultima operazione ]`**.
4. **Autorizzazione GM e Validazione Server-Side**:
   - La Server Action `src/app/campaigns/combat-ai-actions.ts` verifica l'autenticazione Supabase e che l'utente sia il **GM della campagna o Admin** (`campaign.gm_id === user.id || profile.role === "admin"`).
   - La risposta JSON del modello OpenRouter viene validata con **Zod**: sono ammessi solo `entryId` realmente presenti nello scontro, `statusId` appartenenti al catalogo (o `"custom"` con `customLabel` sanitizzata $\le 40$ caratteri) e interi positivi limitati per durate/CD/PF.

---

## 3. Piano di Sviluppo in 3 Consegne Verificabili

### Consegna 1: Catalogo Ampliato, Modello Istanze Effetti, Concentrazione Manuale/Collegata, Alert Danni & Persistenza/Sync
> **Stato di Implementazione:** Implementata localmente; test mirati, TypeScript ed ESLint superati il 16 ottobre 2026. La verifica interattiva del GM Screen, ricaricamento e proiezione resta da eseguire con un account GM autenticato.  
> **Test eseguiti in questa verifica:** 14/14 passati (`state-transitions.test.ts`, `stats-helper.test.ts`); `tsc --noEmit` senza errori; ESLint sui file coinvolti senza avvisi.  
> **Limite browser:** il GM Screen locale reindirizza a `/login`; `tests/e2e/.auth` è vuota. Non sono stati usati account o dati reali della campagna per simulare il flusso.  

Questa prima consegna costruisce tutte le fondamenta deterministiche, la UI manuale/rapida per condizioni, buff, stati custom e concentrazione, il calcolo CA, gli alert sui danni e la sincronizzazione completa PC/Telefono/Proiezione.

#### Comportamento Incluso
- Catalogo esteso diviso in **🔴 Condizioni Negative (15 PHB + debuff magici)**, **🟢 Buff Benefici**, **🔵 Stati Tattici** + creazione di **✨ Stati Custom manuali** con etichetta libera.
- Modello `CombatEffectInstance` (`effectId`, `statusId`, `sourceCasterId`, `concentrationId`, `duration`) e `ActiveConcentration` (`concentrationId`, `spellName`, `linkedEffectIds`).
- Coesistenza di più istanze della stessa condizione da fonti diverse e rimozione selettiva dei soli effetti legati a `concentrationId` quando una concentrazione si interrompe o viene sostituita.
- Gestione Concentrazione sia collegata a buff/condizioni (es. *Benedizione*) sia manuale per incantesimi privi di condizioni (es. *Guardiani Spirituali*, *Sfera Infuocata*), attivabile/interrompibile da `ActiveCombatantCard`, `TacticalInitiativeCards` e `ConditionsCell`.
- Distinzione tra Danno, Guarigione e Correzione manuale PF (`applyCombatHpMutation`), supporto PF Temporanei (`tempHp`) e coda `pendingConcentrationChecks` con calcolo automatico $\text{CD} = \max(10, \lfloor\text{danno}/2\rfloor)$ e banner interattivo `[ ✅ Superato ]` / `[ 💥 Fallito (Rimuovi effetti) ]`.
- Calcolo CA effettiva (`computeEffectiveArmorClass`) con deduplicazione per `statusId` e mutua esclusione tra coperture.
- Persistenza, normalizzazione retro-compatibile, firma di sincronizzazione, unificazione logica PC + Telefono (`state-transitions.ts`) e visualizzazione su `FightProjection`.

#### Comportamento Escluso (Rimandato a Consegne 2 e 3)
- Scadenza automatica al cambio turno e promemoria TS di fine turno (Consegna 2).
- Estrazione automatica di incantesimi/capacità dalle schede PG e dagli statblock mostri (Consegna 2).
- Barra Regia Vocale Push-to-Talk e parser IA OpenRouter (Consegna 3).

#### File e Percorsi Coinvolti
- [`src/lib/combat-conditions.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/combat-conditions.ts) *(mantiene `COMBAT_CONDITIONS` a 15 elementi + aggiunge `COMBAT_STATUS_CATALOG`, categorie, bonus CA e helper)*
- [`src/lib/fight-mode/types.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/types.ts) *(tipi `CombatEffectInstance`, `ActiveConcentration`, `PendingConcentrationCheck`, estensione `FightProjectionState`)*
- `src/lib/fight-mode/state-transitions.ts` *(nuovo modulo con le funzioni pure condivise tra PC e Telefono)*
- [`src/components/gm/initiative-tracker.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/initiative-tracker.tsx) *(normalizzazione, `areInitiativeEntriesEqual`, `initiativeStateSyncSignature`, banner `pendingConcentrationChecks`, integrazione `state-transitions.ts`)*
- [`src/components/gm/gm-screen-long-state.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/gm-screen-long-state.tsx) *(allineamento `initiativeRemoteHandlers` e `initiativeDraftState` a `state-transitions.ts`)*
- [`src/lib/gm-remote/initiative-commands.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/gm-remote/initiative-commands.ts) *(validazione nuovo catalogo + alias mobile + snapshot remoto)*
- [`src/components/gm/conditions-cell.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/conditions-cell.tsx), [`src/components/gm/screen-tactical/tactical-initiative-cards.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/screen-tactical/tactical-initiative-cards.tsx), [`src/components/gm/screen-tactical/active-combatant-card.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/screen-tactical/active-combatant-card.tsx), [`src/components/gm/screen-tactical/gm-tactical-screen.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/screen-tactical/gm-tactical-screen.tsx)
- [`src/app/campaigns/[id]/fight-projection/page.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/app/campaigns/%5Bid%5D/fight-projection/page.tsx)

#### Casi di Test Unitari e Criteri di Accettazione
1. [`src/lib/torneo/__tests__/initiative-conditions.test.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/torneo/__tests__/initiative-conditions.test.ts): tutti i test esistenti sulle 15 condizioni del manuale devono continuare a passare senza modifiche distruttive.
2. `src/lib/fight-mode/__tests__/state-transitions.test.ts` *(nuovo)*:
   - **Identità multi-fonte**: Goblin 1 riceve `spaventato` dalla concentrazione di Lyra (`conc-1`) e `spaventato` da una fonte non a concentrazione (`eff-2`). Interrompendo `conc-1`, l'istanza di Lyra sparisce ma `eff-2` rimane e Goblin 1 risulta ancora `spaventato`.
   - **Stesso caster con e senza concentrazione**: Lyra applica un effetto non a concentrazione a Goblin 1 e poi attiva concentrazione su *Benedizione* per Thorin. Quando Lyra cambia concentrazione in *Guardiani Spirituali*, *Benedizione* viene rimossa da Thorin, ma l'effetto non a concentrazione su Goblin 1 resta attivo.
   - **Danno vs Cura vs Set Esatto + PF Temporanei**:
     - Caster concentrato con `20 PF + 5 tempHp` subisce `12` danni (`kind: "damage"`) $\rightarrow$ `tempHp = 0`, `hp = 13`, `damageTaken += 12`, generato check concentrazione con `CD = 10` ($\max(10, \lfloor 12/2\rfloor)$).
     - Subire poi `26` danni porta il caster a `0 PF` e interrompe concentrazione e check: non deve comparire un secondo tiro pendente.
     - La CD 13 si verifica in uno scenario indipendente: caster con `40 PF`, senza PF temporanei, subisce `26` danni e resta a `14 PF` $\rightarrow$ un check con `CD = 13`.
     - Correzione manuale `kind: "set_exact"` da `13` a `10` PF $\rightarrow$ zero nuovi check di concentrazione generati.
     - Scendere a `0 PF` $\rightarrow$ concentrazione interrotta istantaneamente, effetti rimossi e coda check svuotata per quel `concentrationId`.
   - **Calcolo CA**: `scudo-della-fede (+2)` + `velocita (+2)` + `copertura-mezza (+2)` + `copertura-tre-quarti (+5)` $\rightarrow$ applica `+2 +2 +5 = +9` (non somma le due coperture); due istanze di `scudo-della-fede` contano una sola volta (`+2`); `armatura-magica` non altera numericamente la CA.
   - **Persistenza e Firme**: attivare *Guardiani Spirituali* (concentrazione senza condizioni) cambia `initiativeStateSyncSignature(state)` e `areInitiativeEntriesEqual` restituisce `false`. Uno stato legacy con solo `conditions: ["prono"]` viene migrato senza errori da `sanitizeInitiativeTrackerState`.

#### Verifica nel Browser (non ancora eseguita)

La procedura seguente è il criterio di verifica manuale pendente, non una prova già svolta. In questa verifica il browser locale è arrivato alla pagina login; senza sessione GM non è stato possibile esercitare tracker, ricaricamento o proiezione.
- Aprire il GM Screen 2.0 su una campagna, aggiungere 2 PG e 2 Mostri:
  1. Attivare manualmente la concentrazione *Guardiani Spirituali* sul PG 1; ricaricare la pagina (F5) e verificare che la concentrazione sia ancora presente.
  2. Attivare *Benedizione* (con concentrazione) dal PG 1 su PG 1 e PG 2: verificare che la precedente concentrazione su *Guardiani Spirituali* venga sostituita automaticamente e che PG 1 e PG 2 abbiano il badge verde `Benedizione`.
  3. Infliggere `22` danni al PG 1 tramite il pulsante danno: verificare la comparsa del banner `TS COS CD 11` col bonus del PG; cliccare `Fallito` e verificare che `Benedizione` scompaia sia da PG 1 sia da PG 2.
  4. Applicare *Scudo della Fede (+2 CA)* e *Copertura Mezza (+2 CA)* a PG 2 e verificare l'aggiornamento del badge CA nella card e nella lista.
  5. Aprire la finestra `Proietta` (`/fight-projection`) e verificare la visualizzazione distinta di Buff, Condizioni e Concentrazione.

---

### Consegna 2: Durate al Cambio Turno (con Undo Protetto), Promemoria TS ed Estrazione Sicura dalle Schede
Questa seconda consegna introduce il ciclo di vita temporale al cambio turno, l'annullamento sicuro dell'avanzamento, e l'estrazione contestuale (1C) dalle schede PG e dagli statblock dei mostri, nel rispetto degli 8 vincoli tecnici:

#### Comportamento Incluso
- **Gestione Durate Ancorate (`CombatEffectDuration`)**:
  - Decremento delle durate (`remainingTurns`) **solo** sull'evento previsto: inizio (`turn_start`) o fine (`turn_end`) del turno dell'`anchorCombatantId`.
  - Protezione anti-scadenza immediata per gli effetti applicati durante il turno dell'ancora (`appliedAtRound`, `appliedAtTurnIndex`).
  - Selezionare un combattente o riordinare l'iniziativa **non** decrementa le durate.
  - I turni dei mostri morti saltati vengono processati per garantire che gli effetti ancorati a loro avanzino.
  - Se un combattente viene rimosso, l'ancora **non** viene riassegnata al bersaglio: l'automatismo viene sospeso (`anchorRemoved: true`) con avviso al Master per correzione manuale.
  - Se scade una concentrazione temporizzata (o un effetto a concentrazione), viene interrotta attraverso il motore esistente (`breakCombatantConcentration`), rimuovendo effetti collegati e check pendenti.
- **Annullamento Protetto Ultimo Avanzamento (`undoAdvanceTurn`)**:
  - Distinto dalla navigazione: memorizza lo stato pre-avanzamento insieme alla firma attesa post-avanzamento.
  - Il ripristino è consentito **soltanto** se nessuna successiva modifica (danni, cure, effetti, comandi dal telefono) ha mutato lo stato; altrimenti l'annullamento viene bloccato a livello di stato autorevole per non cancellare azioni di gioco.
- **Promemoria Tiri Salvezza (`PendingSaveReminder`)**:
  - Generati al cambio turno per le specifiche istanze di effetto che contengono `savePrompt` esplicito (inizio o fine turno).
  - Interfaccia con risoluzione esplicita: `Superato (Rimuovi effetto)` o `Fallito (Mantieni)`, con pulizia immediata se l'effetto scade o viene rimosso.
- **Consumo Manuale Effetti Monouso**:
  - Pulsante `⚡ Usa / Consuma` sui buff ad uso singolo (*Ispirazione Bardica*, *Guida*, *Aiuto*) che rimuove la singola istanza con notifica.
- **Estrazione Strutturata Schede PG (`sheet-combat-extractor.ts`)**:
  - Lettura di armi (`weapons`), classe difficoltà (`spellSaveDc`) e incantesimi da `rules_snapshot.character_sheet`.
  - **Esclusione tassativa di `spellsListMd`**: vengono mostrati solo gli incantesimi presenti in `character_sheet.spells`, etichettati chiaramente come "Incantesimi in scheda (Verificare se preparati/disponibili)".
- **Suggerimenti di Capacità e Condizioni dai Mostri (`parseMonsterActionSuggestions`)**:
  - Parsing delle sole azioni offensive dei mostri con produzione di **suggerimenti non applicati automaticamente**.
  - Ogni suggerimento espone: frase originale estratta, stato proposto, bersagli selezionabili, CD e caratteristica del TS, durata stimata e distinzione tra TS iniziale dell'attacco e TS ripetibile a fine turno.
  - Filtri rigorosi anti-falso-positivo (esclusione immunità, resistenze, frasi negative "non può essere", "vantaggio contro").
  - Finestra/popover di verifica e correzione per il Master prima dell'applicazione effettiva.

#### Comportamento Escluso (Rimandato a Consegna 3)
- Barra Regia Vocale Push-to-Talk e parser IA OpenRouter.

#### File e Percorsi Coinvolti
- `src/lib/fight-mode/sheet-combat-extractor.ts` *(nuovo modulo di estrazione strutturata da schede PG e suggerimenti azioni mostri con filtri immunità)*
- `src/lib/fight-mode/state-transitions.ts` *(aggiunta `transitionNextTurn`, `undoAdvanceTurn`, `consumeEffectInstance`, `resolveSaveReminder`)*
- [`src/lib/fight-mode/types.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/types.ts) *(estensione `CombatEffectDuration`, `PendingSaveReminder`, `TurnAdvanceUndoSnapshot`, `MonsterActionSuggestion`)*
- [`src/components/gm/initiative-tracker.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/initiative-tracker.tsx) *(pulsante "Annulla avanzamento" protetto, banner `PendingSaveReminder`, integrazione transizioni)*
- [`src/components/gm/screen-tactical/active-combatant-card.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/screen-tactical/active-combatant-card.tsx) *(visualizzazione armi strutturate, incantesimi verificabili, chip suggerimenti mostri con modal/popover di conferma)*
- [`src/components/gm/gm-screen-long-state.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/gm-screen-long-state.tsx) & [`src/lib/gm-remote/initiative-commands.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/gm-remote/initiative-commands.ts) *(condivisione `transitionNextTurn` e sincronizzazione snapshot)*

#### Casi di Test Unitari e Criteri di Accettazione
1. `src/lib/fight-mode/__tests__/turn-lifecycle.test.ts` *(nuovo)*:
   - Durate ancorate: decrementano solo su `turn_start` o `turn_end` dell'ancora.
   - Effetto applicato nel turno dell'ancora: non scade immediatamente allo stesso turno.
   - Riordino iniziativa o selezione manuale turno: nessuna alterazione delle durate.
   - Mostri morti saltati: gli effetti ancorati a loro vengono processati correttamente.
   - Rimozione ancora: automatismo sospeso (`anchorRemoved: true`), nessuna riassegnazione arbitraria.
   - Scadenza concentrazione temporizzata: interruzione coordinata tramite il motore di concentrazione.
   - Undo avanzamento: consentito solo se nessuna modifica (locale o remota) è intervenuta; bloccato se interviene danno o comando remoto.
   - Promemoria TS: generati per istanze con `savePrompt`; successo rimuove l'effetto, fallimento lo mantiene; nessun duplicato.
2. `src/lib/fight-mode/__tests__/sheet-combat-extractor.test.ts` *(nuovo)*:
   - Statblock con immunità ("Immunità alle condizioni: avvelenato") o frasi negative ("non può essere affascinato"): nessun suggerimento falso positivo.
   - Statblock mostro con attacco e TS ripetuto: estrae frase originale, CD, TS iniziale vs ripetuto a fine turno.
   - Scheda PG: estrae armi e incantesimi strutturati da `character_sheet.spells`, ignora `spellsListMd`, segnala che non sono necessariamente preparati.
3. Regressioni Consegna 1: tutti i 22 test esistenti continuano a passare.

#### Esito correzioni Consegna 2 — 16 ottobre 2026
- Il parser conserva il TS iniziale come informazione della capacità; deduce un TS ripetuto solo da una frase esplicita di ripetizione. La durata resta indipendente e sconosciuta se il testo non la dichiara. Il GM può aggiungere manualmente un TS ripetuto e sceglie separatamente il turno che fa avanzare la durata.
- `activeConcentration.remainingTurns` è il timer autoritativo della concentrazione: avanza all'inizio del successivo turno del caster, con round/turn iniziali normalizzati e persistiti. La scadenza di un singolo effetto rimuove solo quell'istanza; la scadenza della concentrazione interrompe quella concentrazione e rimuove i suoi effetti collegati. Coperti i casi senza bersagli e con effetti di durata diversa.
- La bozza long-session include `pendingSaveReminders` e `lastAdvanceUndoSnapshot`; le dipendenze non includono `turnElapsedSeconds`, quindi il timer non ricrea la bozza a ogni secondo.
- Scheda presente senza `weaponRows`: nessun fallback di classe. Campi d'arma mancanti sono mostrati come non indicati. Il fallback di classe resta per personaggi senza scheda strutturata.
- Regressioni automatiche: `npx tsx --test src/lib/fight-mode/__tests__/*.test.ts` — 34 test superati al 16 ottobre 2026. TypeScript senza errori; ESLint mirato senza errori e con un warning `react-hooks/exhaustive-deps` preesistente su `initiative-tracker.tsx:1492` (`applyTransition`). Verifica browser autenticata non eseguita: il checkout non contiene `.auth` e non è disponibile una sessione locale.

#### Verifica nel Browser
- Selezionare un PG dotato di scheda generata nel Fight: verificare che nella sua `ActiveCombatantCard` compaiano i suoi veri TS, le sue vere armi e i chip rapidi dei suoi incantesimi a concentrazione (es. *Guardiani Spirituali*, *Benedizione*).
- Attivare *Scudo (+5 CA, fino al prossimo turno)* sul PG, avanzare i turni fino a tornare al PG e verificare che *Scudo* scada automaticamente; premere `Indietro` e verificare che torni attivo.
- Selezionare un mostro con azioni che infliggono stati (es. Ragno Gigante / Lupo / Ghoul), cliccare sul chip sotto l'azione, verificare il popover di conferma, applicare lo stato e verificare il promemoria TS a fine turno.

---

### Consegna 3: Barra Regia Rapida (Parser Locale Deterministico + Voce Push-to-Talk & IA con Disambiguazione) - IMPLEMENTATA ✅
Questa terza consegna aggiunge l'input in linguaggio naturale (scritto o dettato con Push-to-Talk) con disambiguazione sicura, validazione server-side, anteprima deterministica delle operazioni atomiche e annullamento sicuro 1-click.

#### Comportamento Implementato
- **Barra Regia compatta** ([`CombatCommandBar`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/screen-tactical/combat-command-bar.tsx)) integrata nell'header di [`InitiativeTracker`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/initiative-tracker.tsx) e disponibile sia in vista Tabella sia in vista Tattica.
- **Dettatura vocale Push-to-Talk** riusando [`useVoiceDictation`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/modules/command-center/voice/use-voice-dictation.ts): trascrizione in tempo reale con visualizzazione del testo provvisorio e possibilità di modifica manuale prima dell'analisi. Gestione degli errori per browser non supportato o permessi negati.
- **Parser locale deterministico** ([`parseLocalCombatCommand`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/command-parser.ts)) per comandi diretti in italiano (danno, cura, rettifica esatta PF, aggiunta/rimozione stati, avvio/interruzione concentrazione, comandi composti con `;` o `e poi`).
- **Risoluzione bersagli e disambiguazione** ([`resolveTargetCombatants`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/command-parser.ts)):
  - Corrispondenza per ID esatto o nome esatto (case-insensitive);
  - Selezioni collettive esplicite: `"tutti"`, `"tutti i mostri"`, `"tutti i pg"`, `"tutti i goblin"`;
  - Rilevamento ambiguità: `"Goblin"` con più Goblin presenti genera `status: "ambiguous"` con lista candidati e blocca l'esecuzione arbitraria;
  - Rilevamento dati mancanti (`missingData`): ad esempio `"danno a Thorin"` senza quantità numerica richiede esplicitamente il valore al Master.
- **Server Action IA assistita con OpenRouter** ([`interpretCombatCommandWithAiAction`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/actions/combat-command-ai-actions.ts)):
  - Verifica autorizzazione GM/Admin;
  - Se `OPENROUTER_API_KEY` non è configurata, segnala chiaramente il limite e mantiene pienamente utilizzabile il parser locale deterministico;
  - Guardrail stringenti anti-allucinazione (nessuna invenzione di CD, durate o tiri salvezza);
  - Validazione di schema JSON e coerenza degli ID bersaglio contro i combattenti registrati.
- **Applicazione atomica e protezioni di integrità** ([`applyCombatCommandProposal`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/state-transitions.ts)):
  - Idempotenza e prevenzione doppia conferma (`appliedProposalIds`);
  - Protezione stale state: confronto tra la firma dello stato alla creazione della proposta e la firma attuale (`initiativeStateSyncSignature`); se lo stato è mutato nel frattempo (danni, turni o comandi remoti), l'applicazione viene rifiutata;
  - Modalità di anteprima con checkbox per escludere o includere singole operazioni atomiche.
- **Annullamento sicuro dell'ultimo comando** ([`undoLastCommand`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/state-transitions.ts)):
  - Memorizza [`CommandUndoSnapshot`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/types.ts);
  - Ripristina lo stato precedente solo se nessuna modifica successiva ha alterato la firma del combattimento.

#### File Coinvolti e Realizzati
- [`src/lib/fight-mode/types.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/types.ts) *(tipi di operazione, proposta, bersagli irrisolti, dati mancanti e undo snapshot)*
- [`src/lib/fight-mode/command-parser.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/command-parser.ts) *(parser locale deterministico e risolutore bersagli)*
- [`src/lib/actions/combat-command-ai-actions.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/actions/combat-command-ai-actions.ts) *(server action IA assistita con OpenRouter e guardrail)*
- [`src/lib/fight-mode/state-transitions.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/state-transitions.ts) *(`applyCombatCommandProposal` e `undoLastCommand` atomici con verifica firma)*
- [`src/components/gm/screen-tactical/combat-command-bar.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/screen-tactical/combat-command-bar.tsx) *(UI compatta con push-to-talk, input, anteprima e modale di revisione)*
- [`src/components/gm/initiative-tracker.tsx`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/components/gm/initiative-tracker.tsx) *(integrazione barra, stato, persistenza e metodi esposti)*
- [`src/lib/fight-mode/__tests__/combat-command.test.ts`](file:///Users/alessandropetricciuolo/Desktop/Barber%20And%20Dragons%20-%20Web%20App/src/lib/fight-mode/__tests__/combat-command.test.ts) *(suite di test unitari con 7 scenari coperti e 100% passanti)*

#### Stato Verifiche e Limiti Noti
- **Test Unitari**: 41 test su 41 passanti nel modulo `src/lib/fight-mode/__tests__/`, 25 su 25 nei test mobile.
- **Compilazione TypeScript**: `npx tsc --noEmit` completato con 0 errori.
- **Verifica Browser Autenticata**: resta formalmente pendente per assenza di credenziali/sessione attiva nel contesto headless (`.auth` vuoto, reindirizzamento al login). I flussi logici e di stato sono interamente coperti dalla suite automatizzata.

### Consegna 3 — correzioni e verifica (16 ottobre 2026)

La proposta tattica AI ora richiede autenticazione verificabile e ruolo `admin` oppure ruolo `gm` assegnato alla campagna tramite `campaigns.gm_id`. Gli errori di auth, l'assenza dell'utente e una campagna assegnata a un altro GM interrompono il flusso prima del provider. La risposta AI passa da uno schema discriminato runtime con limiti numerici e testabile senza provider; gli ID di caster, bersaglio e stato sono controllati prima della normalizzazione.

Il parser conserva tipo e dati di un'operazione quando il bersaglio è ambiguo. La prima conferma aggiorna l'anteprima con gli effetti risolti e non applica modifiche; la schermata successiva richiede i valori mancanti. Per effetti a concentrazione come Benedizione si seleziona il caster, oppure si sceglie esplicitamente l'applicazione manuale senza collegamento. La concentrazione è rappresentata dall'operazione dell'effetto collegato, senza una seconda applicazione distinta.

L'applicazione delle proposte valida lo schema e tutti i dati selezionati prima di committare; se una transizione non è applicabile, lo stato originale resta intatto. Snapshot undo e bozza long-session portano con sé `appliedProposalIds`; lo snapshot undo precedente non viene copiato dentro quello nuovo. Undo ripristina il combattimento conservando l'ID già applicato, così una proposta annullata non può essere rieseguita accidentalmente.

**Verifiche locali:** TypeScript passa; 64 test passano tra fight-mode, telecomando, condizioni, megatimer e timer. I casi includono mock auth/provider, schema AI, intent ambiguo, Benedizione senza caster, proposta valida più invalida, schema runtime, undo/reload/replay, selezione parziale e snapshot bozza. Lint passa con quattro warning già presenti in componenti/hooks estranei a questa correzione. `git diff --check` passa. Nessuna chiamata reale a OpenRouter o mutazione DB è stata eseguita. Il browser autenticato non è stato verificato in questo passaggio; la nota precedente del piano registra il redirect login.

**Limiti residui:** i mock isolano il gate di autorizzazione e usano uno spy provider, senza sostituire una sessione GM autentica nel browser. Il controllo visivo autenticato resta pendente.
