# R6 — Riprogettazione scene, mappe, overlay e Fog of War

Stato: R6.0 approvata; R6.1 core puro implementata; R6.2 adapter read-only implementata. R6.3+ non completate.

Questo documento descrive il sistema rilevato nel repository e propone un modello target per la futura generazione dall'Assistente GM. Non esegue migrazioni, non modifica i percorsi legacy e non dimostra il comportamento del Supabase remoto o di una sessione live.

## R6.0 — Decisioni di prodotto già approvate

1. **Separazione netta dalle mappe Wiki.** Le mappe Wiki restano contenuti narrativi standalone, con informazioni testuali e finalità di esplorazione/canone. Non sono parte del nuovo dominio tattico e non vengono migrate automaticamente a scene.
2. **Sistema tattico esclusivamente GM.** Scene, editor, stato FoW, overlay, azioni live e relative route non sono accessibili ai player. La proiezione è uno schermo controllato dal GM durante il tavolo, non una "player view" né un prodotto self-service per i giocatori.
3. **Proiezione locale prima.** Il flusso primario è una seconda scheda/browser window del GM, spostabile sul monitor/proiettore collegato allo stesso dispositivo. Un link temporaneo per un secondo dispositivo è un'estensione futura, solo se non indebolisce autorizzazione e semplicità.
4. **Una sola scena attiva per sessione.** Non serve orchestrare più campi di battaglia simultanei nella prima versione.
5. **Primo contratto mappa.** Immagine, pedine fisiche esterne al software, FoW, overlay, stato live e proiezione. Le pedine digitali e il loro movimento non fanno parte di R6 V2.
6. **Griglia opzionale e non bloccante.** Si privilegiano mappe che incorporano già la propria griglia. Un'eventuale griglia applicativa deve essere nascondibile e non richiede calibrazione nella prima fase; non può degradare l'uso di immagini già grigliate.
7. **Due fonti FoW, una UX.** Il GM sceglie per ogni mappa tra FoW manuale e FoW importato/derivato da un JSON Foundry. Entrambi restano correggibili manualmente. La scelta e l'origine devono essere visibili nel workspace.
8. **Overlay live visuale.** Supporta effetti immagine/GIF, aree colorate, testo, indicatori, cerchi, misure e timer. Le condizioni agganciate alle pedine sono fuori scope finché non esistono pedine digitali.
9. **Un solo workspace di creazione.** Lo Scene Editor non produce un secondo tipo di output: la preparazione ordinaria e la creazione rapida durante la sessione modificano la stessa scena tattica. Il requisito è velocità, non una seconda modalità concettuale.
10. **Persistenza FoW utile ma non vincolante.** Il sistema può salvare lo stato per riprendere una sessione successiva se il costo resta basso; non richiede inizialmente uno storico completo o un sistema di replay.
11. **Ruoli.** GM e Admin possono gestire scene di qualunque campagna. Un audit separato sta verificando come rendere questa regola coerente nel sito; R6 non deve introdurre eccezioni locali incompatibili.

## 1. Inventario verificato

### 1.1 Due domini di mappa oggi distinti

| Dominio | Tabelle / schema | UI e azioni | Responsabilità osservata |
| --- | --- | --- | --- |
| Mappe Wiki e geografiche | `maps`, `map_pins`, `explorations`, `wiki_relationships.target_map_id` | `/campaigns/[id]/maps/[mapId]`, `InteractiveMap`, `map-actions.ts`, `map-detail-actions.ts` | Immagine, gerarchia world/continent/region/city/dungeon/district/building, pin collegati a mappe o Wiki, accesso pubblico/secret/selective. |
| Mappe di esplorazione/FoW | `campaign_exploration_maps`, `campaign_exploration_fow_regions` | `/campaigns/[id]/gm-only/vista-dall-alto`, `VistaDallAltoClient`, `ExplorationMapStage`, `exploration-map-actions.ts` | Immagine per piano, griglia, missione collegata, poligoni normalizzati 0–1 e stato `is_revealed`. |
| Scene strutturate | `campaign_scene_documents`, `document JSONB` | `/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]`, `SceneEditorClient`, `scene-document-actions.ts` | Documento multi-piano `SceneDocumentV1`: aree, muri, porte, layer, props, note GM; raster per piano e sincronizzazione FoW. |
| Overlay su mappe Wiki | colonne `maps.overlay_items`, `maps.overlay_draft`, `map_overlay_snapshots` | `/campaigns/[id]/maps/[mapId]/overlay-edit`, `MapOverlayEditor`, `MapOverlayLayer` | Testo e simboli con coordinate normalizzate, bozza, pubblicazione e storico. Solo campagne `long` nel server action. |

