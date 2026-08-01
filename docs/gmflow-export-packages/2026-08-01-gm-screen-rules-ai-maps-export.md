# Export Package: GM Screen 2.0, Rules Catalog, AI framing, FoW coords

## Export ID

bnd-gm-screen-rules-ai-maps-2026-08-01

## Origine

Barber & Dragons

## Destinazione prevista

gmflow.app

## Scope autorizzato

Export delle **modifiche e fix del 1 agosto 2026** (5 commit applicativi; esclusi sync ledger `chore(gmflow)`).

| Commit | Contenuto |
|--------|-----------|
| `9bc3a5f` | GM Screen 2.0 modulare (`react-grid-layout`) accanto allo screen classico |
| `d9bd4d9` | Densificazione board + render 5e rules/statblock + condizioni PHB |
| `b14782e` | Rules catalog tipizzato, framing immagini item/lore, fix FoW object-contain |
| `9ebb1ec` | Fix build: `image-prompt-builder` non importa più `generator` server-only |
| `9679ca1` | Fix resize pannelli GM Screen: solo bordi, no maniglie angolari |

---

### 1. GM Screen 2.0 (modulare)

- Route nuova: `/campaigns/[id]/gm-screen-v2` — board a griglia
- Screen classico resta su `/gm-screen`
- Launcher Solo GM: pulsante verso v2
- Dipendenza: `react-grid-layout` ^2.2.4
- Layout persistito in `localStorage` per campagna/modo
- Pannelli: iniziativa, note, missioni, wiki entity, mostri, rules lookup, mappe/FoW, calendar/economy/time (long), players/XP, tool sheets
- Chrome pannello (titolo, chiudi, drag)
- Menu aggiungi pannello + preset (session / closure / legacy)
- Fix resize: handle solo su bordi (no diagonale amber)

### 2. Dense parsers + render 5e

| File | Ruolo |
|------|-------|
| `src/lib/manuals/dense-statblock-parser.ts` | Parse chunk bestiario → campi densificati |
| `src/lib/manuals/dense-rules-parser.ts` | Parse regole dense da manuali |
| `src/lib/manuals/phb-conditions.ts` | Lista condizioni PHB (fallback client) |
| `src/components/gm/screen-grid/renderers/fivee-statblock-view.tsx` | Vista statblock compatta |
| `src/components/gm/screen-grid/renderers/fivee-rules-view.tsx` | Vista regole compatta |
| `src/lib/manuals/__tests__/dense-parsers.test.ts` | Test |

### 3. Rules Catalog (DB + ingest/lookup)

Tabella `rules_catalog` parallela a `manuals_knowledge` (RAG): lookup tipizzata condizioni PHB v1.

| File | Ruolo |
|------|-------|
| `supabase/migrations/20260801140000_rules_catalog.sql` | **Solo DDL** (righe 1–46) |
| `src/lib/manuals/rules-catalog/types.ts` | Tipi + slugify |
| `src/lib/manuals/rules-catalog/extract-phb-conditions.ts` | Estrattore da markdown PHB |
| `src/lib/actions/rules-catalog-ingest-actions.ts` | Ingest admin |
| `src/lib/actions/rules-catalog-lookup-actions.ts` | Lookup GM (catalog → fallback PHB statico) |
| `src/components/admin/rules-catalog-ingest-controls.tsx` | UI admin knowledge |
| `src/components/gm/screen-grid/panels/rules-lookup-panel.tsx` | Panel GM |

**Non importare** RLS (righe 48–68 migration).

### 4. AI — framing item/lore + fix client import

| File | Ruolo |
|------|-------|
| `src/lib/ai/image-prompt-item-lore.ts` | Technical/negative per oggetti wiki; lore senza framing forzato |
| `src/lib/ai/image-prompt-builder.ts` | Integrazione item/lore + import da `campaign-context-prompt` |
| `src/lib/ai/image-refine-prompt.ts` | Framing refinement coerente |
| `src/lib/ai/__tests__/image-prompt-item-lore.test.ts` | Test |
| Dialog create/edit wiki, `ai-wiki-chain`, wiki-npc-params, command-center wiki builder | Wire-up |

