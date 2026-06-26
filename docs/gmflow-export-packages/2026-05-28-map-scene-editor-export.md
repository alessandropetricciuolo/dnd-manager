# Export Package: Map Core + Scene Editor + Fog of War

## Export ID

bnd-map-scene-editor-2026-05-28

## Origine

Barber & Dragons

## Destinazione prevista

gmflow.app

## Scope autorizzato

Export completo del modulo **mappe tattiche / Scene Editor / Fog of War** (Fasi 0–4), sviluppato tra maggio–giugno 2026.

### 1. Map Core (portabile)

Layer `src/lib/map-core/**` — **nessuna dipendenza** da Supabase, Telegram, entità B&D:

| Modulo | Ruolo |
|--------|-------|
| `coordinates/` | `NormPoint`, object-contain, pointer→norm, hit-test poligoni |
| `fog/` | Renderer canvas nebbia GM/proiezione, sync FoW (`fow-sync`) |
| `viewer/` | Griglia runtime, `FowRegionViewModel`, overlay note GM |
| `scene-schema/` | `SceneDocumentV1`, props, note GM, validazione, `cloneSceneDocument` |
| `scene-to-fow/` | Aree pixel → poligoni FoW normalizzati |
| `scene-editor/` | Snap griglia, disegno piano editor, preset props canvas |
| `raster-export/` | Export WebP minimale (griglia + aree + muri + props) |

### 2. Schema dati

Migration: `supabase/migrations/20260628120000_scene_documents_and_map_source.sql`

- `campaign_scene_documents` — documento JSON multi-piano
- `campaign_exploration_maps`: `source_type`, `scene_document_id`, `scene_floor_id`
- `campaign_exploration_fow_regions`: `source_area_id` (sync reveal su re-edit)

### 3. Scene Editor (authoring GM)

- Route `/campaigns/[id]/gm-only/scene-editor` — lista, nuova scena, **duplica**
- Route `/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]` — editor completo
- Strumenti: stanza, corridoio, muro, porta, **prop**, **nota GM**, selezione, elimina
- Multi-piano, missione collegata, salvataggio atomico (documento + raster + sync FoW)

### 4. Runtime FoW (Vista dall'alto)