La mappa Wiki (`maps`) e la mappa FoW (`campaign_exploration_maps`) sono quindi entità diverse. Un piano di una scena genera oggi una riga FoW con `scene_document_id` e `scene_floor_id`, ma non diventa una riga `maps`. Un overlay Wiki non è un layer di `SceneDocumentV1`.

### 1.2 Scene document e derivazione FoW

`SceneDocumentV1` contiene `floors[]`; ogni piano contiene dimensioni, griglia, `layers[]`, aree, muri, props e note GM. Le aree duplicate in `floor.areas` e `floor.walls` sono una denormalizzazione degli strati visibili, usata dal renderer e dal sync.

`scene-document-actions.ts`:

1. crea il documento;
2. crea una mappa `campaign_exploration_maps` per ogni piano;
3. carica un raster WebP oppure un placeholder;
4. converte le aree pixel in poligoni normalizzati;
5. aggiorna/inserisce/cancella regioni FoW usando `source_area_id`, preservando `is_revealed` quando l'area resta identificabile.

Il percorso di healing (`healCampaignSceneExplorationMapsAction`) ripara scene senza mappe collegate all'apertura della pagina Vista dall'alto. È una riparazione opportunistica, non una transazione unica tra documento, mappe, raster e regioni.

### 1.3 Overlay, pin e player view

I pin di `map_pins` sono link a `maps` o `wiki_entities` e sono letti dalla pagina `/view`; i loro vincoli storici richiedono almeno un target, con una migrazione che ha reso opzionale il link ma non ha introdotto un modello di tipo/versione.

Gli overlay sono JSON liberi validati in applicazione (`MapOverlayItem`): testo o simbolo, posizione, rotazione e scala. `overlay_draft` è sulla stessa riga della pubblicazione; `map_overlay_snapshots` conserva stati precedenti. Il player vede `overlay_items` pubblicati, non la bozza. Non esiste un canale realtime per gli overlay.

La proiezione FoW è separata: `vista-dall-alto/proiezione` legge la mappa FoW e le regioni; i componenti si sottoscrivono a Realtime per regioni e aggiornamenti della mappa. Le policy più recenti (`20260413193000`) consentono lettura e modifica delle mappe FoW a qualunque GM/Admin, mentre le scene hanno policy più larga ancora: controllano soltanto il ruolo e non la campagna.

## 2. Incongruenze e sovrapposizioni

- `maps` è il modello canonico per la cartografia Wiki, ma `campaign_exploration_maps` è il modello canonico per la proiezione live/FoW.
- Esistono due coordinate concettualmente simili: pin/overlay in coordinate normalizzate sull'immagine e aree scena in pixel, convertite in norm 0–1 solo per FoW.
- Un'area scena, una regione FoW e una geometria raster sono tre rappresentazioni della stessa superficie ma con lifecycle diversi.
- Le note GM sono dentro il documento scena e vengono adattate a un overlay visuale; gli overlay `maps` sono annotazioni pubblicabili e quindi non sono la stessa cosa.
- `source_area_id` identifica la provenienza di una regione FoW, ma non esiste un id/versione di derivazione che permetta di sapere da quale revisione del documento è stata calcolata.
- `document_version` è un intero sul documento, ma non c'è uno storico di revisioni, né un optimistic lock osservabile nelle azioni di save.
- Le azioni FoW usano un controllo GM/Admin, ma alcune policy e pagine non verificano sempre il proprietario della campagna: il confine di autorizzazione è incoerente e deve essere deciso prima di un nuovo modello.
- Le mappe Wiki hanno visibilità pubblica/secret/selective, mentre la proiezione FoW è protetta dal ruolo GM/Admin e non ha una vista giocatore equivalente verificata nel percorso esaminato.
- Il bucket `campaign_maps` per `maps` e `exploration_maps` per FoW hanno policy Storage ampie per utenti autenticati; la validazione del legame alla campagna avviene soprattutto nelle actions.
- Scene editor, Vista dall'alto, GM screen, proiezione e mappe Wiki hanno editor/renderizzatori separati; il package `src/lib/map-core` riusa coordinate, schema e renderer ma non un aggregate di dominio.

## 3. Modello target raccomandato

La raccomandazione è adottare una scena come aggregate principale e trattare ogni output tecnico come revisione derivata, senza cancellare subito i modelli legacy.

### Entità

