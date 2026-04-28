# UX Regression QA Checklist

Use this list at the end of each UX sprint to validate behavior and guarantee quick rollback.

## GM Area

- GM screen long: switch between `Durante sessione` and `Chiusura` and verify visible panels match the selected mode.
- Initiative tracker: open session mode and confirm tracker is usable and updates persist.
- Long economy panel: verify row status (`salvataggio`, `salvato`, `errore`) and retry action on forced failure.
- Long calendar panel: update day/month/year, save, refresh page, and verify values are preserved.

## Campaign Experience

- Campaign tabs with blocked access: confirm persistent unlock message appears when wiki/maps are locked.
- Session cards (GM): verify primary/secondary action hierarchy and expanded `Gestisci iscritti` behavior.
- Session cards icon actions: verify icon buttons remain accessible and have clear hover/focus state.

## Dashboard

- Session calendar: click a day with sessions and verify day drawer opens with matching sessions list.
- Dashboard fallback: set `NEXT_PUBLIC_DASHBOARD_CALENDAR_DAY_DRAWER=0` and verify old direct-link behavior.

## Mission & Maps

- Mission board: verify readability remains high and visual effects are not distracting.
- Mission details: validate status, reward, and encounter prep sections remain accessible.
- Map cards: verify edit/delete actions are always visible for GM/Admin.
- Map cards mobile and desktop: verify primary map actions remain discoverable without hover.

## Admin Area

- Admin communications header: verify readable contrast and spacing consistency.
- Core admin flow (compose/send/review): confirm no regressions in existing behavior.

## Rollback Validation

- Each task can be reverted independently (single-commit scope).
- No migration rollback required for these UX tasks.
- `npm run build` succeeds after any single task revert.
