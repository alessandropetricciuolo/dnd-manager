# Export Package: Map Core + Scene Editor + Fog of War

## Export ID

bnd-map-scene-editor-2026-05-28

**Revisione 4** — FoW sync on create, raster FormData fix — 2026-07-06

## Origine

Barber & Dragons

## Destinazione prevista

gmflow.app

## Scope autorizzato

Export completo del modulo **mappe tattiche / Scene Editor / Fog of War** (Fasi 0–6), sviluppato tra maggio–giugno 2026.

**Commit di riferimento B&D (in ordine):**

| Commit | Contenuto |
|--------|-----------|
| `94b0f4e` | Map Core portabile, Scene Editor, FoW integration, schema DB |
| `be804da` | DS rendering, auto-walls per-area, layer presets, normalize-floor |
| `e9c93e5` | **Union auto-walls** (`polygon-clipping`) — solo parte map-core, non shell layout |
| `3cf1907` | **FoW sync on create** — mappe exploration upsert immediato, heal scene orfane |
| `f9bcd77` | **Raster FormData** — upload completo PNG, no placeholder 1×1 |

---

## Fase 7 — FoW sync e raster upload (Rev 4)

| Componente | Comportamento |
|------------|---------------|
| `createSceneDocumentAction` | Upsert `campaign_exploration_maps` per ogni piano subito alla creazione |
| Heal orphaned | Al load lista scene, ripara documenti senza mappe collegate |
| `saveSceneDocumentWithRastersAction` | Riceve raster via **FormData** (no `instanceof Blob` server-side) |
| `floor-raster.ts` | Export **PNG** (compatibilità storage; gmflow può usare WebP) |
| `exploration-map-upload-core.ts` | Upload binario da FormData; rifiuta raster mancanti |
| Tolleranza errori | Salvataggio documento OK anche se singolo raster fallisce (log + retry manuale) |

**File delta Rev 4:**

```
src/app/campaigns/scene-document-actions.ts
src/lib/map-core-bd/scene-document.ts
src/lib/map-core/raster-export/floor-raster.ts
src/lib/exploration/exploration-map-upload-core.ts
src/components/scene-editor/scene-editor-client.tsx
src/components/scene-editor/scene-editor-list-actions.tsx
src/components/exploration/vista-dall-alto-client.tsx
src/app/campaigns/[id]/gm-only/vista-dall-alto/page.tsx
```

---

### 1. Map Core (portabile)

Layer `src/lib/map-core/**` — **nessuna dipendenza** da Supabase, Telegram, entità B&D:

| Modulo | Ruolo |
|--------|-------|
| `coordinates/` | `NormPoint`, object-contain, pointer→norm, hit-test poligoni |
| `fog/` | Renderer canvas nebbia GM/proiezione, sync FoW (`fow-sync`) |
| `viewer/` | Griglia runtime, `FowRegionViewModel`, overlay note GM |
| `scene-schema/` | `SceneDocumentV1`, layer, preset, props, validazione, `normalize-floor`, `cloneSceneDocument` |
| `scene-schema/layer-presets.ts` | Preset visivi DS: Classic Hatching, Old School, Rough Cavern, Clean Stone |
| `scene-schema/normalize-floor.ts` | Migrazione piani legacy, `prepareSceneDocumentForSave`, `updateActiveLayer` |
| `scene-to-fow/` | Aree pixel → poligoni FoW normalizzati (da `floor.areas` denormalizzate) |
| `scene-editor/union-boundary-edges.ts` | **Rev 3** — perimetro esterno unione geometrica aree (`polygon-clipping`) |
| `scene-editor/auto-walls.ts` | Muri auto dal perimetro union; porte preservate per `wallSegmentKey` |
| `scene-editor/corridor-geometry.ts` | **Rev 3** — corridoi rettilinei/curvi (Catmull-Rom), preview e finalize |
| `scene-editor/ds-renderer.ts` | Rendering stile Dungeon Scrawl (hatch, pavimento, griglia, preview corridoio) |
| `scene-editor/draw-props-svg.ts` | Props silhouette su canvas |
| `scene-editor/draw-floor.ts` | Facciata editor → `paintSceneFloorDs` |
| `scene-editor/snap.ts` | Snap alla griglia |
| `raster-export/floor-raster.ts` | Export WebP via renderer DS |