- `scene`: identità, campagna, nome, missione opzionale, tipo, stato (`draft`, `ready`, `live`, `archived`), owner GM, revisione corrente.
- `scene_revision`: documento strutturato immutabile e validato; contiene piani e geometria, non lo stato operativo di rivelazione.
- `scene_floor`: piano stabile con dimensioni, griglia e immagine/raster derivato dalla revisione.
- `scene_layer`: layer tecnici/narrativi con visibilità, opacità, preset e ordine; i layer privati GM non entrano nella proiezione player.
- `scene_feature`: area, muro, porta, prop o nota con id stabile, tipo, geometria e visibility class. Le aree FoW non sono duplicate come feature indipendenti.
- `scene_map_projection`: riferimento a un asset raster/immagine, con origine (`upload`, `generated`, `rendered`) e checksum/versione.
- `scene_fow_region`: regione derivata da una feature o manuale, con geometria normalizzata, stato di rivelazione e revisione sorgente.
- `scene_overlay`: layer pubblicabile, con elementi tipizzati (testo, simbolo, pin, marker), bozza e revisioni pubblicate. Le note GM restano private e non sono overlay player per default.
- `scene_publication`: snapshot approvato per la sessione/proiezione, con revisione scena, overlay e policy di visibilità fissati.
- `scene_ai_proposal`: specifica AI revisionabile, legata a prompt, fonti, revisione scena e stato (`proposed`, `accepted`, `rejected`, `superseded`).

### Ownership e lifecycle

Ogni aggregate deve contenere `campaign_id` e passare da una singola funzione di autorizzazione: GM proprietario o Admin. Il player può leggere solo una `scene_publication` coerente con visibilità e sessione; non può leggere bozze, note private, geometria nascosta o proposte AI.

Lifecycle raccomandato: `draft` → editing umano → `ready` → pubblicazione esplicita → `live` → archiviazione. Il salvataggio di una nuova revisione non deve mutare silenziosamente la pubblicazione attiva; la sessione continua a usare lo snapshot pubblicato finché il GM non pubblica una revisione.

### Versioning e media

Revisioni immutabili con `revision_no`, `parent_revision_id`, `created_by`, timestamp e checksum del documento. Gli asset devono avere un record tipizzato con storage key, mime, dimensioni e checksum; non affidarsi a URL Telegram o URL pubblici come identità persistente. Il raster è sempre derivabile dalla revisione e deve poter essere rigenerato o marcato non disponibile.

## 4. Contratti GM, player e realtime

Azioni future minime:

- `createSceneDraft`, `saveSceneRevision`, `validateSceneRevision`;
- `createSceneAiProposal`, `acceptSceneAiProposal`, `rejectSceneAiProposal`;
- `deriveFloorMapAndFow`, `saveManualFowPatch`;
- `saveOverlayDraft`, `publishScene` e `rollbackPublication`;
- `getGmSceneWorkspace`, `getPlayerScenePublication`;
- `startSessionProjection`, `endSessionProjection` o un equivalente legato al runtime live.

Ogni write deve verificare autenticazione, ruolo, ownership della campagna, `expected_revision_no` e payload validato. Nessuna action AI deve scrivere direttamente scene, mappe, overlay o FoW.

Realtime deve trasmettere solo eventi di pubblicazione e stato FoW operativo già autorizzati. Il canale GM può ricevere bozze e diagnostica; il canale player solo `publication_id`, `revision_no`, overlay pubblicato e cambiamenti `is_revealed`. Il realtime è un acceleratore UI, non la fonte di verità: al reconnect il client deve rileggere lo snapshot dal server.

## 5. UX/editor umano

Il GM deve avere un workspace unico con:

1. tabella revisioni e stato della scena;
2. editor per piano/layer con strumenti geometria e snap;
3. pannello FoW che distingue derivato da manuale e mostra l'origine;
4. pannello overlay con anteprima GM/player, bozza, pubblica e rollback;
5. pulsante “Avvia proiezione” che pubblica uno snapshot esplicito;
6. diff tra revisione corrente e pubblicata.

La preview player deve usare esattamente la stessa `scene_publication` della proiezione live, senza query parallele a bozze o note GM. In sessione, reveal/hide è un comando operativo sullo snapshot live e non riscrive la geometria della scena.

## 6. AI futura: specifica prima, artefatti dopo

L'Assistente GM deve produrre inizialmente solo una `scene_ai_proposal` strutturata:

- narrativa: titolo, atmosfera, descrizione, punti di interesse e semantica delle aree;
- tecnica: dimensioni, griglia proposta, elenco piani, geometrie candidate, layer, regioni FoW candidate, overlay candidate;
- fonti e assunzioni, con ogni campo tracciabile;
- warning per ambiguità o dati mancanti.

