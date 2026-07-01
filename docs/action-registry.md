# Action Registry

## Stato: esteso (Tier A–C campagna + workspace)

Tutte le mutazioni Command Center e le operazioni campagna dell'assistente passano da `executeAction()`.

## Catalogo

File sorgente: `src/modules/command-center/actions/action-catalog.ts`

### Tier A — Workspace

| Action | Stato |
|--------|-------|
| `command.note.create/update` | ✓ |
| `command.link.create/delete` | ✓ |
| `workspace.task.create/update` | ✓ |
| `workspace.page.create/update` | ✓ |
| `command.input.capture` | ✓ |
| `memory.reindex` | ✓ |

### Tier B — Operazioni mature (wrapper)

| Action | Legacy |
|--------|--------|
| `gm.note.create/update/delete` | `gm-actions` |
| `session.create` | `createSession` |
| `session.update` | `updateSession` |
| `wiki.entity.create/update` | `wiki-actions` |
| `mission.create/update` | `mission-actions` |

### Tier C — Alto impatto

| Action | Note |
|--------|------|
| `session.close` | Chiusura semplificata (presenze auto) |
| `campaign.create/update` | Oneshot, quest, long, torneo |
| `wiki.entity.delete` | Conferma GM obbligatoria |
| `character.create/update` | Solo campi testuali (no upload) |
| `campaign.aiContext.generate` | Architetto AI → `ai_context` |
| `ai.proposal.execute/reject` | Meta-action bozze |

### Deferred

| Action | Motivo |
|--------|--------|
| `map.create/update` | Upload file / scene editor |
| `memory.promoteToCanon` | Da definire |
| `command.note.archive` | Usa `command.note.update` status `archived` |

## Assistente AI

17 action proponibili (`AI_DRAFT_ALLOWED_ACTIONS`). Flusso invariato:

```
Input → interpreter → bozza → GM Applica → executeAction → audit
```

L'assistente resta **parallelo** alle UI esistenti (wiki, missioni, GM tab, dashboard).

## Test

```bash
npm run test:command-center
```
