# Export Package: Map Core + Scene Editor + Fog of War

## Export ID

bnd-map-scene-editor-2026-05-28

**Revisione 2** — Fase 5 (stile Dungeon Scrawl, layer, muri automatici) — 2026-05-28

## Origine

Barber & Dragons

## Destinazione prevista

gmflow.app

## Scope autorizzato

Export completo del modulo **mappe tattiche / Scene Editor / Fog of War** (Fasi 0–5), sviluppato tra maggio–giugno 2026.

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
| `scene-editor/auto-walls.ts` | Muri auto-generati dai bordi **esterni** delle aree; porte per segmento |
| `scene-editor/ds-renderer.ts` | Rendering stile Dungeon Scrawl (hatch, pavimento chiaro, griglia) |
| `scene-editor/draw-props-svg.ts` | Props silhouette nere su canvas |
| `scene-editor/draw-floor.ts` | Facciata editor → `paintSceneFloorDs` |
| `scene-editor/snap.ts` | Snap alla griglia |
| `raster-export/floor-raster.ts` | Export WebP via renderer DS (griglia + layer + props) |

### 2. Schema dati

Migration: `supabase/migrations/20260628120000_scene_documents_and_map_source.sql`

- `campaign_scene_documents` — documento JSON multi-piano
- `campaign_exploration_maps`: `source_type`, `scene_document_id`, `scene_floor_id`
- `campaign_exploration_fow_regions`: `source_area_id` (sync reveal su re-edit)

**Nota Fase 5:** lo schema JSON v1 non cambia versione (`version: 1`). I layer sono un'estensione backward-compatible: documenti legacy (solo `areas`/`walls` flat) vengono migrati da `normalizeSceneDocument()` al parse/salvataggio.

### 3. Scene Editor (authoring GM)

- Route `/campaigns/[id]/gm-only/scene-editor` — lista, nuova scena, **duplica**, **elimina**
- Route `/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]` — editor completo
- Strumenti: **Pan**, stanza (drag rettangolo), corridoio (poligono), porta, **prop**, **nota GM**, selezione, elimina
- **Nessun muro manuale** — i muri si generano dalle aree del layer attivo
- **Pannello layer** per piano: aggiungi/elimina, preset stile, opacità, visibilità
- Multi-piano, missione collegata, salvataggio atomico (documento + raster + sync FoW)
- Pan/zoom (`react-zoom-pan-pinch`): strumenti di disegno non trascinano il canvas

### 4. Runtime FoW (Vista dall'alto)