La narrativa non deve essere reinterpretata dal renderer come geometria senza una fase esplicita di mapping. L'AI non deve scrivere DB, caricare media o pubblicare. Il GM può modificare la proposta, accettarla, rifiutarla o chiedere una nuova revisione. Se la geometria non è valida, il risultato resta testo/JSON revisionabile; fallback sicuro = nessun artefatto tecnico, non una scena inventata.

## 7. Compatibilità e migrazione

Non migrare dati finché il modello e il contratto player non sono approvati. Prima creare un adapter read-only che mappi:

- `campaign_scene_documents` + piani FoW → aggregate scena/revisione;
- `campaign_exploration_maps` + regioni → projection/FoW derivati;
- `maps` + pin/overlay → map legacy importabile come asset o collegamento, non come scena automaticamente;
- `gmNotes` → layer privato;
- overlay pubblicati → snapshot pubblicabile solo dopo validazione.

Durante la coesistenza, i legacy restano source-of-truth per i loro percorsi. Un flag per campagna/utente abilita solo lettura del nuovo workspace. Ogni backfill deve essere idempotente, con report orfani/ambigui, checksum e rollback per record; mai cancellare o sovrascrivere le tabelle legacy. La migrazione write va fatta solo dopo prove di RLS, storage e recupero da backup.

## 8. Milestone proposte

### R6.0 — Decisione di dominio (APPROVATA)

Owner: architettura + prodotto. Approvare entità, player contract, ownership GM/Admin, semantica `live/publication`, e se `maps` può restare separato dalla scena.

Accettazione: schema di stati e diagramma delle relazioni approvati dal CEO il 2026-09-07; nessun codice runtime richiesto.

### R6.1 — Contract e core puro (IMPLEMENTATA)

File: `src/lib/scene-runtime/types.ts`, `src/lib/scene-runtime/validate.ts`, `src/lib/scene-runtime/index.ts`, `src/lib/scene-runtime/__tests__/scene-runtime.test.ts`. Il modulo è isolato, non importa Supabase, SDK, route, UI, AI o mappe Wiki.

Accettazione: fixture valide/invalide, round-trip JSON, ID stabili e univoci, geometrie normalizzate 0–1 e validate, conflitto `expectedRevisionNo`, lifecycle, FoW manuale/imported/derived rappresentato, patch deterministiche, overlay tipizzati e griglia opzionale/nascondibile. Test mirati eseguiti; browser, DB, Realtime e live non validati.

### R6.2 — Read adapter legacy (IMPLEMENTATA)

File indicativi: nuovo adapter server e test contract. Leggere scene/mappe esistenti senza scriverle e produrre report di conversione.

Accettazione: `src/lib/scene-runtime/legacy-read-adapter.ts` converte in modo puro scene multi-piano, raster upload/generated, FoW con provenienza esplicita, overlay tipizzati e produce report stabili per orfani, ambiguità e mappe Wiki escluse. Fixture read-only e immutabilità input in `src/lib/scene-runtime/__tests__/legacy-read-adapter.test.ts`. Nessun database/browser/live validato; nessuna migration o write eseguita.

### R6.3 — Workspace GM e preview (IMPLEMENTATA — MVP LOCALE)

File: `src/app/campaigns/[id]/gm-only/scene-workspace/page.tsx`, `src/components/scene-runtime/scene-workspace-client.tsx`, `src/lib/scene-runtime/workspace.ts`, `src/lib/scene-runtime/access.ts`. Il workspace usa l’adapter R6.2 in sola lettura e mantiene draft/pubblicazione nel solo stato del browser.

Accettazione: guardia server GM/Admin prima delle query; scena locale con piano/placeholder; griglia opzionale nascosta di default; FoW manuale/importato/derivato visualizzato con reveal/hide di regione; overlay draft per testo, marker, area, cerchio, misura e timer; lifecycle, revisioni, conflitto, scarto e rollback locali; preview di proiezione interna che mostra soltanto lo snapshot pubblicato. Non sono state aggiunte migration, tabelle, write Supabase, route player, link pubblico, upload, Realtime o persistenza cross-tab. La proiezione su una seconda scheda/dispositivo resta bloccata fino a R6.4 perché richiederebbe uno stato condiviso durevole.

### R6.4 — Publication/live boundary (IMPLEMENTAZIONE LOCALE COMPLETATA — REMOTE DA APPLICARE/VALIDARE)

