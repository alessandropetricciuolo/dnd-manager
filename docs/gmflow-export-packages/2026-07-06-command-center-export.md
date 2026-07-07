# Export Package: Command Center (GM Workspace + AI Control Plane)

## Export ID

bnd-command-center-2026-07-06

## Origine

Barber & Dragons

## Destinazione prevista

gmflow.app

## Scope autorizzato

Export del modulo **Command Center** (Fasi 0–6): workspace GM, Action Registry, audit log, AI Draft Mode, proposte conversazionali con conferma, voice input, generatori testo dominio (campagna, missione, personaggio, sessione, wiki, relazioni, chiusura sessione).

**Commit di riferimento (in ordine):**

| Commit | Contenuto |
|--------|-----------|
| `089f6f1` | Fase 0 — fondamenta modulo |
| `09a5000` | Fase 1 — GM workspace e inbox |
| `d00079b` | Fase 2 — Action Registry + audit log |
| `f17432f` | Fase 3 — AI Draft Mode |
| `1e31f94` | Fasi 4–5 — azioni confermate + voice input |
| `0a78de3` | Action Registry esteso dominio campagna |
| `478d341` | Proposte AI → conferma conversazionale |
| `fd82d7b` | Wiki AI canvas + link dashboard |
| `1a5921c` | Wiki assistant fallback + delete workspace |
| `10b04a7` | Fasi 1–2 AI — proposte campagna e missione |
| `0a086f7` | Fase 3 AI — proposte personaggio + sheet generator embed |
| `0dc3ba6` | Fasi 4–6 AI — relazioni, sessioni, chiusura sessione |
| `c983095` | Modifica mirata anteprima + miglioramenti wiki AI |
| `a4a0545` | Creazione campagna guidata AI (tipo, descrizione, cover) |
| `508bd44` | Allineamento UI workspace con shell assistente |
| `0d6345e` | Gate statblock NPC su meccanica + velocizzazione wiki |

### 1. Modulo core (`src/modules/command-center/`)

| Area | Path | Ruolo |
|------|------|-------|
| **Types** | `types/` | `ActionDefinition`, `AiProposal`, audit, workspace, entities |
| **Action Registry** | `actions/` | Catalogo azioni, registry, audit, wrapper su actions B&D |
| **AI Control Plane** | `ai-control-plane/` | Interpreter, detector dominio, proposal builder/executor, chat assistant |
| **Adapters** | `adapters/types.ts` | `TenantAdapter` — pattern portabile |
| **Voice** | `voice/` | Dictation + command input voice |
| **Server** | `server/actions.ts` | Entry point server actions modulo |

### 2. Generatori AI dominio (`src/lib/ai/`)

| File | Ruolo |
|------|-------|
| `campaign-text-generator.ts` | Bozze campagna |
| `mission-text-generator.ts` | Bozze missione |
| `character-text-generator.ts` | Bozze personaggio |
| `session-text-generator.ts` | Bozze sessione |
| `session-close-text-generator.ts` | Chiusura sessione / debrief |
| `wiki-npc-params.ts` | Parametri NPC per wiki AI |
| `json-extract.ts` | Parse JSON robusto da risposte LLM |
| `contextual-names.ts` | Nomi contestuali (anche usato fuori CC) |
| `campaign-context-prompt.ts` | Blocco contesto campagna per prompt |

### 3. UI (`src/components/command-center/`)

| File | Ruolo |
|------|-------|
| `command-center-client.tsx` | Shell principale |
| `ai-assistant-canvas.tsx` | Canvas assistente |
| `ai-assistant-panel.tsx` | Pannello chat |
| `ai-proposal-panel.tsx` | Preview proposte |
| `audit-timeline.tsx` | Timeline audit |
| `preview-selectable-text.tsx` | Modifica mirata anteprima |
| `voice-capture-button.tsx` | Input vocale |

### 4. Route e integrazione

```
src/app/command-center/layout.tsx
src/app/command-center/page.tsx
src/components/sheet-generator/sheet-generator-embed.tsx
src/lib/supabase/middleware.ts          (route protetta)
src/components/dashboard/dashboard-shell.tsx
src/components/navbar-nav-links.tsx
```

### 5. Schema DB (solo DDL — no RLS)

