# Export Package: Nuove funzioni e bugfix (no RLS, no grafica)

## Export ID

bnd-features-bugfixes-2026-06-28

## Origine

Barber & Dragons

## Destinazione prevista

gmflow.app

## Scope autorizzato

Export selettivo di **funzionalità logiche e bugfix** sviluppati dopo il package AI (`bnd-ai-generation-systems-2026-06-20`) e in parallelo al package mappe (`bnd-map-scene-editor-2026-05-28`).

**Esplicitamente escluso da questo package:** regole RLS/policy SQL, restyling grafico, shell layout, rendering DS, preset visivi layer, pannelli UI session history.

---

### 1. AI — Refinement immagine wiki iterativo

**Commit:** `041d96c`

Generazione immagine **multi-turno con immagine di riferimento**: il GM chatta per modificare un ritratto già generato (es. «aggiungi cicatrice», «cambia armatura»).

| File | Ruolo |
|------|-------|
| `src/lib/actions/wiki-image-chat.ts` | Server action `refineWikiImageAction` |
| `src/lib/ai/image-refine-prompt.ts` | Costruzione istruzioni da cronologia chat |
| `src/lib/ai/image-reference-fetch.ts` | Fetch immagine ref → data URL (Telegram o HTTP) |
| `src/lib/ai/image-provider.ts` | `generateSiteImageRefinement` (multimodal OpenRouter) |
| `src/lib/image-benchmark/providers/openrouter-provider.ts` | Supporto `multimodalContent` |
| `src/lib/image-benchmark/types.ts` | Tipi payload multimodal |
| `src/lib/ai/__tests__/image-refine-prompt.test.ts` | Test prompt refinement |

**Wire-up UI minimo (opzionale, fuori scope grafico):** `wiki-image-refine-chat.tsx` + hook in `create/edit-entity-dialog.tsx` — importare solo se gmflow vuole la stessa UX chat; la logica server è autosufficiente.

---

### 2. AI — Full-body framing NPC/mostri

**Commit:** `ed4ecc0`

Default **figura intera in piedi** per immagini creature; pose sedute solo se esplicitamente richieste nel prompt.

| File | Ruolo |
|------|-------|
| `src/lib/ai/image-prompt-character-framing.ts` | Detection pose, technical line, negative hints |
| `src/lib/ai/image-prompt-builder.ts` | Integrazione framing in prompt build |
| `src/lib/ai/__tests__/image-prompt-character-framing.test.ts` | Test |

---

### 3. Wiki — Bugfix persistenza preset ritratto AI

**Commit:** `82f09ac`

Corregge la perdita dell'URL immagine AI preset alla creazione entità wiki.

| File | Ruolo |
|------|-------|
| `src/lib/image-url.ts` | `isInternalTelegramImagePath`, normalizzazione path interni |
| `src/components/wiki/create-entity-dialog.tsx` | Solo la logica apply preset (non restyling) |

---

### 4. Sheet Generator — Expertise, bardo, CA realistica

**Commit:** `688720b`

Regole D&D 5e per competenze classe/background, expertise automatica (Ladro/Bardo), calcolo CA con armatura/scudo.

| File | Ruolo |
|------|-------|
| `src/lib/sheet-generator/skill-rules.ts` | **Nuovo** — regole skill/expertise |
| `src/lib/sheet-generator/armor-class.ts` | **Nuovo** — calcolo CA |
| `src/lib/sheet-generator/build-engine.ts` | Integrazione skill + AC |
| `src/lib/sheet-generator/build-choices.ts` | Scelte competenze |
| `src/lib/sheet-generator/build-choices-client.ts` | Client mirror |
| `src/lib/sheet-generator/build-choices-types.ts` | Tipi |
| `src/lib/sheet-generator/types.ts` | Estensioni tipi |
| `src/lib/sheet-generator/__tests__/skill-expertise-ac.test.ts` | Test |

---

### 5. Wiki — Statblock multiplo da chunk bestiario

**Commit:** `fef9b75`

