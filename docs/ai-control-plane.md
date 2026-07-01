# AI Control Plane

## Stato: non implementato (Fase 3+)

Questo documento descrive il motore logico previsto. In Fase 1 **non c'è AI invasiva** nel Command Center.

## Responsabilità future

1. Ricevere input (testo, voce, file…)
2. Normalizzare in `command_inputs`
3. Creare `command_notes` collegate
4. Interpretare intento
5. Risolvere contesto autorizzato (campagna, memoria)
6. Proporre action via Action Registry
7. Generare anteprime
8. Attendere conferma utente (Livello 2)
9. Eseguire solo tramite registry
10. Scrivere audit log

## Flusso target

```
User input
  → command_inputs
  → command_notes
  → AI Interpreter
  → Context Resolver
  → Action Proposal (ai_action_requests)
  → User Approval
  → Action Registry
  → App Modules
  → Audit Log
```

## Context Resolver — scope memoria

| Livello | Fonte B&D attuale |
|---------|-------------------|
| GM globale | `profiles`, futuro `gm_workspace_memory` |
| Campagna | `campaigns.ai_context`, `campaign_memory_chunks` |
| Sessione | `sessions.session_summary`, `gm_private_notes` |

Regola: non mescolare scope senza `campaign_id` esplicito.

## Integrazione AI esistente (B&D)

Da riusare in Fase 3, **senza scrittura diretta**:

| Modulo | File | Uso Control Plane |
|--------|------|-------------------|
| Memoria RAG | `campaign-memory-query-actions.ts` | Read-only contesto |
| Architetto | `ai-architect.ts` | Separare generate vs apply |
| Wiki chat | `wiki-text-chat.ts` | Bozze testo |
| Generator | `ai/generator.ts` | Bozze strutturate |

## File previsti (Fase 3)

```
src/modules/command-center/ai-control-plane/
├── interpreter.ts
├── context-resolver.ts
├── proposal-builder.ts
└── autonomy.ts
```

## Rischi

- AI che scrive direttamente (pattern legacy da eliminare gradualmente)
- Context leak tra campagne → mitigare con resolver + test permessi
- Costi API → billing/limiti in gmflow
