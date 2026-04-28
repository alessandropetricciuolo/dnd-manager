# UX Sprint Rollout Guardrails

This document defines implementation rules for the UX roadmap so every change is easy to revert.

## Core Rules

- One UX task equals one isolated commit.
- Avoid multi-area refactors in the same commit.
- Prefer additive changes over structural rewrites.
- Keep existing APIs and server actions stable unless the task explicitly requires backend changes.
- If a task modifies behavior, provide a local fallback path in code comments.

## Revert Checklist (for every task)

Before marking a task done, verify:

1. The task touches only expected files.
2. The app builds successfully with `npm run build`.
3. There is no unrelated lint noise in modified files.
4. The commit message references the exact task id.
5. Reverting only that commit restores previous behavior without DB migration rollback.

## Safe Change Patterns

- UI hierarchy changes: prefer conditional rendering and wrappers.
- Microcopy changes: keep text-only diffs where possible.
- Accessibility updates: add `aria-label` and hit-area classes without changing business logic.
- Navigation changes: keep previous route behavior behind simple condition/fallback if needed.

## Avoid in Quick UX Tasks

- Schema changes unless strictly required by the task.
- Large component splitting and architecture-level refactors.
- Changing multiple interaction paradigms in one pass.

## Suggested Commit Prefixes

- `ux(task-id): ...`
- `a11y(task-id): ...`
- `copy(task-id): ...`

