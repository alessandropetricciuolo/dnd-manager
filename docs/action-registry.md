# Action Registry

## Stato: pianificato (Fase 2)

In Fase 1 le operazioni Command Center usano server actions dedicate in `src/modules/command-center/server/actions.ts`. Non esiste ancora un registry centralizzato.

## Regola architetturale

Tutto ciò che UI manuale e AI possono fare deve passare da action ufficiali:

```
UI / AI → ActionRegistry.execute(name, payload, ctx)
              ├── validate
              ├── authorize (TenantAdapter)
              ├── preview (opzionale)
              ├── execute
              └── audit
```

## Action Fase 1 (implementate come server actions dirette)

| Nome concettuale | Funzione attuale |
|------------------|------------------|
| `command.note.create` | `createCommandNoteAction` |
| `command.note.update` | `updateCommandNoteAction` |
| `command.link.create` | `createCommandLinkAction` |
| `workspace.task.create` | `createWorkspaceTaskAction` |
| `workspace.task.update` | `updateWorkspaceTaskAction` |
| `workspace.page.create` | `createWorkspacePageAction` |
| `workspace.page.update` | `updateWorkspacePageAction` |

## Action Fase 2 (wrap esistenti)

| Nome registry | Handler B&D |
|---------------|-------------|
| `gm.note.create` | `createGmNote` |
| `session.create` | `createSession` |
| `wiki.entity.create` | `createEntity` |
| `mission.create` | `createMissionAction` |
| `memory.reindex` | `reindexCampaignMemoryAction` |

## Struttura prevista

```
src/modules/command-center/actions/
├── registry.ts
├── audit.ts
└── definitions/
    ├── command-note.actions.ts
    └── wrappers/
        ├── session.actions.ts
        └── wiki.actions.ts
```

## Tabella audit (Fase 2)

`app_audit_events` — migration dedicata in Fase 2.

Campi: `actor_type`, `action_name`, `entity_type`, `entity_id`, `before_snapshot`, `after_snapshot`, `metadata`.

## TODO Fase 2

- [ ] Creare `registry.ts` con `registerAction` / `executeAction`
- [ ] Migrare actions Fase 1 al registry
- [ ] Migration `app_audit_events`
- [ ] Wrapper per `gm.note.*`, `session.create`, `wiki.entity.create`
- [ ] Test permessi negati + audit write