Quando un chunk manual contiene **più creature** (es. «Bandito, Bandito Capo, Guardia»), elenca ogni statblock singolarmente nella ricerca bestiario.

| File | Ruolo |
|------|-------|
| `src/lib/manuals/bestiary-statblock-parser.ts` | **Nuovo** — parse regioni per heading + CR |
| `src/lib/actions/wiki-bestiary-search-actions.ts` | Espone statblock individuali con ID composito |
| `src/lib/manuals/__tests__/bestiary-statblock-parser.test.ts` | Test |

---

### 6. Mappe — Union auto-walls (delta logico)

**Commit:** `e9c93e5` (solo parte algoritmica)

Muri auto-generati dal **perimetro esterno dell'unione** delle aree (sovrapposizioni incluse), non più solo bordi per-area.

| File | Ruolo |
|------|-------|
| `src/lib/map-core/scene-editor/union-boundary-edges.ts` | **Nuovo** — `unionBoundarySegments` via `polygon-clipping` |
| `src/lib/map-core/scene-editor/auto-walls.ts` | Aggiornato per usare union boundary |
| `src/lib/map-core/__tests__/union-boundary-edges.test.ts` | **Nuovo** |
| `package.json` | Dipendenza `polygon-clipping` |

**Nota:** il package mappe completo resta `bnd-map-scene-editor-2026-05-28`. Importare questo delta **dopo** map-core base se già presente in gmflow.

---

### 7. Auth — Bugfix accesso GM guild (solo app layer)

**Commit:** `088a4ed`, `c75aa38` (parte TypeScript)

Rimuove check applicativi «solo GM titolare campagna» che bloccavano GM guild su sessioni e personaggi.

| File | Ruolo |
|------|-------|
| `src/app/campaigns/actions.ts` | Sessioni: `canManageSessionByCampaign` → guild GM/admin |
| `src/app/campaigns/gm-actions.ts` | Allineamento permessi sessioni |
| `src/app/campaigns/character-actions.ts` | Rimozione check `gm_id` su sync calendario/XP personaggi |

**Escluso:** migration SQL `20260626140000_guild_gm_full_campaign_access.sql` — gmflow deve implementare autorizzazione con il proprio modello multi-tenant (RLS/policy separata).

---

### 8. Mappe — Schema DB scene documents (solo DDL, no RLS)

**Commit:** `94b0f4e` (schema)

DDL tabelle/colonne per Scene Editor — **senza** policy RLS B&D.

| File | Ruolo |
|------|-------|
| `supabase/migrations/20260628120000_scene_documents_and_map_source.sql` | Solo righe 1–55 (DDL). **Escludere righe 56–80** (ENABLE RLS + CREATE POLICY) |

Per il resto del Scene Editor (map-core, actions, FoW) vedere `bnd-map-scene-editor-2026-05-28`.

---

## Scope escluso

| Elemento | Motivo |
|----------|--------|
| `supabase/migrations/20260626140000_guild_gm_full_campaign_access.sql` | RLS/policy — escluso per richiesta |
| Policy RLS in `20260628120000_*.sql` (righe 56–80) | RLS — gmflow scrive le proprie |
| `feat(sessions): collapse session history…` (`312a24d`) | Modifica grafica/UI pannelli |
| `shell-classes.ts`, padding admin pages, full-width layout (`e9c93e5`) | Modifica grafica/layout |
| `ds-renderer.ts`, `layer-presets.ts`, `draw-props-svg.ts` (`be804da`) | Rendering grafico DS |
| `scene-editor-client.tsx` refactor UX layer/preset | UI grafica editor |
| Commit `chore(gmflow):*` | Automazione export B&D only |
| Branding `barber-*`, copy UI italiano | Adattare in gmflow |
| `uploadToTelegram` / `TELEGRAM_BOT_TOKEN` | Storage B&D — adapter R2 in gmflow |

## Sintesi della modifica

Set di miglioramenti **funzionali** post-giugno 2026:

