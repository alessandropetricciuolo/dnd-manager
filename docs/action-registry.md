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

## TODO Fase 3+

- [ ] `ai.proposal.create` / `approve` / `reject`
- [ ] `memory.reindex` wrapper
- [ ] `wiki.entity.update`, `session.update`
- [ ] Preview UI per proposte AI