File: `supabase/migrations/20260907120000_tactical_scene_publication_r6_4.sql`, `src/app/campaigns/tactical-scene-actions.ts` e la route GM-only `scene-workspace/[sceneId]/proiezione`. La migration è additiva: introduce scene tattiche, revisioni immutabili, publication e stato FoW runtime; non modifica i modelli legacy. Le server actions verificano ruolo dal profilo prima delle query di dominio, validano il documento R6.1, controllano `expectedRevisionNo`, gestiscono pubblicazione esplicita e rollback con errori DB espliciti. Il workspace legge una revisione tattica persistita quando disponibile e offre salvataggio/pubblicazione espliciti; il client non usa credenziali privilegiate.

Verificato localmente: contratto/payload e guardia ruoli tramite test R6.3/R6.1, typecheck dei nuovi file, lint e diff-check. Da validare sul Supabase remoto: applicazione migration, grants/Data API, RLS per GM/Admin/player/anonimo, inserimento/conflitto concorrente, rollback reale, Realtime publication/FoW e reconnect della seconda scheda. Nessun backfill, upload asset, AI, route player o URL pubblico è incluso. La proiezione cross-tab con stato aggiornato in tempo reale resta subordinata alla verifica remota.

### R6.5 — Assistente GM

Solo dopo la stabilizzazione manuale: tool che genera `scene_ai_proposal`, visualizza fonti/assunzioni e richiede conferma. Nessun write autonomo.

Accettazione: richiesta chiara, ambigua, fonte assente, provider fallito, JSON invalido e retry; accettazione produce una revisione draft, mai una pubblicazione automatica.

### R6.6 — Backfill e dismissione selettiva

Solo con decisione CEO dopo test live: adapter write idempotente, report, rollback e piano per ogni legacy. La rimozione del legacy non è automatica e richiede uso live positivo.

## 9. Rischi e decisioni richieste

Rischi critici: perdita o divulgazione di note GM; RLS incoerente tra scene e FoW; collisione tra revisione scena e stato reveal; asset Telegram non durevoli; doppia fonte `maps`/FoW; pubblicazione di una bozza AI non verificata; realtime scambiato per persistenza.

Decisioni CEO residue per le milestone successive:

- quali formati e versioni del JSON Foundry importare;
- la semantica dei timer (solo countdown visuale oppure anche segnali/controlli GM);
- se introdurre in seguito un link temporaneo per un secondo dispositivo;
- formati, dimensioni e durata degli asset durevoli.

Decisioni già fissate: le scene sono mappe tattiche separate dalle mappe Wiki narrative; non esiste una player view raggiungibile dai giocatori; GM e Admin possono controllare qualunque scena di qualunque campagna; gli overlay tattici fanno parte della scena.

## 10. Raccomandazione netta

Non aggiungere ora generazione AI alle scene esistenti. Il sistema ha già tre modelli che rappresentano superfici correlate con permessi, lifecycle e coordinate differenti. Approvare prima un aggregate scena versionato con publication separata e FoW derivato, introdurre un adapter read-only e verificare il workspace umano. Solo dopo portare l'Assistente GM a generare specifiche strutturate; la prima scrittura automatica accettabile è una bozza non pubblicata e confermabile.

## Evidenze repository consultate

- `docs/GM_ASSISTANT_V2_IMPLEMENTATION_PLAN.md`, sezione R6.
- `docs/adr-map-scene-editor.md`.
- `supabase/migrations/20250301000000_initial_schema.sql`.
- `supabase/migrations/20260410120000_maps_overlay_annotations.sql`.
- `supabase/migrations/20260411180000_campaign_exploration_maps.sql`.
- `supabase/migrations/20260413193000_exploration_maps_any_gm_admin.sql`.
- `supabase/migrations/20260506155000_exploration_maps_linked_mission.sql`.
- `supabase/migrations/20260628120000_scene_documents_and_map_source.sql`.
- `src/app/campaigns/scene-document-actions.ts`.
- `src/app/campaigns/exploration-map-actions.ts`.
- `src/app/campaigns/map-actions.ts` e `src/app/campaigns/map-overlay-actions.ts`.
- `src/lib/map-core/scene-schema/**`, `src/lib/map-core/scene-to-fow/**`.
- `src/components/scene-editor/**`, `src/components/exploration/**`, `src/components/maps/**`.
- route `/gm-only/scene-editor`, `/gm-only/vista-dall-alto`, `/gm-only/vista-dall-alto/proiezione`, `/maps/[mapId]/view` e `/maps/[mapId]/overlay-edit`.