- Mappe **importate** (upload + JSON DA/Foundry parallelo) — invariato
- Mappe **generate** (Scene Editor) — raster + FoW da aree
- Griglia runtime quando calibrata; proiezione **senza griglia né note GM**
- Note GM overlay solo GM (Vista dall'alto + GM Screen sheet)

### 5. Test unitari

```bash
npm run test:map-core
```

Copre coordinate, griglia, schema scena, sync FoW, import DA golden, clone documento.

## Scope escluso

- **Wiki maps** (`public.maps`, pin, overlay wiki) — sottosistema separato, fuori scope
- **Vista player in-app** FoW — non esiste in B&D (solo proiezione secondo schermo)
- **Line of sight / VTT** — poligoni + reveal manuale GM sufficienti
- **Conversione import DA → scene_document** — pipeline parallele per design
- **Token drag, multi-player fog, LOS** — fuori roadmap
- Branding `barber-*`, copy UI italiano, storage Telegram — adattare in gmflow

## Sintesi della modifica

Introduzione di un **Map Core** portabile e di un **Scene Editor** multi-piano integrato con il FoW esistente:

1. Due pipeline permanenti: mappe importate vs scene generate.
2. Editor completo (stanze, corridoi poligonali, muri, porte, props, note GM).
3. Sync FoW con `source_area_id` e preserve `is_revealed` su re-edit.
4. Griglia runtime + calibrazione Roll20 per mappe importate.
5. Duplicazione scena con reset FoW (nuovi id entità).

## Comportamento prima

- Solo upload immagini esterne + FoW manuale o import JSON DA/Foundry.
- Nessun editor in-browser; nessun documento strutturato multi-piano.
- Griglia non visualizzata in runtime (metadati DB presenti ma non wired).

## Comportamento dopo

- Scene Editor crea `campaign_scene_documents` + mappe `generated_scene` per piano.
- Salvataggio rigenera raster WebP (griglia + muri + props) e sincronizza regioni FoW.
- GM reveal in Vista dall'alto / GM sheet / proiezione (senza griglia/note in proiezione).
- Props visibili al tavolo via raster; note GM solo overlay GM.
- Duplica scena → clone documento + nuove mappe + FoW oscurata.

## File B&D coinvolti

### Map Core (export integralmente)

```
src/lib/map-core/
  coordinates/
  fog/
  viewer/
  scene-schema/
  scene-to-fow/
  scene-editor/
  raster-export/
  __tests__/
```

### Adapter B&D (pattern reference, non copy-paste)

| File | Ruolo |
|------|-------|
| `src/lib/map-core-bd/scene-document.ts` | Persist payload, grid metadata, FoW sync bridge |
| `src/app/campaigns/scene-document-actions.ts` | CRUD scene, save+raster, duplicate, gm notes fetch |
| `src/app/campaigns/exploration-map-actions.ts` | Mappe FoW legacy + import DA |
| `src/lib/exploration/exploration-map-grid.ts` | Risoluzione overlay griglia |
| `src/lib/exploration/train-scene-import.ts` | Import JSON DA/Foundry (parallelo) |
| `src/lib/exploration/exploration-map-upload-core.ts` | Upload immagini |

### UI B&D

| File | Ruolo |
|------|-------|
| `src/components/scene-editor/*` | Editor client + canvas + lista azioni |
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

## Contratto `SceneDocumentV1` (v1)

```typescript
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
    areas: Array<{ id; kind: "room" | "corridor"; polygon: {x,y}[]; label? }>;
    walls: Array<{ id; x1; y1; x2; y2; door?: { width; offset } }>;
    props: Array<{ id; kind: ScenePropKindV1; x; y; rotation?; scale? }>;
    gmNotes: Array<{ id; x; y; text; width? }>;
  }>;
};
```

Prop kinds: `barrel`, `crate`, `table`, `chair`, `torch`, `pillar`, `statue`, `boulder`, `campfire`, `altar`.

## Test minimi richiesti post-import

### Unit (`npm run test:map-core`)

- [ ] Coordinate roundtrip object-contain
- [ ] `parseSceneDocumentV1` con props e gmNotes
- [ ] `cloneSceneDocument` rigenera id
- [ ] `planSceneFowRegionSync` preserve reveal
- [ ] `resolveExplorationMapGridOverlay`
- [ ] Import DA golden (`train-scene-import`)

### Integrazione

- [ ] Crea scena 2 piani → salva → mappe in Vista dall'alto
- [ ] Reveal area → re-edit scena → reveal preservato per `area.id` stabile
- [ ] Duplica scena → FoW reset
- [ ] Props visibili in raster; note GM in GM view, assenti in proiezione
- [ ] Upload immagine + import JSON DA ancora funzionanti

## Import Contract per gmflow

### Fase 1 — Core (obbligatoria)

1. Importare `src/lib/map-core/**`
2. Eseguire migration schema (o equivalente)
3. Portare `scene-to-fow`, `fow-sync`, `scene-schema`

### Fase 2 — Adapter (obbligatoria)

1. Storage raster
2. Repository scene + exploration maps
3. Server actions pattern da `scene-document-actions.ts`

### Fase 3 — UI (obbligatoria per feature parity)

1. Scene Editor (`scene-editor-client`, canvas)
2. Runtime viewer wrapper (griglia, FoW, note GM)
3. Vista GM + proiezione

### Fase 4 — Opzionale

1. Effetti proiezione PixiJS
2. Import DA/Foundry
3. `public/scene-assets` skin SVG custom

### Verifica post-import

```bash
npm run test:map-core
npm run build
rg "map-core" src --glob "!**/node_modules/**"
```

## Riferimenti

- ADR: `docs/adr-map-scene-editor.md`
- Piano originale: Strategia C (Map Core refactor), decisioni utente maggio 2026
