# Action Registry

## Stato: implementato (Fase 2)

Le mutazioni Command Center passano da `executeAction()` nel registry centralizzato. Ogni esecuzione registra un evento in `app_audit_events`.

## Flusso

```
UI / Server Action → executeAction(name, input)
                         ├── validate
                         ├── authorize (adapter + action)
                         ├── preview (opzionale)
                         ├── loadBefore (snapshot)
                         ├── execute
                         ├── writeAuditEvent
                         └── revalidatePath
```

## Action registrate

### Workspace / Command (core)

| Nome | Descrizione |
|------|-------------|
| `command.note.create` | Crea nota inbox + command_input |
| `command.note.update` | Aggiorna nota |
| `command.link.create` | Collega nota a entità |
| `command.link.delete` | Rimuove collegamento |
| `workspace.task.create` | Crea task |
| `workspace.task.update` | Aggiorna task |
| `workspace.page.create` | Crea pagina |
| `workspace.page.update` | Aggiorna pagina |

### Wrapper legacy (Fase 2)

| Nome | Handler sottostante |
|------|---------------------|
| `gm.note.create` | `createGmNote` |
| `gm.note.update` | `updateGmNote` |
| `gm.note.delete` | `deleteGmNote` |
| `session.create` | `createSession` |
| `wiki.entity.create` | `createEntity` |

## File

```
src/modules/command-center/actions/
├── registry.ts
├── audit.ts
├── register-all.ts
├── definitions/
│   ├── workspace.actions.ts
│   └── wrappers/
│       ├── gm-note.actions.ts
│       ├── session.actions.ts
│       └── wiki.actions.ts
└── __tests__/registry.test.ts
```

## Audit

Tabella: `app_audit_events`  
Migration: `20260701140000_app_audit_events.sql`

UI: pannello **Cronologia azioni** nel Command Center (colonna destra).

## Test

```bash
npm run test:command-center
```

## Fase 3 (AI Draft)

- `previewAction()` usato dal Proposal Builder per anteprime in `ai_action_requests`
- Action proponibili AI: subset di workspace + `wiki.entity.create` + `gm.note.create`

## Fase 4 (Confirmed actions)

| Nome | Descrizione |
|------|-------------|
| `ai.proposal.execute` | GM applica bozza → esegue action sottostante + audit |
| `ai.proposal.reject` | Scarta bozza in attesa |

## Fase 5 (Voice input)

- `command.note.create` accetta `source: voice` + `transcript`
- Web Speech API in UI Command Center

## TODO Fase 6+

- [ ] `memory.reindex` wrapper
- [ ] `wiki.entity.update`, `session.update`