**Fix critico `9ebb1ec`:** evitare catena `image-prompt-builder` → `generator` → supabase server/`next/headers` nei client wiki (rompe build Vercel).

### 5. Mappe — FoW object-contain coords

| File | Ruolo |
|------|-------|
| `src/lib/map-core/coordinates/object-contain.ts` | `getContainedElementSize`, `clientPointToRectNorm` |
| `src/lib/map-core/coordinates/index.ts` | Re-export |
| `src/lib/map-core/__tests__/coordinates.test.ts` | Test |
| `exploration-map-stage.tsx`, `vista-dall-alto-client.tsx` | Uso box bitmap condiviso per overlay FoW |

Delta anche documentato in package mappe Rev 5.

## Scope escluso

| Elemento | Motivo |
|----------|--------|
| Policy RLS `rules_catalog` (migration righe 48–68) | gmflow-native multi-tenant |
| Commit `chore(gmflow):*` | Solo sync ledger B&D |
| Branding `barber-*` / CSS tema B&D | Adattare design system gmflow |
| Contenuti PHB markdown grezzi (se non già in gmflow) | Solo codice extractor + schema |
| Admin image-prompt-debug tweak minore | Opzionale |

## Sintesi della modifica

1. **GM Screen 2.0**: board modulare drag/resize accanto allo screen classico.
2. **Rules UX**: parser densificati + catalogo DB condizioni + lookup panel.
3. **AI immagini**: item = product shot; lore = libero; fix import client.
4. **FoW**: coordinate pointer allineate al bitmap `object-fit: contain`.

## Comportamento prima

- Solo GM Screen classico (layout fisso).
- Lookup regole/mostri grezzi o via RAG senza catalog tipizzato.
- Immagini item spesso con personaggi nel frame.
- Click FoW su mappe letterboxate potevano essere offset rispetto al bitmap.
- Build client wiki poteva fallire per import server-only via image-prompt-builder.

## Comportamento dopo

- `/gm-screen-v2` con pannelli aggiungibili, preset, layout salvato.
- Statblock/regole in stile 5e compatto; condizioni da catalog o fallback statico.
- Item AI: soggetto = oggetto isolato; lore senza framing obbligatorio.
- FoW: hit-test sul rettangolo effettivo dell’immagine.
- Client wiki non tira più `next/headers` tramite image-prompt-builder.

## File B&D coinvolti

### GM Screen 2.0 (indispensabili)

```
src/app/campaigns/[id]/gm-screen-v2/page.tsx
src/components/gm/gm-screen-layout-v2.tsx
src/components/gm/gm-screen-legacy-layout-v2.tsx
src/components/gm/gm-screen-long-layout-v2.tsx
src/components/gm/screen-grid/**          (intero albero)
src/components/gm/gm-screen-launcher.tsx
src/components/gm/gm-homepage.tsx
src/components/gm/gm-quick-actions.tsx
src/components/gm/gm-screen-long-state.tsx
src/components/gm/gm-screen-map-regia.tsx
src/components/gm/initiative-tracker.tsx
src/app/globals.css                      (regole resize/grid — adattare tema)
package.json                             (+ react-grid-layout)
```

### Rules / manuals

```
src/lib/manuals/dense-statblock-parser.ts
src/lib/manuals/dense-rules-parser.ts
src/lib/manuals/phb-conditions.ts
src/lib/manuals/bestiary-statblock-parser.ts
src/lib/manuals/rules-catalog/**
src/lib/actions/rules-catalog-ingest-actions.ts
src/lib/actions/rules-catalog-lookup-actions.ts
src/lib/actions/wiki-bestiary-search-actions.ts
src/components/admin/rules-catalog-ingest-controls.tsx
src/app/admin/knowledge/page.tsx
supabase/migrations/20260801140000_rules_catalog.sql  (DDL only)
src/types/database.types.ts
```

