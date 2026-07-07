# Export Package: Funzionalità e bugfix (luglio 2026)

## Export ID

bnd-features-bugfixes-2026-07-06

## Origine

Barber & Dragons

## Destinazione prevista

gmflow.app

## Scope autorizzato

Export incrementale **post-28 giugno 2026** (escluso Command Center — package separato `bnd-command-center-2026-07-06`). Focus su bugfix, miglioramenti AI, mappe, wiki, personaggi, regia GM.

**Escluso:** RLS/policy SQL, restyling homepage/copy (`240d27c`), shell layout UI Command Center (`508bd44`).

---

### 1. Mappe — Bugfix Scene Editor (delta su package mappe Rev 3)

**Commit:** `3cf1907`, `f9bcd77`

| Fix | Dettaglio |
|-----|-----------|
| Sync FoW on create | Scene document upsert mappe exploration subito alla creazione |
| Heal orphaned scenes | Riparazione scene orfane al load pagina |
| Raster FormData | Upload raster completo via FormData (no `instanceof Blob`) |
| PNG per Telegram | Export PNG per compatibilità storage B&D |
| No placeholder 1×1 | Rifiuta raster mancanti invece di placeholder |

| File | Ruolo |
|------|-------|
| `src/app/campaigns/scene-document-actions.ts` | Sync create, heal, upload FormData |
| `src/lib/map-core-bd/scene-document.ts` | Bridge persist |
| `src/lib/map-core/raster-export/floor-raster.ts` | Export PNG |
| `src/lib/exploration/exploration-map-upload-core.ts` | Upload core |
| `src/components/scene-editor/scene-editor-client.tsx` | FormData save |
| `src/components/scene-editor/scene-editor-list-actions.tsx` | List actions |
| `src/components/exploration/vista-dall-alto-client.tsx` | Vista GM |
| `src/app/campaigns/[id]/gm-only/vista-dall-alto/page.tsx` | Route |

**Nota:** aggiornare anche `2026-05-28-map-scene-editor-export.md` Rev 4.

---

### 2. AI — Hardening OpenRouter e JSON

**Commit:** `cd6c725`, `8133bf5`, `6d1ad30`, `984469b`

| Fix/feat | Dettaglio |
|----------|-----------|
| JSON parsing robusto | `extractBalancedJsonObject` — LLM con markdown/testo extra |
| OpenRouter json mode | `response_format: json_object` per draft campagna |
| Image HTTP 400 | Clamp prompt 8k char, aspect ratio fallback chain |
| Wiki rate limit | Fallback modello + messaggio errore chiaro |
| Unified image extract | `openrouter-image-request.ts` — parsing risposta immagine |

| File | Ruolo |
|------|-------|
| `src/lib/ai/json-extract.ts` | **Nuovo** |
| `src/lib/ai/openrouter-image-request.ts` | **Nuovo** |
| `src/lib/ai/openrouter-client.ts` | json mode, rate limit fallback |
| `src/lib/ai/generator.ts` | Usa json-extract |
| `src/lib/ai/wiki-text-generator.ts` | Integrazione |
| `src/lib/actions/ai-architect.ts` | Draft campagna json mode |
| `src/lib/image-benchmark/providers/openrouter-provider.ts` | Clamp + fallback aspect |
| `src/lib/actions/wiki-image-chat.ts` | Fix save path |
| `src/lib/ai/image-reference-fetch.ts` | Hardening fetch ref |
| `src/lib/ai/__tests__/json-extract.test.ts` | **Nuovo** |
| `src/lib/ai/__tests__/openrouter-image-request.test.ts` | **Nuovo** |

---

### 3. AI — Name generator contestuale

**Commit:** `1a4d59a`

Generatore nomi contestuale (locale + OpenRouter) integrato in dialog creazione e Command Center.

| File | Ruolo |
|------|-------|
| `src/lib/name-generator/local-names.ts` | Pool nomi locali |
| `src/lib/name-generator/types.ts` | Tipi |
| `src/lib/actions/name-generator-actions.ts` | Server action |
| `src/lib/ai/contextual-names.ts` | Prompt contestuale |
| `src/components/name-generator/name-generator-field.tsx` | UI field riusabile |
| `src/lib/name-generator/__tests__/local-names.test.ts` | Test |

**Wire-up:** `create-campaign-dialog.tsx`, `create-character-dialog.tsx`, `create-entity-dialog.tsx` — importare field o solo backend.

---

### 4. Wiki — Board colonne GM + related links

**Commit:** `8af8c46`, `12b3a10` (parte related)

| Feature | Dettaglio |
|---------|-----------|
| Wiki board | Colonne per tipo entità, raggruppate per missione |
| Related entities | Link wiki/mappe correlate su pagina entità |
| Entity graph | `entity-graph-actions.ts` — grafo relazioni |

| File | Ruolo |
|------|-------|
| `src/components/wiki/wiki-list-client.tsx` | Board colonne |
| `src/components/wiki/related-entities-section.tsx` | **Nuovo** |
| `src/app/campaigns/entity-graph-actions.ts` | **Nuovo** |
| `src/app/campaigns/[id]/wiki/[entityId]/page.tsx` | Related section |
| `src/lib/wiki/entity-reference-parser.ts` | Parser ref |

---

### 5. Bestiary — Fix mapping chunk/statblock

**Commit:** `874262e`

