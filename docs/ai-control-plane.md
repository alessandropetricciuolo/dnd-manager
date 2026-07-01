# AI Control Plane

## Stato: Fase 3 implementata (Livello 1 — solo bozze)

L'AI **non scrive mai** direttamente su dati ufficiali. Propone action tramite `ai_action_requests`; esecuzione dopo approvazione GM in Fase 4.

## Livelli autonomia

| Livello | Comportamento | Stato B&D |
|---------|---------------|-----------|
| 0 | Solo lettura | — |
| **1** | **Bozze / proposte** | **Attivo (`CURRENT_MAX_AUTONOMY = 1`)** |
| 2 | Esecuzione con conferma | Fase 4 |
| 3+ | Maggiore autonomia | Non pianificato |

## Flusso Fase 3

```
Messaggio GM (UI Assistente)
  → command_inputs (audit input grezzo)
  → Context Resolver (campagna, memoria RAG, note recenti)
  → AI Interpreter (JSON strutturato)
  → Proposal Builder (preview Action Registry)
  → ai_action_requests (status: proposed)
  → Pannello Bozze AI (scarta / in attesa approvazione)
```

## Action proponibili dall'AI (Fase 3)

- `workspace.task.create`
- `workspace.page.create`
- `wiki.entity.create`
- `gm.note.create`

Definite in `types/ai-proposal.ts` → `AI_DRAFT_ALLOWED_ACTIONS`.

## Moduli

```
src/modules/command-center/ai-control-plane/
├── autonomy.ts          # Livello massimo consentito
├── context-resolver.ts  # Campagna + memoria + note inbox
├── interpreter.ts       # LLM → intent + proposals JSON
├── proposal-builder.ts  # previewAction + insert ai_action_requests
├── draft-assistant.ts   # Orchestrazione server-side
└── __tests__/interpreter.test.ts
```

## UI

- Toggle **Workspace / Assistente** nell'header Command Center
- `ai-assistant-panel.tsx` — chat conversazionale
- `ai-proposal-panel.tsx` — bozze con anteprima e scarto

## Context Resolver — scope memoria

| Livello | Fonte B&D |
|---------|-----------|
| GM globale | Note recenti `command_notes` |
| Campagna | `campaigns.ai_context`, `campaign_memory_chunks` (solo `type = long`) |
| Sessione | Da estendere in fasi successive |

Regola: non mescolare scope senza `campaign_id` esplicito nel filtro UI.

## Integrazione AI esistente

| Modulo | Uso Control Plane |
|--------|-------------------|
| `generateAiText` | Interpreter |
| `generateOpenRouterEmbedding` + `match_campaign_memory` | Context (read-only) |
| Action Registry `previewAction` | Anteprima proposte |

## Tabella `ai_action_requests`

Migration: `supabase/migrations/20260701160000_ai_action_requests.sql`

Stati: `proposed` | `approved` | `executed` | `rejected` | `failed`

RLS: GM/Admin, `requested_by = auth.uid()`.

## Fase 4 (prossima)

- Approvazione ed esecuzione via `executeAction`
- Audit su esecuzione proposta
- Eventuali `ai.proposal.approve` / `ai.proposal.execute` nel registry

## Rischi mitigati

- Scrittura diretta AI → bloccata da Livello 1 + nessun `executeAction` in Fase 3
- Context leak → filtro campagna obbligatorio per memoria RAG
- Costi API → da limitare in gmflow (billing)