### AI

```
src/lib/ai/image-prompt-item-lore.ts
src/lib/ai/image-prompt-builder.ts
src/lib/ai/image-refine-prompt.ts
src/lib/ai/wiki-npc-params.ts
src/lib/ai/__tests__/image-prompt-item-lore.test.ts
src/lib/actions/ai-wiki-chain.ts
src/components/wiki/create-entity-dialog.tsx
src/components/wiki/edit-entity-dialog.tsx
src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts
src/modules/command-center/ai-control-plane/chat-assistant.ts
```

### Maps / FoW

```
src/lib/map-core/coordinates/object-contain.ts
src/lib/map-core/coordinates/index.ts
src/lib/map-core/__tests__/coordinates.test.ts
src/components/exploration/exploration-map-stage.tsx
src/components/exploration/vista-dall-alto-client.tsx
```

## Backend coinvolto

- Server Actions: rules catalog ingest/lookup; bestiary search (dense content)
- Nessuna nuova API REST dedicata
- OpenRouter invariato (solo prompt framing)

## Database coinvolto

**Nuova tabella** `public.rules_catalog` (kind, slug, name, aliases, source_*, body_md, body_hash, facets jsonb).

Importare **DDL + indici + trigger updated_at**. **Escludere** ENABLE RLS + CREATE POLICY.

## Storage coinvolto

Nessuno nuovo (layout GM Screen in localStorage browser).

## Provider o servizi esterni coinvolti

Nessuno nuovo. OpenRouter già richiesto per AI immagini.

## Variabili ambiente richieste

Nessuna nuova. Stesso stack OpenRouter/Supabase già documentato nei package AI.

## Parti specifiche B&D da rimuovere

| Elemento | Azione gmflow |
|----------|---------------|
| Classi `barber-*` / CSS amber resize | Design system gmflow |
| Policy RLS GM/admin globali | Policy workspace/tenant |
| Copy italiano hardcoded nei panel | i18n |
| Link `/gm-screen-v2` | Route gmflow equivalente |
| Admin ingest su `/admin/knowledge` | Pannello admin gmflow |

## Adattamento richiesto per gmflow

1. Installare `react-grid-layout` (+ tipi se necessari).
2. Portare `screen-grid/**` come modulo riusabile; adattare CSS.
3. DDL `rules_catalog` + policy multi-tenant + job ingest admin.
4. Wiring FoW: usare `clientPointToRectNorm` / contained size su overlay mappe.
5. AI: importare `image-prompt-item-lore` e fix import `campaign-context-prompt` (non `generator`).
6. RBAC: lookup condizioni = GM della campagna/org, non profilo globale B&D.
7. **NEEDS_DECISION**: GM Screen 2.0 sostituisce o convive con screen classico in gmflow?

## Ambiguità rilevate

| # | Ambiguità | Cosa NON è nello scope obbligatorio finché non chiarito |
|---|-----------|--------------------------------------------------------|
| A1 | Screen v2 vs classico in prodotto SaaS | Strategia UX gmflow |
| A2 | Catalog estendibile a spell/feature subito | v1 = condizioni; altri kind sono schema-ready |
| A3 | Densify CSS (globals) vs design system | Portare logica resize; restyling grafico adattato |
| A4 | Contenuto PHB per ingest | Solo codice; i file manuale restano responsabilità gmflow |

## Rischi

| Rischio | Mitigazione |
|---------|-------------|
| `react-grid-layout` bundle size / mobile | Smoke test desktop GM; mobile out of scope |
| Parser dense falsi positivi | Test `dense-parsers.test.ts` |
| FoW regressione coordinate | Test coordinates + QA letterbox |
| Import RLS B&D per errore | Checklist zero CREATE POLICY |
| Client bundle server-only ripristinato | Non reintrodurre import da `generator` in image-prompt-builder |

## Test minimi richiesti