**Dipendenza npm obbligatoria (Rev 3):** `polygon-clipping` ^0.15.7

### 2. Schema dati

Migration: `supabase/migrations/20260628120000_scene_documents_and_map_source.sql`

**Importare solo righe 1–55 (DDL tabelle/colonne/index/commenti).**

| Oggetto | Ruolo |
|---------|-------|
| `campaign_scene_documents` | Documento JSON multi-piano |
| `campaign_exploration_maps` | `source_type`, `scene_document_id`, `scene_floor_id` |
| `campaign_exploration_fow_regions` | `source_area_id` (sync reveal su re-edit) |

**Non importare righe 56–80** (ENABLE RLS + CREATE POLICY B&D) — gmflow deve scrivere policy multi-tenant proprie.

**Nota schema JSON v1:** versione invariata (`version: 1`). I layer sono backward-compatible: documenti legacy (solo `areas`/`walls` flat) migrati da `normalizeSceneDocument()` al parse/salvataggio.

### 3. Scene Editor (authoring GM)

- Route `/campaigns/[id]/gm-only/scene-editor` — lista, nuova scena, **duplica**, **elimina**
- Route `/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]` — editor completo
- Strumenti: **Seleziona**, stanza (drag rettangolo), **corridoio** (poligono rettilineo o curvo multi-click), porta, **prop**, **nota GM**, elimina
- Toolbar estratta in `scene-editor-tool-overlay.tsx`
- **Nessun muro manuale** — muri generati dal perimetro union delle aree del layer attivo
- **Pannello layer** per piano: aggiungi/elimina, preset stile, opacità, visibilità
- Multi-piano, missione collegata, salvataggio atomico (documento + raster + sync FoW)
- Pan/zoom (`react-zoom-pan-pinch`): strumenti disegno non trascinano il canvas

### 4. Runtime FoW (Vista dall'alto)