| Migration | Tabelle |
|-----------|---------|
| `20260701120000_command_center_workspace.sql` | `command_inputs`, `command_notes`, `command_links`, `workspace_pages`, `workspace_tasks` — **righe 1–118** |
| `20260701140000_app_audit_events.sql` | `app_audit_events` — **righe 1–25** |
| `20260701160000_ai_action_requests.sql` | `ai_action_requests` — **righe 1–27** |
| `20260701120000_campaign_memory_missions_and_campaign.sql` | Estensioni memoria campagna (se presente DDL) |

**Non importare** blocchi `ENABLE ROW LEVEL SECURITY` + `CREATE POLICY` — gmflow scrive policy multi-tenant.

### 6. Test

```bash
npm run test:command-center
```

## Scope escluso

| Elemento | Motivo |
|----------|--------|
| `adapters/barber-dragons.adapter.ts` | Guild model B&D — creare `gmflow.adapter.ts` |
| Policy RLS su tutte le migration CC | Escluso per richiesta — policy gmflow-native |
| `workspace_id NULL` in B&D | In gmflow deve essere **NOT NULL** |
| Branding `barber-*`, copy italiano | Design system gmflow |
| `feat(home): refresh live-play copy` (`240d27c`) | Copy/marketing homepage — fuori scope |
| Billing AI / usage limits | Solo gmflow SaaS |

## Sintesi della modifica

Nuovo **Command Center** per GM: inbox note/comandi, workspace pagine, Action Registry tipizzato, audit trail, assistente AI conversazionale che propone azioni (crea campagna, missione, personaggio, wiki, sessione, relazioni) con **conferma esplicita** prima dell'esecuzione. Voice input opzionale. Integrazione sheet generator embedded per proposte personaggio.

## Comportamento prima

- GM gestiva campagne/wiki/sessioni solo da pagine dedicate senza workspace unificato.
- Nessun Action Registry centralizzato né audit delle azioni AI.
- Proposte AI sparse nei singoli dialog senza flusso conferma unificato.

## Comportamento dopo

- Route `/command-center` con inbox, note, link entità, workspace pages/tasks.
- Assistente AI interpreta intent → genera proposta → preview → conferma chat → esecuzione via Action Registry.
- `ai_action_requests` traccia stato proposta (proposed → approved → executed).
- `app_audit_events` log azioni eseguite.
- Creazione campagna guidata: tipo, descrizione, cover AI.
- Voice dictation per input comandi.

## File B&D coinvolti

### Indispensabili

```
src/modules/command-center/**          (escluso barber-dragons.adapter.ts come copy verbatim)
src/lib/ai/campaign-text-generator.ts
src/lib/ai/mission-text-generator.ts
src/lib/ai/character-text-generator.ts
src/lib/ai/session-text-generator.ts
src/lib/ai/session-close-text-generator.ts
src/lib/ai/wiki-npc-params.ts
src/lib/ai/json-extract.ts
src/lib/campaign-context-prompt.ts
src/components/command-center/**
src/components/sheet-generator/sheet-generator-embed.tsx
src/app/command-center/**
```

### Adapter pattern (reference)

```
src/modules/command-center/adapters/types.ts
src/modules/command-center/adapters/barber-dragons.adapter.ts  → riscrivere come gmflow.adapter.ts
```

### Integrazione dashboard

```
src/lib/supabase/middleware.ts
src/components/dashboard/dashboard-shell.tsx
src/components/navbar-nav-links.tsx
src/app/dashboard/page.tsx
```

## Backend coinvolto

- Server Actions: `src/modules/command-center/server/actions.ts`
- Wrapper actions su: campaigns, characters, missions, sessions, wiki, gm-notes, relationships
- OpenRouter per interpreter + generatori dominio (`jsonMode`, rate limit fallback)
- Supabase: CRUD tabelle command_*, ai_action_requests, app_audit_events

## Database coinvolto

Vedi migration DDL sopra. Nessuna modifica a tabelle campagna/wiki esistenti oltre estensioni memoria.

## Storage coinvolto

- Cover campagna AI (se generata) — adapter storage gmflow
- Voice: browser Web Speech API (client-side), nessun storage

## Provider o servizi esterni

| Provider | Uso |
|----------|-----|
| OpenRouter | Interpreter, generatori testo, json mode |
| Web Speech API | Voice dictation (browser) |

## Variabili ambiente richieste