```bash
npm run test:map-core
npx tsx --test src/lib/manuals/__tests__/dense-parsers.test.ts
npx tsx --test src/lib/manuals/rules-catalog/__tests__/extract-phb-conditions.test.ts
npx tsx --test src/lib/ai/__tests__/image-prompt-item-lore.test.ts
```

- [ ] Aprire `/gm-screen-v2`, aggiungere pannelli, resize da bordo, reload → layout persistito
- [ ] Rules lookup: condizione da catalog (post-ingest) e fallback statico
- [ ] Monster panel: statblock densificato leggibile
- [ ] Genera immagine item → product shot senza personaggio
- [ ] FoW reveal su mappa letterboxata allineato al bitmap
- [ ] Build client: create/edit entity dialog senza errore next/headers

## Import Contract per gmflow

### Ordine consigliato

1. **map-core FoW coords** (`object-contain` + exploration wiring)
2. **AI item/lore framing** + fix import `campaign-context-prompt`
3. **Dense parsers** + fivee renderers
4. **Rules catalog** DDL (no RLS) + extract/ingest/lookup
5. **GM Screen 2.0** board + route + launcher
6. Policy RLS gmflow + theming

### Commit di riferimento

```
9bc3a5f feat(gm): modular GM Screen 2.0
d9bd4d9 feat(gm): densify GM Screen + 5e rules/monsters
b14782e feat(rules,ai,maps): catalog, item/lore framing, FoW coords
9ebb1ec fix(ai): image-prompt-builder client import
9679ca1 fix(gm): resize panels by edges only
```

### Verifica post-import

```bash
rg "CREATE POLICY" supabase/migrations/*rules_catalog*   # zero policy B&D
rg "from \"@/lib/ai/generator\"" src/lib/ai/image-prompt-builder.ts  # zero
rg "react-grid-layout" package.json
rg "clientPointToRectNorm|getContainedElementSize" src/lib/map-core
```

## Prompt per gmflow Import Agent

```
Import Agent gmflow — Export ID: bnd-gm-screen-rules-ai-maps-2026-08-01

Package: docs/gmflow-export-packages/2026-08-01-gm-screen-rules-ai-maps-export.md

OBIETTIVO
Importare le modifiche del 1 ago 2026 da Barber & Dragons:
1) GM Screen 2.0 modulare (react-grid-layout)
2) Dense parsers + fivee views + rules catalog (condizioni PHB)
3) AI item/lore image framing + fix import client image-prompt-builder
4) FoW object-contain coordinate fix

COMMIT B&D
- 9bc3a5f, d9bd4d9, b14782e, 9ebb1ec, 9679ca1

IMPORTARE
- src/components/gm/screen-grid/**
- src/app/campaigns/[id]/gm-screen-v2/page.tsx
- src/components/gm/gm-screen-*-v2.tsx, launcher updates
- src/lib/manuals/dense-*.ts, phb-conditions.ts, rules-catalog/**
- src/lib/actions/rules-catalog-*.ts
- src/lib/ai/image-prompt-item-lore.ts + image-prompt-builder/refine updates
- src/lib/map-core/coordinates/object-contain.ts (+ exploration wiring)
- package.json: react-grid-layout
- Migration 20260801140000_rules_catalog.sql RIGHE 1-46 ONLY (DDL)

NON IMPORTARE
- RLS/policy rules_catalog (righe 48-68)
- chore(gmflow) ledger commits
- Branding barber-*

ADATTAMENTI
- TenantAdapter / RBAC workspace per lookup e admin ingest
- CSS resize/grid su design system gmflow
- NEEDS_DECISION: v2 sostituisce o affianca screen classico

TEST
Checklist package + test dense-parsers, extract-phb-conditions, image-prompt-item-lore, map-core coordinates
```

## Vincoli

- Non modificare gmflow da B&D
- Non includere segreti
- Non importare RLS B&D
- Package correlati: `bnd-map-scene-editor-2026-05-28` (Rev 5 FoW), `bnd-ai-generation-systems-2026-06-20`, `bnd-command-center-2026-07-06`

---

**Generato:** 2026-08-01 — Export Agent Barber & Dragons