1. Refinement immagini wiki conversazionale (multimodal OpenRouter).
2. Framing full-body intelligente per creature.
3. Fix persistenza URL ritratto AI in creazione wiki.
4. Sheet generator più fedele a D&D 5e (skill, expertise, CA).
5. Bestiario: statblock individuali da chunk multi-creatura.
6. Auto-walls basati su unione geometrica aree.
7. GM guild: permessi sessioni/personaggi a livello app (senza portare RLS B&D).

## Comportamento prima

- Immagini wiki: solo generazione one-shot, niente iterazione con ref visivo.
- NPC/mostri: spesso ritratto busto/crop.
- Preset ritratto AI perso al submit form creazione.
- Sheet generator: skill/expertise/CA semplificati o incompleti.
- Bestiario: un chunk = un risultato anche con più creature.
- Auto-walls: bordi per singola area (muri interni duplicati su overlap).
- GM non titolare: bloccato su sessioni/personaggi al di fuori delle proprie campagne (app layer).

## Comportamento dopo

- Chat refinement immagine con immagine corrente come input visivo OpenRouter.
- Default full-body standing; seated solo se nel prompt.
- URL `/api/tg-image/…` preservato in creazione wiki.
- Competenze PHB IT, expertise Ladro/Bardo, CA da armatura+DEX+scudo.
- Ricerca bestiario elenca «Bandito», «Bandito Capo» separatamente.
- Muri solo sul perimetro esterno dell'unione delle stanze.
- Qualsiasi GM/admin guild gestisce sessioni e sync personaggi cross-campagna (app).

## File B&D coinvolti

### Indispensabili (backend/logica)

```
src/lib/actions/wiki-image-chat.ts
src/lib/ai/image-refine-prompt.ts
src/lib/ai/image-reference-fetch.ts
src/lib/ai/image-provider.ts
src/lib/ai/image-prompt-character-framing.ts
src/lib/ai/image-prompt-builder.ts
src/lib/image-benchmark/providers/openrouter-provider.ts
src/lib/image-benchmark/types.ts
src/lib/image-url.ts
src/lib/sheet-generator/skill-rules.ts
src/lib/sheet-generator/armor-class.ts
src/lib/sheet-generator/build-engine.ts
src/lib/sheet-generator/build-choices.ts
src/lib/sheet-generator/build-choices-client.ts
src/lib/sheet-generator/build-choices-types.ts
src/lib/sheet-generator/types.ts
src/lib/manuals/bestiary-statblock-parser.ts
src/lib/actions/wiki-bestiary-search-actions.ts
src/lib/map-core/scene-editor/union-boundary-edges.ts
src/lib/map-core/scene-editor/auto-walls.ts
src/app/campaigns/actions.ts
src/app/campaigns/gm-actions.ts
src/app/campaigns/character-actions.ts
```

### Test

```
src/lib/ai/__tests__/image-refine-prompt.test.ts
src/lib/ai/__tests__/image-prompt-character-framing.test.ts
src/lib/sheet-generator/__tests__/skill-expertise-ac.test.ts
src/lib/manuals/__tests__/bestiary-statblock-parser.test.ts
src/lib/map-core/__tests__/union-boundary-edges.test.ts
```

### Opzionali (wire-up UI)

```
src/components/wiki/wiki-image-refine-chat.tsx
src/components/wiki/create-entity-dialog.tsx  (solo parti refine + preset)
src/components/wiki/edit-entity-dialog.tsx      (solo parti refine)
```

### Schema DB (parziale)

```
supabase/migrations/20260628120000_scene_documents_and_map_source.sql  (righe 1–55 only)
```

## Backend coinvolto

- Server Actions: `refineWikiImageAction`, wiki bestiary search, character/session actions
- OpenRouter multimodal: immagine ref + testo istruzioni
- Parser bestiario server-side (no nuove API route)
- Map-core pure functions (union geometry)

## Database coinvolto

- **DDL scene documents** (tabelle/colonne/index) — importare senza policy RLS
- **Nessuna** migration guild GM (RLS esclusa)
- Nessun'altra migrazione in scope

## Storage coinvolto