```env
OPENROUTER_API_KEY=           # Obbligatoria
OPENROUTER_MODEL=             # Interpreter (default gpt-4o-mini)
WIKI_TEXT_MODEL=              # Wiki proposals
WIKI_TEXT_FALLBACK_MODEL=     # Fallback rate limit (se configurato)
```

## Parti specifiche B&D da rimuovere

- `barber-dragons.adapter.ts` — sostituire con adapter gmflow multi-tenant
- `is_gm_or_admin()` nelle policy — RBAC workspace gmflow
- Link hardcoded `/campaigns/[id]` — route gmflow equivalenti
- CSS `barber-*`

## Adattamento richiesto per gmflow

1. **`TenantAdapter` obbligatorio** con `workspace_id` NOT NULL.
2. **DDL migration** senza policy RLS B&D + policy gmflow-native.
3. **Action Registry**: registrare wrapper su actions gmflow esistenti.
4. **Billing/quota AI** per tenant (non presente in B&D).
5. **UI theming** — componenti command-center con design system gmflow.
6. **NEEDS_DECISION**: guild-wide GM vs org-scoped workspace access.

## Ambiguità rilevate

| # | Ambiguità |
|---|-----------|
| A1 | `command_notes` vs `gm_notes` — UX duplicata? |
| A2 | Workspace pages: equivalente in gmflow o nuova feature? |
| A3 | Voice input: supporto browser/mobile gmflow |
| A4 | Memoria campagna indexing — prerequisito per alcune proposte |

## Rischi

| Rischio | Mitigazione |
|---------|-------------|
| Modulo grande (~80+ file) | Import per fasi (registry → AI → UI) |
| AI proposte errate | Conferma obbligatoria + audit |
| Costi OpenRouter multi-dominio | Quota tenant |
| RLS importata per errore | Checklist: zero CREATE POLICY B&D |

## Test minimi richiesti

```bash
npm run test:command-center
```

- [ ] Crea nota inbox → link entità wiki
- [ ] Proposta campagna AI → preview → conferma → campagna creata
- [ ] Proposta personaggio → sheet generator embed → conferma
- [ ] Proposta wiki → gate statblock se mechanics off
- [ ] Voice input → testo in command input
- [ ] Audit timeline mostra azione eseguita
- [ ] Rifiuto proposta → status `rejected`

## Import Contract per gmflow

### Fase 1 — Core types + Action Registry
1. `src/modules/command-center/types/`
2. `src/modules/command-center/actions/`
3. DDL `command_*`, `app_audit_events`, `ai_action_requests` (no RLS)
4. `npm run test:command-center` (registry tests)

### Fase 2 — AI Control Plane
1. `src/modules/command-center/ai-control-plane/`
2. Generatori `src/lib/ai/*-text-generator.ts`, `json-extract.ts`
3. Test ai-control-plane

### Fase 3 — Adapter gmflow
1. Creare `gmflow.adapter.ts` da `adapters/types.ts`
2. Wire wrapper actions su API gmflow

### Fase 4 — UI
1. `src/components/command-center/**`
2. Route `/command-center`
3. Nav dashboard

## Prompt per gmflow Import Agent

```
Import Agent gmflow — Export ID: bnd-command-center-2026-07-06

Package: docs/gmflow-export-packages/2026-07-06-command-center-export.md

OBIETTIVO
Importare il Command Center: workspace GM, Action Registry, AI Control Plane con proposte confermate.

IMPORTARE
- src/modules/command-center/** (riscrivere adapter, non copiare barber-dragons.adapter.ts verbatim)
- src/lib/ai/*-text-generator.ts, json-extract.ts, wiki-npc-params.ts, campaign-context-prompt.ts
- src/components/command-center/**
- src/app/command-center/**
- src/components/sheet-generator/sheet-generator-embed.tsx
- Migration DDL (no RLS): command_center_workspace, app_audit_events, ai_action_requests

NON IMPORTARE
- CREATE POLICY / ENABLE RLS da migration B&D
- barber-dragons.adapter.ts (usare come reference)
- Homepage copy refresh (240d27c)

ADATTAMENTI
- workspace_id NOT NULL
- TenantAdapter gmflow
- RBAC multi-tenant
- Billing AI quota

TEST: npm run test:command-center + checklist integrazione
```

## Vincoli

- Non modificare gmflow da B&D
- Non includere segreti
- Non importare policy RLS B&D

---

**Generato:** 2026-07-06 — Export Agent Barber & Dragons
