# Command Center — Export verso gmflow

## Core esportabile

| Path | Portabile | Note |
|------|-----------|------|
| `src/modules/command-center/types/` | ✅ | Tipi puri |
| `src/modules/command-center/adapters/types.ts` | ✅ | Interfaccia `TenantAdapter` |
| `src/modules/command-center/server/actions.ts` | ⚠️ | Usa registry per mutazioni |
| `src/modules/command-center/ai-control-plane/` | ✅ (futuro) | Non ancora creato |
| `src/modules/command-center/actions/` | ✅ | Core esportabile |
| `src/components/command-center/` | ⚠️ | UI riusabile con theming gmflow |

## Specifico B&D (non portare verbatim)

| Elemento | Motivo |
|----------|--------|
| `barber-dragons.adapter.ts` | Guild model, `workspace_id` null |
| RLS `is_gm_or_admin()` | gmflow usa workspace + ruoli tenant |
| Link a `/campaigns/[id]` | Route gmflow equivalenti |
| Branding barber-* CSS | Tema gmflow |

## Adapter gmflow (Fase 6)

Creare `gmflow.adapter.ts` che implementa `TenantAdapter`:

- `resolveWorkspaceId()` → UUID obbligatorio
- `assertCanAccessCommandCenter()` → membership workspace
- `assertCanLinkEntity()` → isolamento tenant + campaign scope
- `listCampaignsForPicker()` → campagne del workspace corrente

## Schema dati — differenze

| Campo | B&D | gmflow |
|-------|-----|--------|
| `workspace_id` | NULL | NOT NULL |
| `campaign_id` | opzionale | opzionale, sempre nel workspace |
| RLS | GM/Admin globali | per workspace_id |

## File creati Fase 1–2

```
supabase/migrations/20260701120000_command_center_workspace.sql
supabase/migrations/20260701140000_app_audit_events.sql
src/modules/command-center/actions/
src/components/command-center/audit-timeline.tsx
```

## Modificati Fase 1

```
src/lib/supabase/middleware.ts (route protetta)
src/components/dashboard/dashboard-shell.tsx (nav)
src/app/dashboard/page.tsx (link GM)
src/components/gm/gm-homepage.tsx (link campagna)
```

## Ledger gmflow

Aggiornare `docs/gmflow-export-ledger.md` quando il modulo sarà stabile per import (post Fase 2–4).

## Rischi porting

- Duplicazione `gm_notes` vs `command_notes` da documentare in gmflow UX
- Action Registry deve esistere prima del porting AI
- Billing AI e limiti usage solo su gmflow