- Refinement: read immagine ref (Telegram/HTTP) → write nuova immagine
- gmflow: adapter fetch/upload (R2/Blob) al posto di Telegram

## Provider o servizi esterni coinvolti

| Provider | Uso |
|----------|-----|
| OpenRouter | Generazione + refinement multimodal (`AI_IMAGE_MODEL`) |
| Telegram (B&D only) | Fetch ref image — sostituire in gmflow |

## Variabili ambiente richieste

```env
OPENROUTER_API_KEY=          # Obbligatoria (refinement + generazione)
AI_IMAGE_MODEL=              # Default openai/gpt-5-image-mini
# gmflow: storage credentials (R2), NON TELEGRAM_BOT_TOKEN
```

## Parti specifiche B&D da rimuovere

- Path `/api/tg-image/` in `image-reference-fetch.ts` → generalizzare per storage gmflow
- `uploadToTelegram` in `wiki-image-chat.ts`
- Label classi PHB in italiano in `skill-rules.ts` — mappare a i18n gmflow se necessario
- Check `profiles.role IN ('gm','admin')` — allineare RBAC tenant gmflow

## Adattamento richiesto per gmflow

1. **Storage adapter** per fetch ref image e upload risultato refinement.
2. **RLS/policy proprie** per guild GM cross-campagna — non copiare migration B&D.
3. **Multi-tenant:** verificare che session/character actions rispettino org/tenant scope gmflow (B&D è guild-wide).
4. **polygon-clipping:** aggiungere dipendenza npm se import map delta.
5. **UI refinement:** opzionale; minimo viable = chiamata diretta a `refineWikiImageAction`.
6. **Scene Editor:** importare schema DDL + map package separatamente; RLS gmflow-specifica.

## Ambiguità rilevate

| # | Ambiguità | Decisione |
|---|-----------|-----------|
| A1 | Modello guild GM in gmflow potrebbe essere org-scoped, non global | `NEEDS_DECISION` — replicare semantica o limitare per org? |
| A2 | Wire-up UI refinement vs solo API | Opzionale — backend sufficiente per MVP |
| A3 | Package mappe `2026-05-28` già esiste — overlap union-walls | Import delta dopo map-core base |
| A4 | `create-entity-dialog.tsx` mix logica + UI | Import selettivo diff, non file intero |

## Rischi

| Rischio | Mitigazione |
|---------|-------------|
| Refinement multimodal costoso | Rate limit / quota tenant |
| Guild GM troppo permissivo in SaaS | Policy gmflow più granulare |
| polygon-clipping edge cases | Test union-boundary-edges |
| Parser bestiario falsi positivi heading | Test + filtri EXCLUDED_STATBLOCK_HEADINGS |
| Import RLS per errore | Checklist: zero CREATE POLICY da B&D |

## Test minimi richiesti

```bash
npm run test:sheet-generator   # skill-expertise-ac
# Aggiungere se non presente:
npx tsx --test src/lib/ai/__tests__/image-refine-prompt.test.ts
npx tsx --test src/lib/ai/__tests__/image-prompt-character-framing.test.ts
npx tsx --test src/lib/manuals/__tests__/bestiary-statblock-parser.test.ts
npx tsx --test src/lib/map-core/__tests__/union-boundary-edges.test.ts
```

E2E:
- [ ] Refinement immagine wiki: ref URL → chat → nuova URL
- [ ] Creazione wiki con preset AI portrait → URL persistito
- [ ] Sheet 1° liv Ladro: 4 skill + expertise
- [ ] Ricerca bestiario chunk multi-creatura → N risultati
- [ ] Scene editor: stanze sovrapposte → muri solo perimetro esterno
- [ ] GM non titolare: gestione sessione altrui campagna

## Import Contract per gmflow

### Ordine import consigliato

1. Sheet generator + bestiary parser (indipendenti)
2. AI framing + image-url fix
3. AI refinement backend + openrouter multimodal
4. Auth app-layer (actions.ts, gm-actions, character-actions) — **con review RBAC gmflow**
5. Map union-walls delta (se map-core già presente)
6. Schema DDL scene documents (senza RLS)
7. UI wire-up opzionale

