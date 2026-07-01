# Command Center — Visione

## Scopo

Il **Command Center** è la cabina di regia del GM: cattura idee, organizza note, task e pagine workspace, e (in fasi future) coordina l'AI senza mai scrivere direttamente sul database applicativo.

Barber & Dragons è il **laboratorio reale**. gmflow.app è la **destinazione prodotto**.

## Principi non negoziabili

1. **Modalità manuale** e **modalità assistita AI** convivono; la manuale non è secondaria.
2. L'AI **non modifica mai direttamente il database** — solo tramite Action Registry (Fase 2+).
3. Ogni mutazione ufficiale deve essere validata, autorizzata e tracciata.
4. Il core del modulo è **esportabile** verso gmflow via adapter.

## Quattro blocchi logici

| Blocco | Fase attuale | Descrizione |
|--------|--------------|-------------|
| Command Center (UI) | **Fase 1** | Inbox, task, pagine, collegamenti |
| GM Workspace | **Fase 1** | Note, task, documenti interni |
| AI Control Plane | Fase 3+ | Interpretazione, proposte, conferma |
| Action Registry | Fase 2 | Action tipizzate con audit |

## Route

- **Globale:** `/command-center`
- **Con contesto campagna:** `/command-center?campaignId=<uuid>`
- Entry point: sidebar dashboard, dashboard GM, tab Strumenti GM campagna

## Note vs gm_notes

Due sistemi **paralleli** (decisione approvata):

| Sistema | Tabella | Uso |
|---------|---------|-----|
| Command Center inbox | `command_notes` | Idee, cattura rapida, workspace GM |
| Note campagna (legacy) | `gm_notes` | Tab GM dentro la campagna |

Bridge previsto in Fase 2 (`gm.note.*` wrapper + eventuale conversione).

## Livelli autonomia AI (roadmap)

| Livello | Stato |
|---------|-------|
| 0 Read-only | Fase 3 |
| 1 Draft | Fase 3 |
| 2 Confirmed actions | **Fase 4** |
| 3 Trusted automations | Futuro |
| 4 Autonomous agents | Non pianificato |

## Implementato

### Fase 1
- Migration `20260701120000_command_center_workspace.sql`
- Modulo `src/modules/command-center/`
- UI `/command-center` (inbox, task, pagine, collegamenti)

### Fase 2
- Action Registry (`src/modules/command-center/actions/`)
- Audit log `app_audit_events`
- Wrapper: `gm.note.*`, `session.create`, `wiki.entity.create`
- Cronologia azioni in UI
- Test `npm run test:command-center`

### Fase 3
- AI Draft Mode (Livello 1): interpreter, context resolver, bozze in `ai_action_requests`
- UI Assistente + pannello bozze

### Fase 4
- Livello 2: pulsante **Applica** con conferma GM
- `ai.proposal.execute` / `ai.proposal.reject` nel registry
- Esecuzione tramite `executeAction` + audit

### Fase 5
- Input vocale (Web Speech API) → `command_inputs` con `source: voice`
- Microfono su cattura rapida e assistente GM

## TODO

- [ ] Fase 6: Porting gmflow (`gmflow.adapter.ts`)