Ogni mostro mappato al chunk che **possiede** il suo statblock (non al chunk contenitore generico).

| File | Ruolo |
|------|-------|
| `src/lib/manuals/bestiary-statblock-parser.ts` | Fix mapping |
| `src/lib/actions/wiki-bestiary-search-actions.ts` | Search corretta |
| `src/lib/manuals/__tests__/bestiary-statblock-parser.test.ts` | Test aggiornati |

---

### 6. Personaggi — Export PDF ZIP campagna

**Commit:** `e2bcbd3`

Export tutte le schede PDF campagna in un unico ZIP.

| File | Ruolo |
|------|-------|
| `src/lib/character-sheets/build-sheets-zip.ts` | Build ZIP |
| `src/lib/character-sheets/campaign-sheet-export-auth.ts` | **Nuovo** — auth export |
| `src/app/api/campaigns/[campaignId]/character-sheets-zip/route.ts` | API route |
| `src/components/characters/download-campaign-sheets-button.tsx` | UI (rinominato da torneo) |
| `src/components/characters/characters-section.tsx` | Integrazione |

---

### 7. GM — Regia immagini + galleria multi-immagine

**Commit:** `12b3a10`

| Feature | Dettaglio |
|---------|-----------|
| Regia immagini | Proiezione multi-immagine secondo schermo |
| GM gallery | Selezione multipla immagini per proiezione |

| File | Ruolo |
|------|-------|
| `src/app/campaigns/[id]/gm-only/regia-immagini/proiezione/page.tsx` | **Nuovo** |
| `src/components/gm/gm-gallery-sheet.tsx` | Multi-select + proiezione |

---

## Scope escluso

| Elemento | Motivo |
|----------|--------|
| Command Center completo | Package `bnd-command-center-2026-07-06` |
| `feat(home): refresh live-play copy` | Marketing/copy homepage |
| `feat(command-center): align workspace UI` | Shell UI CC — nel package CC |
| RLS/policy migration | gmflow-native |
| Session history collapse panels (`312a24d`) | UI grafica (già esclusa) |

## Sintesi

Bugfix critici mappe (FoW sync, raster upload), hardening AI OpenRouter, name generator, wiki board + related links, bestiary fix, export PDF ZIP, regia immagini multi-proiezione.

## Variabili ambiente

```env
OPENROUTER_API_KEY=
WIKI_TEXT_MODEL=
WIKI_TEXT_FALLBACK_MODEL=    # Opzionale, rate limit
AI_IMAGE_MODEL=
```

## Adattamento gmflow

1. Storage raster mappe → R2 (non Telegram FormData path)
2. PDF ZIP → stesso pattern auth multi-tenant
3. Regia immagini → route gmflow equivalente
4. Name generator → i18n nomi locali se multi-lingua

## Test minimi

```bash
npm run test:map-core
npx tsx --test src/lib/ai/__tests__/json-extract.test.ts
npx tsx --test src/lib/ai/__tests__/openrouter-image-request.test.ts
npx tsx --test src/lib/name-generator/__tests__/local-names.test.ts
npx tsx --test src/lib/manuals/__tests__/bestiary-statblock-parser.test.ts
```

- [ ] Crea scena → appare in Vista dall'alto senza publish manuale
- [ ] Salva scena → raster reale (non 1×1)
- [ ] Generazione immagine con prompt lungo → no HTTP 400
- [ ] Wiki rate limit → fallback o messaggio chiaro
- [ ] Export ZIP schede campagna
- [ ] Regia immagini proiezione multi-immagine
- [ ] Related links su pagina wiki entità

## Import Contract

### Ordine consigliato

1. AI hardening (json-extract, openrouter fixes) — prerequisito CC
2. Bestiary fix + name generator
3. Map scene editor delta (scene-document-actions, raster)
4. Wiki board + related entities
5. PDF ZIP export
6. Regia immagini

### Package correlati

- `bnd-map-scene-editor-2026-05-28` Rev 4 (map fixes)
- `bnd-command-center-2026-07-06` (modulo separato)
- `bnd-features-bugfixes-2026-06-28` (batch precedente)
- `bnd-ai-generation-systems-2026-06-20` (base AI)

## Prompt per gmflow Import Agent

```
Import Agent gmflow — Export ID: bnd-features-bugfixes-2026-07-06

Package: docs/gmflow-export-packages/2026-07-06-features-bugfixes-export.md

IMPORTARE (priorità Alta)
- AI: json-extract.ts, openrouter-image-request.ts, openrouter-client fixes
- Maps: scene-document-actions delta, floor-raster, exploration-map-upload-core
- Bestiary: bestiary-statblock-parser fix

IMPORTARE (priorità Media)
- Name generator (lib + actions + field component)
- Wiki board + related-entities-section + entity-graph-actions
- PDF ZIP export (build-sheets-zip, campaign-sheet-export-auth, API route)
- Regia immagini (proiezione page + gm-gallery-sheet)

NON IMPORTARE
- Command Center (package separato)
- Homepage copy refresh
- RLS B&D

ADATTAMENTI: storage R2, RBAC tenant, i18n name pools

TEST: checklist nel package + test:map-core
```

## Vincoli

- Non modificare gmflow
- Non includere segreti
- Non importare RLS B&D

---

**Generato:** 2026-07-06 — Export Agent Barber & Dragons