- Mappe **importate** (upload + JSON DA/Foundry parallelo) — invariato
- Mappe **generate** (Scene Editor) — raster DS + FoW da `floor.areas` (layer visibili)
- Griglia runtime quando calibrata; proiezione **senza griglia né note GM**
- Note GM overlay solo GM (Vista dall'alto + GM Screen sheet)
- Cache bust raster: `?v=<updated_at>` su URL mappa

### 5. Server actions (pattern B&D)

| Action | Ruolo |
|--------|-------|
| `createSceneDocumentAction` | Nuova scena vuota |
| `getSceneDocumentAction` | Load documento + normalizzazione |
| `saveSceneDocumentAction` | Salva JSON |
| `saveSceneDocumentWithRastersAction` | Salva + raster WebP per piano + sync FoW |
| `listSceneDocumentsAction` | Lista per campagna |
| `duplicateSceneDocumentAction` | Clone + reset FoW |
| `deleteSceneDocumentAction` | Elimina scena + mappe collegate |
| `getSceneFloorGmNotesAction` | Note GM per overlay runtime |
| `verifySceneFowSyncAction` | Diagnostica sync FoW |

### 6. Test unitari

```bash
npm run test:map-core
```

Copre: coordinate, griglia, schema scena, sync FoW, import DA golden, clone documento, auto-walls, normalize-floor, **union-boundary-edges**, **corridor-geometry**.

---

## Fase 5 — Stile Dungeon Scrawl (Rev 2)

| Componente | Comportamento |
|------------|---------------|
| `prepareSceneDocumentForSave` | Denormalizza `areas`/`walls` da tutti i layer visibili → sync FoW |
| `paintSceneFloorDs` | Sfondo chiaro, griglia, hatch fuori muri, fill stanza/corridoio, props silhouette |
| Layer preset | `classic_hatching`, `old_school`, `rough_cavern`, `clean_stone` |
| Editor UX | Layer attivo per disegno/selezione; erase su muro rimuove porta |
| Porte | Preservate per chiave segmento (`wallSegmentKey`) su rigenerazione muri |

## Fase 6 — Union auto-walls + corridoi curvi (Rev 3)

| Componente | Comportamento |
|------------|---------------|
| `unionBoundarySegments` | Unione geometrica di tutti i poligoni area → solo bordi del perimetro esterno |
| `generateWallsFromAreas` | Usa union boundary (non più dedupe per-area); preserva porte e id muro per segmento |
| `corridorPolygonFromCenterline` | Corridoio offset da linea centrale; curva Catmull-Rom se ≥3 punti |
| `finalizeCorridorPolygon` | Chiusura corridoio al doppio click / fine disegno |
| `previewCorridorPolygon` | Anteprima live in editor e ds-renderer durante disegno |
| Stanze sovrapposte | Overlap → un solo perimetro esterno, nessun muro interno fantasma |
| Stanze adiacenti | Rettangoli contigui → perimetro unificato (4 lati), nessun muro sul bordo condiviso |

**Differenza Rev 2 → Rev 3:** in Rev 2 i muri erano deduplicati per bordo condiviso tra coppie di aree. In Rev 3 l'unione è **geometrica** (`polygon-clipping`), gestendo correttamente overlap parziali e forme complesse.

## Scope escluso

- **Wiki maps** (`public.maps`, pin, overlay wiki) — sottosistema separato
- **Vista player in-app** FoW — non esiste in B&D (solo proiezione secondo schermo)
- **Line of sight / VTT** — poligoni + reveal manuale GM sufficienti
- **Conversione import DA → scene_document** — pipeline parallele per design
- **Token drag, multi-player fog, LOS** — fuori roadmap
- **Asset SVG props su disco** (`public/scene-assets/props/*.svg`) — props inline canvas; manifest opzionale
- **Shell layout full-width** (`shell-classes.ts`, padding admin da `e9c93e5`) — modifica layout B&D, non map-core
- **RLS/policy B&D** (righe 56–80 migration) — gmflow scrive policy proprie
- Branding `barber-*`, copy UI italiano, storage Telegram — adattare in gmflow

## Sintesi della modifica

Introduzione di un **Map Core** portabile e di un **Scene Editor** multi-piano integrato con FoW:

1. Due pipeline permanenti: mappe importate vs scene generate.
2. Editor completo (stanze, corridoi rettilinei/curvi, muri auto union, porte, props, note GM, layer multi-stile).
3. Sync FoW con `source_area_id` e preserve `is_revealed` su re-edit.
4. Griglia runtime + calibrazione Roll20 per mappe importate.
5. Duplicazione scena con reset FoW (nuovi id entità).
6. Rendering stile Dungeon Scrawl per editor e raster proiezione.
7. **Rev 3:** muri dal perimetro union geometrico; corridoi curvi Catmull-Rom.

## Comportamento prima

- Solo upload immagini esterne + FoW manuale o import JSON DA/Foundry.
- Nessun editor in-browser; nessun documento strutturato multi-piano.
- Griglia non visualizzata in runtime (metadati DB presenti ma non wired).

## Comportamento dopo (Rev 3)

- Scene Editor crea `campaign_scene_documents` + mappe `generated_scene` per piano.
- Disegno stanze/corridoi sul **layer attivo** → muri dal perimetro **union** delle aree.
- Corridoi: click multipli per centerline curva; anteprima live; finalize al termine.
- Salvataggio rigenera raster WebP (renderer DS) e sincronizza regioni FoW da layer visibili.
- GM reveal in Vista dall'alto / GM sheet / proiezione (senza griglia/note in proiezione).
- Props visibili al tavolo via raster; note GM solo overlay GM.
- Duplica scena → clone documento (layer inclusi) + nuove mappe + FoW oscurata.
- Documenti legacy senza `layers[]` migrati trasparentemente.

## File B&D coinvolti

### Map Core (export integralmente)

```
src/lib/map-core/
  coordinates/
  fog/
  viewer/
  scene-schema/
    types.ts
    validate.ts
    clone-document.ts
    layer-presets.ts
    normalize-floor.ts
    props-catalog.ts
    index.ts
  scene-to-fow/
  scene-editor/
    auto-walls.ts
    union-boundary-edges.ts      ← Rev 3
    corridor-geometry.ts         ← Rev 3
    ds-renderer.ts
    draw-floor.ts
    draw-props.ts
    draw-props-svg.ts
    ids.ts
    snap.ts
  raster-export/
    floor-raster.ts
  index.ts
  __tests__/
    auto-walls.test.ts
    coordinates.test.ts
    corridor-geometry.test.ts    ← Rev 3
    exploration-map-grid.test.ts
    scene-document.test.ts
    train-scene-import.test.ts
    union-boundary-edges.test.ts ← Rev 3
```

### Adapter B&D (pattern reference)

| File | Ruolo |
|------|-------|
| `src/lib/map-core-bd/scene-document.ts` | Persist payload, grid metadata, FoW sync bridge |
| `src/app/campaigns/scene-document-actions.ts` | CRUD scene, save+raster, duplicate, delete, revalidate FoW |
| `src/app/campaigns/exploration-map-actions.ts` | Mappe FoW legacy + import DA |
| `src/lib/exploration/exploration-map-grid.ts` | Risoluzione overlay griglia |
| `src/lib/exploration/exploration-storage.ts` | URL pubblico mappa con cache bust |
| `src/lib/exploration/fow-geometry.ts` | Re-export compatibilità → map-core |
| `src/lib/exploration/train-scene-import.ts` | Import JSON DA/Foundry (parallelo) |

### UI B&D

| File | Ruolo |
|------|-------|
| `src/components/scene-editor/scene-editor-client.tsx` | Editor client, layer, strumenti, disegno corridoio |
| `src/components/scene-editor/scene-editor-canvas.tsx` | Canvas + pan/zoom |
| `src/components/scene-editor/scene-editor-tool-overlay.tsx` | Toolbar strumenti (Rev 3 estratta) |
| `src/components/scene-editor/scene-editor-list-actions.tsx` | Duplica / elimina scena |
| `src/components/exploration/exploration-map-stage.tsx` | Wrapper runtime (FoW, effetti, griglia, note GM) |
| `src/components/exploration/vista-dall-alto-client.tsx` | GM FoW editor + calibrazione griglia |
| `src/components/exploration/use-exploration-map-grid.ts` | Hook griglia |
| `src/components/gm/gm-exploration-fow-sheet.tsx` | FoW live da GM screen |

### Route

```
src/app/campaigns/[id]/gm-only/scene-editor/
src/app/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]/
src/app/campaigns/[id]/gm-only/vista-dall-alto/
src/app/campaigns/[id]/gm-only/vista-dall-alto/proiezione/
```

### Asset statici

```
public/scene-assets/manifest.json
```

### Documentazione

```
docs/adr-map-scene-editor.md
docs/gmflow-export-packages/2026-05-28-map-scene-editor-export.md
```

### package.json

```json
"polygon-clipping": "^0.15.7"
```

## Backend coinvolto

- Server Actions Next.js (`scene-document-actions.ts`) — nessuna nuova API REST dedicata
- Supabase: read/write `campaign_scene_documents`, `campaign_exploration_maps`, `campaign_exploration_fow_regions`
- Storage raster: upload WebP per piano (Telegram in B&D → adapter gmflow)
- Auth: GM/admin per route `gm-only/scene-editor`

## Database coinvolto

**Migration:** `20260628120000_scene_documents_and_map_source.sql`

| Tabella/colonna | Tipo |
|-----------------|------|
| `campaign_scene_documents` | Nuova tabella |
| `campaign_exploration_maps.source_type` | `uploaded_image` \| `generated_scene` |
| `campaign_exploration_maps.scene_document_id` | FK scena |
| `campaign_exploration_maps.scene_floor_id` | ID piano JSON |
| `campaign_exploration_fow_regions.source_area_id` | Link area scena → FoW |

**RLS:** non esportare policy B&D — implementare in gmflow con isolamento tenant.

## Storage coinvolto

- Raster WebP per piano (`saveSceneDocumentWithRastersAction`)
- B&D: Telegram — gmflow: R2/Blob/S3 via adapter

## Provider o servizi esterni coinvolti

Nessun provider AI o API esterna. Solo Supabase + storage immagini.

## Variabili ambiente richieste

Nessuna variabile dedicata al modulo mappe oltre a:

- Supabase URL + anon key (standard)
- Storage immagini mappe — **adapter gmflow** (non `TELEGRAM_BOT_TOKEN`)

## Parti specifiche B&D da rimuovere

| Elemento | Azione gmflow |
|----------|---------------|
| `uploadImageToTelegram` | `MapStoragePort` → R2/S3/Blob |
| Classi `barber-*` | Design system gmflow |
| Copy italiano hardcoded | i18n |
| `requireGm` / ruolo `gm` \| `admin` | RBAC multi-tenant gmflow |
| Policy RLS B&D su `campaign_scene_documents` | Policy gmflow-native |
| Effetti PixiJS proiezione | Opzionale |

## Adattamento richiesto per gmflow

1. **Copiare `map-core/**` integralmente** come package `@gmflow/map-core` o monorepo path.
2. Installare **`polygon-clipping`** (Rev 3).
3. Implementare **adapter storage** per raster piano (WebP).
4. Eseguire **DDL migration** (righe 1–55) + **policy RLS gmflow**.
5. **RBAC**: scope `campaignId` / `organizationId` per tenant.
6. Portare **server actions pattern** da `scene-document-actions.ts`.
7. **UI**: ricostruire wrapper su `map-core/viewer`; adattare CSS tema.
8. **Migrazione legacy**: `normalizeSceneDocument()` su ogni load/save pre-Fase-5.
9. **Import DA**: opzionale; mantenere `train-scene-import` se serve compatibilità Roll20.

## Ambiguità rilevate

| # | Ambiguità | Nota |
|---|-----------|------|
| A1 | Policy RLS B&D è guild-wide GM/admin | gmflow potrebbe richiedere scope org — **NEEDS_DECISION** |
| A2 | `exploration-map-stage.tsx` monolite (~1700 righe) | Importare come wrapper o refactor graduale |
| A3 | Realtime su `campaign_scene_documents` (righe 82–89 migration) | Opzionale in gmflow |
| A4 | Preset DS vs tema gmflow | Mantenere preset o semplificare renderer |

## Rischi

| Rischio | Mitigazione |
|---------|-------------|
| `polygon-clipping` edge cases su poligoni degeneri | Test union-boundary-edges; validazione in `validate.ts` |
| FoW desync dopo re-edit scena | `verifySceneFowSyncAction` + test `planSceneFowRegionSync` |
| Raster pesante multi-piano | WebP + cache bust `?v=updated_at` |
| Import RLS B&D per errore | Importare solo DDL righe 1–55 |

## Contratto `SceneDocumentV1` (v1, esteso Fase 5–6)

```typescript
type SceneLayerPresetId =
  | "classic_hatching"
  | "old_school"
  | "rough_cavern"
  | "clean_stone";

type SceneDocumentV1 = {
  version: 1;
  name: string;
  linkedMissionId: string | null;
  floors: Array<{
    id: string;
    label: string;
    sortOrder: number;
    width: number;
    height: number;
    grid: { kind: "square"; cellPx: number; offsetX: number; offsetY: number };
    /** Denormalizzato: unione aree di tutti i layer visibili (FoW sync). */
    areas: Array<{ id; kind: "room" | "corridor"; polygon: { x; y }[]; label? }>;
    /** Denormalizzato: muri auto-generati (union boundary Rev 3). */
    walls: Array<{ id; x1; y1; x2; y2; door?: { width; offset } }>;
    layers: Array<{
      id: string;
      label: string;
      sortOrder: number;
      presetId: SceneLayerPresetId;
      opacity: number;
      visible: boolean;
      areas: Array<{ id; kind: "room" | "corridor"; polygon: { x; y }[]; label? }>;
      walls: Array<{ id; x1; y1; x2; y2; door?: { width; offset } }>;
    }>;
    activeLayerId: string;
    props: Array<{ id; kind: ScenePropKindV1; x; y; rotation?; scale? }>;
    gmNotes: Array<{ id; x; y; text; width? }>;
  }>;
};
```

### API map-core essenziali (Rev 3)

```typescript
// Migrazione + save
normalizeSceneDocument(doc: SceneDocumentV1): SceneDocumentV1
prepareSceneDocumentForSave(doc: SceneDocumentV1): SceneDocumentV1
updateActiveLayer(floor, updater): SceneFloorV1
getActiveLayer(floor): SceneLayerV1

// Muri (Rev 3 — union)
unionBoundarySegments(polygons: PolyPoint[][]): BoundarySegment[]
generateWallsFromAreas(areas, existingWalls?, { preserveWallIds? }): SceneWallV1[]
wallSegmentKey(x1, y1, x2, y2): string

// Corridoi (Rev 3)
corridorQuadFromSegment(start, end, halfWidth): CorridorPoint[] | null
corridorPolygonFromCenterline(centerline, halfWidth, { curved?, samplesPerSpan? }): CorridorPoint[] | null
finalizeCorridorPolygon(centerline, halfWidth): CorridorPoint[] | null
previewCorridorPolygon(centerline, cursor, halfWidth, curved): CorridorPoint[] | null

// Rendering
paintSceneFloorDs(ctx, floor, options): void
exportFloorRasterBlob(floor): Promise<Blob>
```

## Test minimi richiesti post-import

### Unit (`npm run test:map-core`)

- [ ] Coordinate roundtrip object-contain
- [ ] `parseSceneDocumentV1` con props, gmNotes e layer
- [ ] `normalizeSceneFloor` migra piani legacy senza `layers[]`
- [ ] **`unionBoundarySegments`** — rettangolo singolo, overlap, adiacenza
- [ ] **`generateWallsFromAreas`** — union boundary, preserve porta per segmento
- [ ] **`corridorPolygonFromCenterline`** — rettilineo e curvo (≥3 punti)
- [ ] `cloneSceneDocument` rigenera id (layer inclusi)
- [ ] `planSceneFowRegionSync` preserve reveal
- [ ] `resolveExplorationMapGridOverlay`
- [ ] Import DA golden (`train-scene-import`)

### Integrazione

- [ ] Crea scena 2 piani, 2 layer → salva → mappe DS in Vista dall'alto
- [ ] Stanze adiacenti: perimetro unificato, nessun muro sul bordo condiviso
- [ ] Stanze sovrapposte parzialmente: muri solo perimetro esterno union
- [ ] Corridoio curvo (≥3 click): poligono valido + muri coerenti
- [ ] Porta su muro → re-edit stanza → porta preservata sullo stesso segmento
- [ ] Layer nascosto: aree non compaiono in FoW dopo save
- [ ] Reveal area → re-edit scena → reveal preservato per `area.id` stabile
- [ ] Duplica scena → FoW reset
- [ ] Props visibili in raster DS; note GM in GM view, assenti in proiezione
- [ ] Upload immagine + import JSON DA ancora funzionanti
- [ ] Documento legacy (pre-layer) si apre e salva correttamente
- [ ] **Rev 4:** Crea scena → compare in Vista dall'alto senza publish separato
- [ ] **Rev 4:** Salva scena → raster reale (non placeholder 1×1)
- [ ] **Rev 4:** Scene orfane riparate al load lista

## Import Contract per gmflow

### Fase 1 — Core (obbligatoria)

1. Importare `src/lib/map-core/**` (inclusi `union-boundary-edges`, `corridor-geometry`)
2. `npm install polygon-clipping`
3. Eseguire DDL migration (righe 1–55) + policy RLS gmflow
4. Portare `scene-to-fow`, `fow-sync`, `scene-schema` completo

### Fase 2 — Adapter (obbligatoria)

1. Storage raster (WebP)
2. Repository scene + exploration maps
3. Server actions da `scene-document-actions.ts`
4. `normalizeSceneDocument` / `prepareSceneDocumentForSave` nel path save/load
5. `map-core-bd/scene-document.ts` come pattern bridge

### Fase 3 — UI (obbligatoria per feature parity)

1. Scene Editor (`scene-editor-client`, canvas, tool-overlay, list-actions)
2. Runtime viewer wrapper (griglia, FoW, note GM)
3. Vista GM + proiezione

### Fase 4 — Opzionale

1. Effetti proiezione PixiJS
2. Import DA/Foundry
3. Asset SVG props custom
4. Realtime Supabase su `campaign_scene_documents`

### Verifica post-import

```bash
npm run test:map-core
npm run build
rg "polygon-clipping" package.json
rg "CREATE POLICY" supabase/migrations/*scene_documents*  # zero policy B&D importate
rg "map-core" src --glob "!**/node_modules/**"
```

## Prompt per gmflow Import Agent

```
Import Agent gmflow — Export ID: bnd-map-scene-editor-2026-05-28 (Revisione 4)

Package: docs/gmflow-export-packages/2026-05-28-map-scene-editor-export.md
(sincronizzato in docs/imports/gmflow-export-packages/ se presente)

OBIETTIVO
Importare il modulo completo Map Core + Scene Editor + FoW da Barber & Dragons,
inclusa Revisione 3–4 (union auto-walls, corridoi curvi, FoW sync, raster FormData).

COMMIT B&D
- 94b0f4e feat(maps): scene editor + map-core + FoW
- be804da feat(maps): DS rendering, auto-walls, layer presets
- e9c93e5 feat(maps): union-based auto-walls (SOLO map-core, NON shell layout)
- 3cf1907 fix(maps): sync Scene Editor scenes to Esplorazione e FoW on create
- f9bcd77 fix(maps): upload full Scene Editor rasters from FormData on save

IMPORTARE
1. src/lib/map-core/** (intero albero)
2. src/lib/map-core-bd/scene-document.ts
3. src/app/campaigns/scene-document-actions.ts
4. src/lib/exploration/exploration-map-grid.ts, exploration-storage.ts, fow-geometry.ts
5. src/components/scene-editor/**
6. src/components/exploration/exploration-map-stage.tsx, vista-dall-alto-client.tsx, use-exploration-map-grid.ts
7. src/components/gm/gm-exploration-fow-sheet.tsx
8. Route gm-only/scene-editor, vista-dall-alto
9. public/scene-assets/manifest.json
10. package.json: polygon-clipping ^0.15.7
11. Migration DDL righe 1-55 di 20260628120000_scene_documents_and_map_source.sql

NON IMPORTARE
- RLS/policy B&D (righe 56-80 migration)
- shell-classes.ts, padding admin pages (e9c93e5 layout)
- Branding barber-*, Telegram storage

ADATTAMENTI OBBLIGATORI
- Storage raster → R2/Blob gmflow
- RLS multi-tenant gmflow su campaign_scene_documents
- RBAC org-scoped (NEEDS_DECISION se guild-wide vs per-org)
- CSS/design system gmflow

ORDINE
Fase 1 map-core + polygon-clipping → Fase 2 adapter/actions → Fase 3 UI → test:map-core

TEST
Checklist integrazione nel package. npm run test:map-core deve passare.
```

## Vincoli

- Non modificare gmflow da B&D
- Non includere segreti
- Non importare policy RLS B&D
- Non importare shell layout B&D
- Package autosufficiente per Import Agent gmflow

## Changelog revisioni

| Rev | Data | Contenuto |
|-----|------|-----------|
| 1 | 2026-05-28 | Fasi 0–4: Map Core, Scene Editor, griglia, props, note GM, duplicazione |
| 2 | 2026-05-28 | Fase 5: layer + preset DS, auto-walls per-area, renderer DS, migrazione legacy |
| 3 | 2026-06-28 | Fase 6: union auto-walls (`polygon-clipping`), corridoi curvi Catmull-Rom, tool-overlay, server actions complete, note RLS/adapter gmflow, prompt Import Agent |
| 4 | 2026-07-06 | Fase 7: FoW sync on create, heal orphaned scenes, raster FormData/PNG, no placeholder 1×1 |

## Riferimenti

- ADR: `docs/adr-map-scene-editor.md`
- Piano: Strategia C (Map Core refactor), decisioni maggio–luglio 2026
- Ispirazione rendering: [Dungeon Scrawl](https://app.dungeonscrawl.com/)
- Package correlato: `bnd-features-bugfixes-2026-07-06` (delta mappe se package completo già importato)

---

**Generato/aggiornato:** 2026-07-06 — Export Agent Barber & Dragons
