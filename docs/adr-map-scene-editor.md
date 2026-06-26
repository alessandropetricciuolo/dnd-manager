# ADR — Map Core (Fase 0)

## Stato

**Accettato** — Fase 0–5 completate (Map Core, Scene Editor, griglia, props, note GM, duplicazione, export gmflow, stile DS).

## Fase 5 — Stile Dungeon Scrawl, layer, muri automatici

- Schema: `layers[]`, `activeLayerId`, preset stile per layer (`classic_hatching`, `old_school`, `rough_cavern`, `clean_stone`)
- `normalize-floor.ts` — migrazione piani legacy, `prepareSceneDocumentForSave` per FoW denormalizzato
- `auto-walls.ts` — muri generati dai bordi delle aree; porte preservate per segmento
- `ds-renderer.ts` — rendering hatch, pavimento chiaro, griglia, props silhouette SVG
- Editor: pannello layer (preset, opacità, visibilità); rimosso strumento Muro manuale
- Raster export usa lo stesso renderer DS

## Fase 4 — Props, note GM, duplicazione, export gmflow

- Schema: `props[]`, `gmNotes[]` per piano in `SceneDocumentV1`
- Catalogo preset: `scene-schema/props-catalog.ts`, manifest `public/scene-assets/manifest.json`
- Editor: strumenti Prop e Nota GM; props nel raster proiezione
- Note GM: overlay in Vista dall&apos;alto e GM sheet; **nascoste in proiezione**
- `duplicateSceneDocumentAction` + pulsante Duplica in lista scene
- `cloneSceneDocument` — nuovi id, FoW reset al salvataggio
- Package gmflow: `docs/gmflow-export-packages/2026-05-28-map-scene-editor-export.md`

## Fase 3 — Griglia runtime e calibrazione

- `exploration-map-grid.ts` + `useExplorationMapGrid` — overlay griglia da metadati mappa
- Vista dall&apos;alto: griglia attiva quando calibrata; pannello calibrazione per mappe importate (`grid_cells_w/h`, offset)
- GM Screen sheet: griglia attiva per il GM; badge «Importata» / «Generata» nel selettore mappa
- Proiezione 2° schermo: **senza griglia** (`enabled: false` / `showGrid={false}`)
- Scene generate: griglia da Scene Editor (modifica tramite link «Modifica scena»)

## Fase 2 — Scene Editor

- `/campaigns/[id]/gm-only/scene-editor` — lista + nuova scena
- `/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]` — editor completo
- Strumenti: stanza, corridoio, porta, selezione, elimina (muri auto-generati)
- Multi-piano (aggiungi, ordina, elimina, etichetta, dimensioni, griglia)
- Missione collegata in editor
- Salvataggio: documento + raster WebP + sync FoW (`saveSceneDocumentWithRastersAction`)
- Link da Vista dall&apos;alto (badge «generata», modifica scena)

## Fase 1 — Schema dati

- Tabella `campaign_scene_documents` (documento JSON multi-piano)
- Colonne `source_type`, `scene_document_id`, `scene_floor_id` su `campaign_exploration_maps`
- Colonna `source_area_id` su `campaign_exploration_fow_regions`
- `map-core/scene-schema` — `SceneDocumentV1` + validazione
- `map-core/scene-to-fow` — aree pixel → poligoni FoW normalizzati
- `map-core/fow/fow-sync` — piano sync con preserve `is_revealed`
- `map-core-bd/scene-document.ts` — adapter B&D
- `scene-document-actions.ts` — create / get / save / list / verify

Migration: `supabase/migrations/20260628120000_scene_documents_and_map_source.sql`

## Test

```bash
npm run test:map-core
```

## Contesto

Il sistema Esplorazione e FoW (`campaign_exploration_maps`) condivide logica di coordinate, rendering nebbia e griglia con il futuro Scene Editor. Il componente `exploration-map-stage.tsx` (~1780 righe) mescolava runtime portabile e logica B&D (menu radiali, effetti PixiJS).

## Decisione

Introdurre `src/lib/map-core/` come layer **senza dipendenze** da Supabase, Telegram o entità B&D:

| Modulo | Contenuto |
|--------|-----------|
| `coordinates/` | `NormPoint`, object-contain, pointer → norm |
| `fog/` | `drawFogOnCanvas`, costanti nebbia GM/proiezione |
| `viewer/` | `FowRegionViewModel`, griglia, helper SVG |

`ExplorationMapStage` resta il wrapper B&D (editor FoW, effetti, UI). `fow-geometry.ts` re-esporta da map-core per compatibilità.

## Conseguenze

- Fasi 1–4 del Scene Editor costruiscono su map-core senza duplicare coordinate/FoW.
- Package gmflow (Fase 4) esporterà `map-core/**` integralmente.
- Wiki maps (`public.maps`) restano fuori scope.

## File chiave

- `src/lib/map-core/`
- `src/components/exploration/exploration-map-stage.tsx` (wrapper)
- `src/lib/exploration/fow-geometry.ts` (re-export legacy)

## Test

```bash
npm run test:map-core
```