- Mappe **importate** (upload + JSON DA/Foundry parallelo) — invariato
- Mappe **generate** (Scene Editor) — raster DS + FoW da `floor.areas` (layer visibili)
- Griglia runtime quando calibrata; proiezione **senza griglia né note GM**
- Note GM overlay solo GM (Vista dall'alto + GM Screen sheet)
- Cache bust raster: `?v=<updated_at>` su URL mappa

### 5. Test unitari

```bash
npm run test:map-core
```

Copre coordinate, griglia, schema scena, sync FoW, import DA golden, clone documento, **auto-walls**, **normalize-floor**.

## Fase 5 — Stile Dungeon Scrawl (dettaglio export)

| Componente | Comportamento |
|------------|---------------|
| `generateWallsFromAreas` | Un muro per bordo **esterno** di ogni area; bordi condivisi tra due stanze adiacenti **non** generano muro |
| Porte | Preservate per chiave segmento (`wallSegmentKey`) su rigenerazione muri |
| `prepareSceneDocumentForSave` | Denormalizza `areas`/`walls` da tutti i layer visibili → sync FoW |
| `paintSceneFloorDs` | Sfondo chiaro, griglia, hatch fuori muri, fill stanza/corridoio, props silhouette |
| Layer preset | `classic_hatching`, `old_school`, `rough_cavern`, `clean_stone` |
| Editor UX | Tool Pan separato; layer attivo per disegno/selezione; erase su muro rimuove porta |

## Scope escluso

- **Wiki maps** (`public.maps`, pin, overlay wiki) — sottosistema separato, fuori scope
- **Vista player in-app** FoW — non esiste in B&D (solo proiezione secondo schermo)
- **Line of sight / VTT** — poligoni + reveal manuale GM sufficienti
- **Conversione import DA → scene_document** — pipeline parallele per design
- **Token drag, multi-player fog, LOS** — fuori roadmap
- **Asset SVG props su disco** (`public/scene-assets/props/*.svg`) — props disegnati inline su canvas; manifest presente ma SVG non obbligatori
- Branding `barber-*`, copy UI italiano, storage Telegram — adattare in gmflow

## Sintesi della modifica

Introduzione di un **Map Core** portabile e di un **Scene Editor** multi-piano integrato con il FoW esistente:

1. Due pipeline permanenti: mappe importate vs scene generate.
2. Editor completo (stanze, corridoi poligonali, **muri auto**, porte, props, note GM, **layer multi-stile**).
3. Sync FoW con `source_area_id` e preserve `is_revealed` su re-edit.
4. Griglia runtime + calibrazione Roll20 per mappe importate.
5. Duplicazione scena con reset FoW (nuovi id entità).
6. **Rendering stile Dungeon Scrawl** per editor e raster proiezione.

## Comportamento prima

- Solo upload immagini esterne + FoW manuale o import JSON DA/Foundry.
- Nessun editor in-browser; nessun documento strutturato multi-piano.
- Griglia non visualizzata in runtime (metadati DB presenti ma non wired).

## Comportamento dopo (Fase 5)

- Scene Editor crea `campaign_scene_documents` + mappe `generated_scene` per piano.
- Disegno stanze/corridoi sul **layer attivo** → muri esterni auto-generati.
- Salvataggio rigenera raster WebP (renderer DS: griglia + hatch + props) e sincronizza regioni FoW da layer visibili.
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
    ds-renderer.ts
    draw-floor.ts
    draw-props.ts
    draw-props-svg.ts
    ids.ts
    snap.ts
  raster-export/
    floor-raster.ts
  __tests__/
    auto-walls.test.ts
    coordinates.test.ts
    exploration-map-grid.test.ts
    scene-document.test.ts
    train-scene-import.test.ts
```

### Adapter B&D (pattern reference, non copy-paste)

| File | Ruolo |
|------|-------|
| `src/lib/map-core-bd/scene-document.ts` | Persist payload, grid metadata, FoW sync bridge |
| `src/app/campaigns/scene-document-actions.ts` | CRUD scene, save+raster, duplicate, delete, revalidate FoW |
| `src/app/campaigns/exploration-map-actions.ts` | Mappe FoW legacy + import DA |
| `src/lib/exploration/exploration-map-grid.ts` | Risoluzione overlay griglia |
| `src/lib/exploration/exploration-storage.ts` | URL pubblico mappa con cache bust |
| `src/lib/exploration/train-scene-import.ts` | Import JSON DA/Foundry (parallelo) |
| `src/lib/exploration/exploration-map-upload-core.ts` | Upload immagini |

### UI B&D

| File | Ruolo |
|------|-------|
| `src/components/scene-editor/scene-editor-client.tsx` | Editor client, pannello layer, strumenti DS |
| `src/components/scene-editor/scene-editor-canvas.tsx` | Canvas + pan/zoom, disegno senza pan accidentale |
| `src/components/scene-editor/scene-editor-list-actions.tsx` | Duplica / elimina scena |
| `src/components/exploration/exploration-map-stage.tsx` | Wrapper runtime (FoW, effetti, griglia, note GM) |
| `src/components/exploration/vista-dall-alto-client.tsx` | GM FoW editor + calibrazione griglia |
| `src/components/exploration/vista-dall-alto-projection.tsx` | Proiezione tavolo |
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

## Variabili ambiente

Nessuna variabile dedicata al modulo mappe oltre a quelle già usate da B&D:

- Storage immagini mappe: Telegram (`uploadImageToTelegram`) in B&D — **sostituire con adapter gmflow**
- Supabase: URL + anon key (standard)

## Parti specifiche B&D da rimuovere/adattare

| Elemento | Azione gmflow |
|----------|---------------|
| `uploadImageToTelegram` | `MapStoragePort` → R2/S3/Blob |
| Classi `barber-*` | Design system gmflow |
| Copy italiano hardcoded | i18n |
| `requireGm` / ruolo `gm` \| `admin` | RBAC multi-tenant gmflow |
| Effetti PixiJS proiezione (`pixi-smoke-effects`) | Opzionale: importare o semplificare |
| `react-zoom-pan-pinch` in editor | Mantenere o equivalente |

## Adattamento richiesto per gmflow

1. **Copiare `map-core/**` integralmente** come package `@gmflow/map-core` o monorepo path.
2. Implementare **adapter storage** per raster piano (WebP) e placeholder.
3. Implementare **repository** Supabase/Postgres con stesso schema (o JSONB generico `scene_documents`).
4. **RBAC**: scope `campaignId` per tenant.
5. **UI**: ricostruire wrapper su `map-core/viewer`; non portare `exploration-map-stage` monolite senza refactor.
6. **Import DA**: opzionale in gmflow; mantenere `train-scene-import` come adapter se serve compatibilità Roll20.
7. **Migrazione legacy**: chiamare `normalizeSceneDocument()` su ogni load/save di documenti pre-Fase-5.

## Contratto `SceneDocumentV1` (v1, esteso Fase 5)

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
    /** Denormalizzato: muri auto-generati dai layer visibili. */
    walls: Array<{ id; x1; y1; x2; y2; door?: { width; offset } }>;
    layers: Array<{
      id: string;
      label: string;
      sortOrder: number;
      presetId: SceneLayerPresetId;
      opacity: number; // 0.05–1
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

Prop kinds: `barrel`, `crate`, `table`, `chair`, `torch`, `pillar`, `statue`, `boulder`, `campfire`, `altar`, `star`, `stairs`, `coffin`.

### API map-core essenziali (Fase 5)

```typescript
// Migrazione + save
normalizeSceneDocument(doc: SceneDocumentV1): SceneDocumentV1
prepareSceneDocumentForSave(doc: SceneDocumentV1): SceneDocumentV1
updateActiveLayer(floor, updater): SceneFloorV1
getActiveLayer(floor): SceneLayerV1

// Muri
generateWallsFromAreas(areas, existingWalls?, { preserveWallIds? }): SceneWallV1[]

// Rendering
paintSceneFloorDs(ctx, floor, options): void
exportFloorRasterBlob(floor): Promise<Blob>
```

## Test minimi richiesti post-import

### Unit (`npm run test:map-core`)

- [ ] Coordinate roundtrip object-contain
- [ ] `parseSceneDocumentV1` con props, gmNotes e layer
- [ ] `normalizeSceneFloor` migra piani legacy senza `layers[]`
- [ ] `generateWallsFromAreas` — bordi esterni, dedupe stanze adiacenti, preserve porta
- [ ] `cloneSceneDocument` rigenera id (layer inclusi)
- [ ] `planSceneFowRegionSync` preserve reveal
- [ ] `resolveExplorationMapGridOverlay`
- [ ] Import DA golden (`train-scene-import`)

### Integrazione

- [ ] Crea scena 2 piani, 2 layer → salva → mappe DS in Vista dall'alto
- [ ] Stanze adiacenti: nessun muro doppio sul bordo condiviso
- [ ] Porta su muro → re-edit stanza → porta preservata sullo stesso segmento
- [ ] Layer nascosto: aree non compaiono in FoW dopo save
- [ ] Reveal area → re-edit scena → reveal preservato per `area.id` stabile
- [ ] Duplica scena → FoW reset
- [ ] Props visibili in raster DS; note GM in GM view, assenti in proiezione
- [ ] Upload immagine + import JSON DA ancora funzionanti
- [ ] Documento legacy (pre-layer) si apre e salva correttamente

## Import Contract per gmflow

### Fase 1 — Core (obbligatoria)

1. Importare `src/lib/map-core/**`
2. Eseguire migration schema (o equivalente)
3. Portare `scene-to-fow`, `fow-sync`, `scene-schema` (inclusi `layer-presets`, `normalize-floor`, `auto-walls`, `ds-renderer`)

### Fase 2 — Adapter (obbligatoria)

1. Storage raster
2. Repository scene + exploration maps
3. Server actions pattern da `scene-document-actions.ts`
4. `normalizeSceneDocument` / `prepareSceneDocumentForSave` nel path save/load

### Fase 3 — UI (obbligatoria per feature parity)

1. Scene Editor (`scene-editor-client`, canvas, pannello layer)
2. Runtime viewer wrapper (griglia, FoW, note GM)
3. Vista GM + proiezione

### Fase 4 — Opzionale

1. Effetti proiezione PixiJS
2. Import DA/Foundry
3. Asset SVG props custom (`public/scene-assets/props/`)

### Verifica post-import

```bash
npm run test:map-core
npm run build
rg "map-core" src --glob "!**/node_modules/**"
```

## Changelog revisione

| Rev | Data | Contenuto |
|-----|------|-----------|
| 1 | 2026-05-28 | Fasi 0–4: Map Core, Scene Editor, griglia, props, note GM, duplicazione |
| 2 | 2026-05-28 | Fase 5: layer + preset DS, muri auto, renderer DS, props silhouette, migrazione legacy |

## Riferimenti

- ADR: `docs/adr-map-scene-editor.md`
- Piano originale: Strategia C (Map Core refactor), decisioni utente maggio 2026
- Ispirazione UX rendering: [Dungeon Scrawl](https://app.dungeonscrawl.com/)