### Commit di riferimento B&D

```
688720b feat(sheet-generator): add expertise, bard skills, and realistic AC rules
fef9b75 feat(wiki): list individual statblocks from multi-creature bestiary chunks
82f09ac fix(wiki): persist AI portrait preset when creating wiki entities
ed4ecc0 feat(ai): default NPC and monster images to standing full-body framing
041d96c feat(wiki): add prompt-based iterative image refinement
088a4ed fix(sessions): allow all GMs and admins to manage any campaign session
c75aa38 fix(authz): restore guild-wide GM access (solo .ts, NO .sql)
e9c93e5 feat(maps): union-based auto-walls (solo union-boundary-edges + auto-walls)
```

### Verifica post-import

```bash
rg "CREATE POLICY|ENABLE ROW LEVEL SECURITY" supabase/migrations/  # zero da B&D guild migration
rg "uploadToTelegram" src/lib/actions/wiki-image-chat.ts             # sostituito adapter gmflow
rg "polygon-clipping" package.json                                    # presente se map delta
```

## Prompt per gmflow Import Agent

```
Import Agent gmflow — Export ID: bnd-features-bugfixes-2026-06-28

Package: docs/gmflow-export-packages/2026-06-28-features-bugfixes-export.md
(copia in B&D; in gmflow cercare docs/imports/ se sincronizzato)

OBIETTIVO
Importare funzioni logiche e bugfix da Barber & Dragons SENZA:
- regole RLS / CREATE POLICY da B&D
- modifiche grafiche (shell layout, DS renderer, layer presets, session history UI)

IMPORTARE (priorità Alta)
1. Sheet generator: skill-rules.ts, armor-class.ts, build-engine changes + test
2. Bestiary: bestiary-statblock-parser.ts + wiki-bestiary-search-actions.ts + test
3. AI refinement: wiki-image-chat.ts, image-refine-prompt.ts, image-reference-fetch.ts,
   generateSiteImageRefinement in image-provider.ts, openrouter multimodal support
4. AI framing: image-prompt-character-framing.ts + image-prompt-builder.ts integration
5. Wiki fix: image-url.ts isInternalTelegramImagePath + preset logic in create-entity-dialog

IMPORTARE (priorità Media)
6. Auth app-layer: campaigns/actions.ts, gm-actions.ts, character-actions.ts
   (guild GM cross-campaign) — ADATTARE a RBAC multi-tenant gmflow, NON copiare SQL RLS
7. Map delta: union-boundary-edges.ts, auto-walls.ts update, polygon-clipping dep + test

IMPORTARE (priorità Bassa / opzionale)
8. Schema DDL scene documents (migration righe 1-55 ONLY, no RLS)
9. UI wiki-image-refine-chat.tsx se UX parity desiderata

NON IMPORTARE
- supabase/migrations/20260626140000_guild_gm_full_campaign_access.sql
- RLS policies scene_documents (righe 56-80 migration 20260628120000)
- ds-renderer.ts, layer-presets.ts, draw-props-svg.ts, shell-classes.ts
- Session history collapse panels (312a24d)
- Admin page layout padding changes

ADATTAMENTI OBBLIGATORI
- Sostituire Telegram storage con R2/Blob gmflow in wiki-image-chat + image-reference-fetch
- Scrivere policy RLS gmflow-native per scene_documents e guild GM
- Validare se GM cross-campaign è globale o per-organization in gmflow

PACKAGE CORRELATI
- bnd-ai-generation-systems-2026-06-20 (prerequisito AI base)
- bnd-map-scene-editor-2026-05-28 (prerequisito map-core prima del delta union-walls)

TEST
Eseguire checklist nel package. grep zero CREATE POLICY importate da B&D.
```

## Vincoli

- Non modificare gmflow da B&D
- Non includere segreti
- Non includere RLS B&D
- Non includere restyling grafico
- Non import automatico — solo package + ledger

---

**Generato:** 2026-06-28 — Export Agent Barber & Dragons
