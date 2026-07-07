# B&D → gmflow Export Ledger

## Snapshot

* Data aggiornamento: 2026-07-07T04:55:52.812Z
* Branch corrente: main
* Ultimo commit analizzato: 28fe02cd7195efcdda5e42962c50ac41ed94a86a
* Range commit analizzato: 7ed15be..28fe02c
* Stato generale: 157 voci NEEDS_REVIEW
* Voci totali: 552 (NEEDS_REVIEW: 157, TO_IMPORT: 319, IMPORTED: 0)

## Delta automatico non revisionato

### [BD-GMFLOW-041d96c-003] AI: wiki-image-refine-chat.tsx (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/wiki/wiki-image-refine-chat.tsx` aggiunto nel commit «feat(wiki): add prompt-based iterative image refinement after first generation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/wiki/wiki-image-refine-chat.tsx

File gmflow probabili:

* src/components/wiki/wiki-image-refine-chat.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-688720b-008] AI: types.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/sheet-generator/types.ts` modificato nel commit «feat(sheet-generator): add expertise, bard skills, and realistic AC rules». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/sheet-generator/types.ts

File gmflow probabili:

* src/lib/sheet-generator/types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-94b0f4e-001] OTHER: adr-map-scene-editor.md (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/adr-map-scene-editor.md` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/adr-map-scene-editor.md

File gmflow probabili:

* docs/imports/adr-map-scene-editor.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-002] OTHER: package.json (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `package.json` modificato nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* package.json

File gmflow probabili:

* src/package.json

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-003] OTHER: manifest.json (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `public/scene-assets/manifest.json` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* public/scene-assets/manifest.json

File gmflow probabili:

* src/public/scene-assets/manifest.json

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-004] CAMPAIGNS: page.tsx (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]/page.tsx` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-005] CAMPAIGNS: page.tsx (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/[id]/gm-only/scene-editor/page.tsx` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/[id]/gm-only/scene-editor/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/gm-only/scene-editor/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-006] CAMPAIGNS: exploration-map-actions.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/exploration-map-actions.ts` modificato nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/exploration-map-actions.ts

File gmflow probabili:

* src/app/campaigns/exploration-map-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-008] UI_UX: exploration-map-stage.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/exploration/exploration-map-stage.tsx` modificato nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/exploration/exploration-map-stage.tsx

File gmflow probabili:

* src/components/exploration/exploration-map-stage.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-009] UI_UX: use-exploration-map-grid.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/exploration/use-exploration-map-grid.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/exploration/use-exploration-map-grid.ts

File gmflow probabili:

* src/components/exploration/use-exploration-map-grid.ts

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-010] UI_UX: vista-dall-alto-client.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/exploration/vista-dall-alto-client.tsx` modificato nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/exploration/vista-dall-alto-client.tsx

File gmflow probabili:

* src/components/exploration/vista-dall-alto-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-011] GM_SCREEN: gm-exploration-fow-sheet.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
GM_SCREEN

Priorità per gmflow:
Media

Descrizione:

* File `src/components/gm/gm-exploration-fow-sheet.tsx` modificato nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Schermo GM / combattimento — alto valore per GM professionisti.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/gm/gm-exploration-fow-sheet.tsx

File gmflow probabili:

* src/components/gm/gm-exploration-fow-sheet.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-014] UI_UX: scene-editor-list-actions.tsx (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-list-actions.tsx` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-list-actions.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-list-actions.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-015] OTHER: exploration-map-grid.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/exploration/exploration-map-grid.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/exploration/exploration-map-grid.ts

File gmflow probabili:

* src/lib/exploration/exploration-map-grid.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-016] OTHER: fow-geometry.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/exploration/fow-geometry.ts` modificato nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/exploration/fow-geometry.ts

File gmflow probabili:

* src/lib/exploration/fow-geometry.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-017] OTHER: scene-document.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core-bd/scene-document.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core-bd/scene-document.ts

File gmflow probabili:

* src/lib/map-core-bd/scene-document.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-018] OTHER: coordinates.test.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/__tests__/coordinates.test.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/__tests__/coordinates.test.ts

File gmflow probabili:

* src/lib/map-core/__tests__/coordinates.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-019] OTHER: exploration-map-grid.test.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/__tests__/exploration-map-grid.test.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/__tests__/exploration-map-grid.test.ts

File gmflow probabili:

* src/lib/map-core/__tests__/exploration-map-grid.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-020] OTHER: scene-document.test.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/__tests__/scene-document.test.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/__tests__/scene-document.test.ts

File gmflow probabili:

* src/lib/map-core/__tests__/scene-document.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-021] OTHER: train-scene-import.test.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/__tests__/train-scene-import.test.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/__tests__/train-scene-import.test.ts

File gmflow probabili:

* src/lib/map-core/__tests__/train-scene-import.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-022] OTHER: clamp.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/coordinates/clamp.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/coordinates/clamp.ts

File gmflow probabili:

* src/lib/map-core/coordinates/clamp.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-023] OTHER: index.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/coordinates/index.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/coordinates/index.ts

File gmflow probabili:

* src/lib/map-core/coordinates/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-024] OTHER: object-contain.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/coordinates/object-contain.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/coordinates/object-contain.ts

File gmflow probabili:

* src/lib/map-core/coordinates/object-contain.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-025] OTHER: parse-polygon.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/coordinates/parse-polygon.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/coordinates/parse-polygon.ts

File gmflow probabili:

* src/lib/map-core/coordinates/parse-polygon.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-026] OTHER: point-in-polygon.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/coordinates/point-in-polygon.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/coordinates/point-in-polygon.ts

File gmflow probabili:

* src/lib/map-core/coordinates/point-in-polygon.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-027] OTHER: types.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/coordinates/types.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/coordinates/types.ts

File gmflow probabili:

* src/lib/map-core/coordinates/types.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-028] OTHER: constants.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/fog/constants.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/fog/constants.ts

File gmflow probabili:

* src/lib/map-core/fog/constants.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-029] OTHER: draw-fog.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/fog/draw-fog.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/fog/draw-fog.ts

File gmflow probabili:

* src/lib/map-core/fog/draw-fog.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-030] OTHER: fow-sync.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/fog/fow-sync.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/fog/fow-sync.ts

File gmflow probabili:

* src/lib/map-core/fog/fow-sync.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-031] OTHER: index.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/fog/index.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/fog/index.ts

File gmflow probabili:

* src/lib/map-core/fog/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-032] OTHER: fow-sync.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/fow/fow-sync.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/fow/fow-sync.ts

File gmflow probabili:

* src/lib/map-core/fow/fow-sync.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-033] OTHER: index.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/index.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/index.ts

File gmflow probabili:

* src/lib/map-core/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-035] OTHER: draw-floor.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/draw-floor.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/draw-floor.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/draw-floor.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-036] OTHER: draw-props.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/draw-props.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/draw-props.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/draw-props.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-037] OTHER: ids.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/ids.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/ids.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/ids.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-038] OTHER: snap.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/snap.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/snap.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/snap.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-039] OTHER: clone-document.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/clone-document.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/clone-document.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/clone-document.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-040] OTHER: index.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/index.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/index.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-041] OTHER: props-catalog.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/props-catalog.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/props-catalog.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/props-catalog.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-042] OTHER: types.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/types.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/types.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/types.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-043] OTHER: validate.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/validate.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/validate.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/validate.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-044] OTHER: index.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-to-fow/index.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-to-fow/index.ts

File gmflow probabili:

* src/lib/map-core/scene-to-fow/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-045] OTHER: gm-notes.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/viewer/gm-notes.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/viewer/gm-notes.ts

File gmflow probabili:

* src/lib/map-core/viewer/gm-notes.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-046] OTHER: grid.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/viewer/grid.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/viewer/grid.ts

File gmflow probabili:

* src/lib/map-core/viewer/grid.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-047] OTHER: index.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/viewer/index.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/viewer/index.ts

File gmflow probabili:

* src/lib/map-core/viewer/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-048] OTHER: database.types.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/types/database.types.ts` modificato nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/types/database.types.ts

File gmflow probabili:

* src/types/database.types.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-3cf1907-001] CAMPAIGNS: page.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/[id]/gm-only/vista-dall-alto/page.tsx` modificato nel commit «fix(maps): sync Scene Editor scenes to Esplorazione e FoW on create.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/[id]/gm-only/vista-dall-alto/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/gm-only/vista-dall-alto/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-3cf1907-003] UI_UX: vista-dall-alto-client.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/exploration/vista-dall-alto-client.tsx` modificato nel commit «fix(maps): sync Scene Editor scenes to Esplorazione e FoW on create.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/exploration/vista-dall-alto-client.tsx

File gmflow probabili:

* src/components/exploration/vista-dall-alto-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-3cf1907-004] UI_UX: scene-editor-list-actions.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-list-actions.tsx` modificato nel commit «fix(maps): sync Scene Editor scenes to Esplorazione e FoW on create.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-list-actions.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-list-actions.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f9bcd77-002] UI_UX: scene-editor-client.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-client.tsx` modificato nel commit «fix(maps): upload full Scene Editor rasters from FormData on save.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-client.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f9bcd77-004] OTHER: scene-document.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core-bd/scene-document.ts` modificato nel commit «fix(maps): upload full Scene Editor rasters from FormData on save.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core-bd/scene-document.ts

File gmflow probabili:

* src/lib/map-core-bd/scene-document.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-874262e-001] WIKI: wiki-bestiary-search-actions.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/wiki-bestiary-search-actions.ts` modificato nel commit «fix(bestiary): map each monster to the chunk that owns its statblock.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/lib/actions/wiki-bestiary-search-actions.ts

File gmflow probabili:

* src/lib/actions/wiki-bestiary-search-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-874262e-002] OTHER: bestiary-statblock-parser.test.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/manuals/__tests__/bestiary-statblock-parser.test.ts` modificato nel commit «fix(bestiary): map each monster to the chunk that owns its statblock.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/manuals/__tests__/bestiary-statblock-parser.test.ts

File gmflow probabili:

* src/lib/manuals/__tests__/bestiary-statblock-parser.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-874262e-003] OTHER: bestiary-statblock-parser.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/manuals/bestiary-statblock-parser.ts` modificato nel commit «fix(bestiary): map each monster to the chunk that owns its statblock.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/manuals/bestiary-statblock-parser.ts

File gmflow probabili:

* src/lib/manuals/bestiary-statblock-parser.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-2a187df-001] WIKI: wiki-list-client.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/components/wiki/wiki-list-client.tsx` modificato nel commit «feat(wiki): GM column board grouped by entity type per mission». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/wiki/wiki-list-client.tsx

File gmflow probabili:

* src/components/wiki/wiki-list-client.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-8af8c46-001] WIKI: wiki-list-client.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/components/wiki/wiki-list-client.tsx` modificato nel commit «feat(wiki): GM column board grouped by entity type per mission». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/wiki/wiki-list-client.tsx

File gmflow probabili:

* src/components/wiki/wiki-list-client.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-001] OTHER: action-registry.md (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/action-registry.md` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/action-registry.md

File gmflow probabili:

* docs/imports/action-registry.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-002] AI: ai-control-plane.md (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `docs/ai-control-plane.md` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* docs/ai-control-plane.md

File gmflow probabili:

* docs/imports/ai-control-plane.md

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-09a5000-007] OTHER: page.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/app/dashboard/page.tsx` modificato nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/app/dashboard/page.tsx

File gmflow probabili:

* src/app/dashboard/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-009] UI_UX: dashboard-shell.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/dashboard/dashboard-shell.tsx` modificato nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/dashboard/dashboard-shell.tsx

File gmflow probabili:

* src/components/dashboard/dashboard-shell.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-010] UI_UX: mobile-nav-menu.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/dashboard/mobile-nav-menu.tsx` modificato nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/dashboard/mobile-nav-menu.tsx

File gmflow probabili:

* src/components/dashboard/mobile-nav-menu.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-011] GM_SCREEN: gm-homepage.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
GM_SCREEN

Priorità per gmflow:
Media

Descrizione:

* File `src/components/gm/gm-homepage.tsx` modificato nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Schermo GM / combattimento — alto valore per GM professionisti.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/gm/gm-homepage.tsx

File gmflow probabili:

* src/components/gm/gm-homepage.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-012] OTHER: middleware.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/supabase/middleware.ts` modificato nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/supabase/middleware.ts

File gmflow probabili:

* src/lib/supabase/middleware.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-021] OTHER: database.types.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/types/database.types.ts` modificato nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/types/database.types.ts

File gmflow probabili:

* src/types/database.types.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-022] DATABASE: 20260701120000_command_center_workspace.sql (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
DATABASE

Priorità per gmflow:
Alta

Descrizione:

* File `supabase/migrations/20260701120000_command_center_workspace.sql` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Schema o migrazione DB — valutare impatto RLS e tenant isolation.

Adattamenti necessari:

* Multi-tenant
* sicurezza

File B&D coinvolti:

* supabase/migrations/20260701120000_command_center_workspace.sql

File gmflow probabili:

* supabase/migrations/20260701120000_command_center_workspace.sql

Rischi:

* Classificazione automatica non verificata
* Impatto RLS / isolamento tenant

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* RLS/policy verificate per multi-tenant

### [BD-GMFLOW-d00079b-001] OTHER: action-registry.md (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/action-registry.md` modificato nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/action-registry.md

File gmflow probabili:

* docs/imports/action-registry.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-004] OTHER: package.json (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `package.json` modificato nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* package.json

File gmflow probabili:

* src/package.json

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-022] OTHER: database.types.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/types/database.types.ts` modificato nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/types/database.types.ts

File gmflow probabili:

* src/types/database.types.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-023] DATABASE: 20260701140000_app_audit_events.sql (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
DATABASE

Priorità per gmflow:
Alta

Descrizione:

* File `supabase/migrations/20260701140000_app_audit_events.sql` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Schema o migrazione DB — valutare impatto RLS e tenant isolation.

Adattamenti necessari:

* Multi-tenant
* sicurezza

File B&D coinvolti:

* supabase/migrations/20260701140000_app_audit_events.sql

File gmflow probabili:

* supabase/migrations/20260701140000_app_audit_events.sql

Rischi:

* Classificazione automatica non verificata
* Impatto RLS / isolamento tenant

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* RLS/policy verificate per multi-tenant

### [BD-GMFLOW-f17432f-001] OTHER: action-registry.md (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/action-registry.md` modificato nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/action-registry.md

File gmflow probabili:

* docs/imports/action-registry.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f17432f-002] AI: ai-control-plane.md (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `docs/ai-control-plane.md` modificato nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* docs/ai-control-plane.md

File gmflow probabili:

* docs/imports/ai-control-plane.md

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-f17432f-003] OTHER: package.json (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `package.json` modificato nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* package.json

File gmflow probabili:

* src/package.json

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f17432f-017] OTHER: database.types.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/types/database.types.ts` modificato nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/types/database.types.ts

File gmflow probabili:

* src/types/database.types.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f17432f-018] DATABASE: 20260701160000_ai_action_requests.sql (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
DATABASE

Priorità per gmflow:
Alta

Descrizione:

* File `supabase/migrations/20260701160000_ai_action_requests.sql` aggiunto nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Schema o migrazione DB — valutare impatto RLS e tenant isolation.

Adattamenti necessari:

* Multi-tenant
* sicurezza

File B&D coinvolti:

* supabase/migrations/20260701160000_ai_action_requests.sql

File gmflow probabili:

* supabase/migrations/20260701160000_ai_action_requests.sql

Rischi:

* Classificazione automatica non verificata
* Impatto RLS / isolamento tenant

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* RLS/policy verificate per multi-tenant

### [BD-GMFLOW-1e31f94-001] OTHER: action-registry.md (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/action-registry.md` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/action-registry.md

File gmflow probabili:

* docs/imports/action-registry.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-002] AI: ai-control-plane.md (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `docs/ai-control-plane.md` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* docs/ai-control-plane.md

File gmflow probabili:

* docs/imports/ai-control-plane.md

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1e31f94-004] OTHER: package.json (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `package.json` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* package.json

File gmflow probabili:

* src/package.json

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-001] OTHER: action-registry.md (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/action-registry.md` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/action-registry.md

File gmflow probabili:

* docs/imports/action-registry.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-fd82d7b-002] OTHER: page.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/app/dashboard/page.tsx` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/app/dashboard/page.tsx

File gmflow probabili:

* src/app/dashboard/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-fd82d7b-006] UI_UX: dashboard-shell.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/dashboard/dashboard-shell.tsx` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/dashboard/dashboard-shell.tsx

File gmflow probabili:

* src/components/dashboard/dashboard-shell.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-fd82d7b-007] UI_UX: mobile-nav-menu.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/dashboard/mobile-nav-menu.tsx` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/dashboard/mobile-nav-menu.tsx

File gmflow probabili:

* src/components/dashboard/mobile-nav-menu.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a5921c-004] AI: wiki-npc-params.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/wiki-npc-params.ts` aggiunto nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/wiki-npc-params.ts

File gmflow probabili:

* src/lib/ai/wiki-npc-params.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a5921c-005] AI: wiki-text-generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/wiki-text-generator.ts` modificato nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/wiki-text-generator.ts

File gmflow probabili:

* src/lib/ai/wiki-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6d1ad30-001] OTHER: global-env.d.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/global-env.d.ts` modificato nel commit «fix(ai): handle OpenRouter wiki text rate limits with fallback.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/global-env.d.ts

File gmflow probabili:

* src/global-env.d.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-6d1ad30-002] AI: index.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/index.ts` modificato nel commit «fix(ai): handle OpenRouter wiki text rate limits with fallback.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/index.ts

File gmflow probabili:

* src/lib/ai/index.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6d1ad30-003] AI: openrouter-client.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/openrouter-client.ts` modificato nel commit «fix(ai): handle OpenRouter wiki text rate limits with fallback.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/openrouter-client.ts

File gmflow probabili:

* src/lib/ai/openrouter-client.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-984469b-001] AI: openrouter-client.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/openrouter-client.ts` modificato nel commit «fix(ai): clarify OpenRouter rate limit error message.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/openrouter-client.ts

File gmflow probabili:

* src/lib/ai/openrouter-client.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-089f6f1-001] CAMPAIGNS: actions.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/actions.ts` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/actions.ts

File gmflow probabili:

* src/app/campaigns/actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-089f6f1-002] OTHER: actions.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/app/dashboard/actions.ts` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/app/dashboard/actions.ts

File gmflow probabili:

* src/app/dashboard/actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-089f6f1-004] GM_SCREEN: campaign-memory-query-panel.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
GM_SCREEN

Priorità per gmflow:
Media

Descrizione:

* File `src/components/gm/campaign-memory-query-panel.tsx` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Schermo GM / combattimento — alto valore per GM professionisti.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/gm/campaign-memory-query-panel.tsx

File gmflow probabili:

* src/components/gm/campaign-memory-query-panel.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-089f6f1-005] AI: ai-architect.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/actions/ai-architect.ts` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/actions/ai-architect.ts

File gmflow probabili:

* src/lib/actions/ai-architect.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-089f6f1-006] OTHER: campaign-memory-query-actions.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/campaign-memory-query-actions.ts` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/actions/campaign-memory-query-actions.ts

File gmflow probabili:

* src/lib/actions/campaign-memory-query-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-089f6f1-007] OTHER: mission-actions.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/mission-actions.ts` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/actions/mission-actions.ts

File gmflow probabili:

* src/lib/actions/mission-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-089f6f1-008] OTHER: campaign-memory-indexer.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/campaign-memory-indexer.ts` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/campaign-memory-indexer.ts

File gmflow probabili:

* src/lib/campaign-memory-indexer.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-089f6f1-009] OTHER: campaign-memory-markdown-export.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/campaign-memory-markdown-export.ts` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/campaign-memory-markdown-export.ts

File gmflow probabili:

* src/lib/campaign-memory-markdown-export.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-089f6f1-019] OTHER: database.types.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/types/database.types.ts` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/types/database.types.ts

File gmflow probabili:

* src/types/database.types.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-089f6f1-020] DATABASE: 20260701120000_campaign_memory_missions_and_campaign.sql (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
DATABASE

Priorità per gmflow:
Alta

Descrizione:

* File `supabase/migrations/20260701120000_campaign_memory_missions_and_campaign.sql` aggiunto nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Schema o migrazione DB — valutare impatto RLS e tenant isolation.

Adattamenti necessari:

* Multi-tenant
* sicurezza

File B&D coinvolti:

* supabase/migrations/20260701120000_campaign_memory_missions_and_campaign.sql

File gmflow probabili:

* supabase/migrations/20260701120000_campaign_memory_missions_and_campaign.sql

Rischi:

* Classificazione automatica non verificata
* Impatto RLS / isolamento tenant

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* RLS/policy verificate per multi-tenant

### [BD-GMFLOW-10b04a7-003] OTHER: campaign-memory-export-actions.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/campaign-memory-export-actions.ts` modificato nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/actions/campaign-memory-export-actions.ts

File gmflow probabili:

* src/lib/actions/campaign-memory-export-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-10b04a7-004] OTHER: campaign-memory-query-actions.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/campaign-memory-query-actions.ts` modificato nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/actions/campaign-memory-query-actions.ts

File gmflow probabili:

* src/lib/actions/campaign-memory-query-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-10b04a7-005] AI: campaign-text-generator.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/campaign-text-generator.ts` aggiunto nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/campaign-text-generator.ts

File gmflow probabili:

* src/lib/ai/campaign-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-006] AI: mission-text-generator.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/mission-text-generator.ts` aggiunto nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/mission-text-generator.ts

File gmflow probabili:

* src/lib/ai/mission-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-007] OTHER: campaign-memory-errors.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/campaign-memory-errors.ts` aggiunto nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/campaign-memory-errors.ts

File gmflow probabili:

* src/lib/campaign-memory-errors.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a086f7-001] CAMPAIGNS: character-actions.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/character-actions.ts` modificato nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/character-actions.ts

File gmflow probabili:

* src/app/campaigns/character-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a086f7-004] AI: sheet-generator-embed.tsx (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/sheet-generator/sheet-generator-embed.tsx` aggiunto nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/sheet-generator/sheet-generator-embed.tsx

File gmflow probabili:

* src/components/sheet-generator/sheet-generator-embed.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-005] AI: character-text-generator.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/character-text-generator.ts` aggiunto nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/character-text-generator.ts

File gmflow probabili:

* src/lib/ai/character-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-006] AI: generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/generator.ts` modificato nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/generator.ts

File gmflow probabili:

* src/lib/ai/generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-007] AI: mission-text-generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/mission-text-generator.ts` modificato nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/mission-text-generator.ts

File gmflow probabili:

* src/lib/ai/mission-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-008] AI: campaign-context-prompt.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/campaign-context-prompt.ts` aggiunto nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/campaign-context-prompt.ts

File gmflow probabili:

* src/lib/campaign-context-prompt.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-003] AI: session-close-text-generator.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/session-close-text-generator.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/session-close-text-generator.ts

File gmflow probabili:

* src/lib/ai/session-close-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-004] AI: session-text-generator.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/session-text-generator.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/session-text-generator.ts

File gmflow probabili:

* src/lib/ai/session-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-005] WIKI: entity-reference-parser.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/wiki/entity-reference-parser.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/lib/wiki/entity-reference-parser.ts

File gmflow probabili:

* src/lib/wiki/entity-reference-parser.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e2bcbd3-001] CAMPAIGNS: route.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/api/campaigns/[campaignId]/character-sheets-zip/route.ts` modificato nel commit «feat(characters): export all campaign sheet PDFs as a single ZIP.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/api/campaigns/[campaignId]/character-sheets-zip/route.ts

File gmflow probabili:

* src/app/api/campaigns/[campaignId]/character-sheets-zip/route.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e2bcbd3-002] UI_UX: characters-section.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/characters/characters-section.tsx` modificato nel commit «feat(characters): export all campaign sheet PDFs as a single ZIP.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/characters/characters-section.tsx

File gmflow probabili:

* src/components/characters/characters-section.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e2bcbd3-003] UI_UX: download-campaign-sheets-button.tsx (rinominato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/characters/download-campaign-sheets-button.tsx` rinominato nel commit «feat(characters): export all campaign sheet PDFs as a single ZIP.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/characters/download-campaign-sheets-button.tsx

File gmflow probabili:

* src/components/characters/download-campaign-sheets-button.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e2bcbd3-005] AUTH: campaign-sheet-export-auth.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AUTH

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/character-sheets/campaign-sheet-export-auth.ts` aggiunto nel commit «feat(characters): export all campaign sheet PDFs as a single ZIP.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Autenticazione/permessi — critico per sicurezza multi-tenant.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/lib/character-sheets/campaign-sheet-export-auth.ts

File gmflow probabili:

* src/lib/character-sheets/campaign-sheet-export-auth.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-6fa90f2-005] WIKI: wiki-text-chat.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/wiki-text-chat.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/lib/actions/wiki-text-chat.ts

File gmflow probabili:

* src/lib/actions/wiki-text-chat.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-c983095-005] WIKI: wiki-text-chat.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/wiki-text-chat.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/lib/actions/wiki-text-chat.ts

File gmflow probabili:

* src/lib/actions/wiki-text-chat.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a4d59a-001] UI_UX: create-character-dialog.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/characters/create-character-dialog.tsx` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/characters/create-character-dialog.tsx

File gmflow probabili:

* src/components/characters/create-character-dialog.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a4d59a-006] UI_UX: create-campaign-dialog.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/create-campaign-dialog.tsx` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/create-campaign-dialog.tsx

File gmflow probabili:

* src/components/create-campaign-dialog.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a4d59a-007] UI_UX: mission-board.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/missions/mission-board.tsx` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/missions/mission-board.tsx

File gmflow probabili:

* src/components/missions/mission-board.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a4d59a-009] UI_UX: scene-editor-client.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-client.tsx` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-client.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a4d59a-010] WIKI: create-entity-dialog.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/components/wiki/create-entity-dialog.tsx` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/wiki/create-entity-dialog.tsx

File gmflow probabili:

* src/components/wiki/create-entity-dialog.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a4d59a-012] WIKI: wiki-text-chat.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/wiki-text-chat.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/lib/actions/wiki-text-chat.ts

File gmflow probabili:

* src/lib/actions/wiki-text-chat.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a4d59a-013] AI: campaign-text-generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/campaign-text-generator.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/campaign-text-generator.ts

File gmflow probabili:

* src/lib/ai/campaign-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-014] AI: character-text-generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/character-text-generator.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/character-text-generator.ts

File gmflow probabili:

* src/lib/ai/character-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-015] AI: contextual-names.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/contextual-names.ts` aggiunto nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/contextual-names.ts

File gmflow probabili:

* src/lib/ai/contextual-names.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-016] AI: mission-text-generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/mission-text-generator.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/mission-text-generator.ts

File gmflow probabili:

* src/lib/ai/mission-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-017] AI: wiki-text-generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/wiki-text-generator.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/wiki-text-generator.ts

File gmflow probabili:

* src/lib/ai/wiki-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-240d27c-001] OTHER: page.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/app/page.tsx` modificato nel commit «feat(home): refresh live-play copy and logged-in carousel links». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/app/page.tsx

File gmflow probabili:

* src/app/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-240d27c-002] UI_UX: campaign-mini-carousel-client.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/home/campaign-mini-carousel-client.tsx` modificato nel commit «feat(home): refresh live-play copy and logged-in carousel links». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/home/campaign-mini-carousel-client.tsx

File gmflow probabili:

* src/components/home/campaign-mini-carousel-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-240d27c-003] UI_UX: campaign-mini-carousel.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/home/campaign-mini-carousel.tsx` modificato nel commit «feat(home): refresh live-play copy and logged-in carousel links». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/home/campaign-mini-carousel.tsx

File gmflow probabili:

* src/components/home/campaign-mini-carousel.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-240d27c-004] UI_UX: navbar-nav-links.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/navbar-nav-links.tsx` modificato nel commit «feat(home): refresh live-play copy and logged-in carousel links». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/navbar-nav-links.tsx

File gmflow probabili:

* src/components/navbar-nav-links.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-a4a0545-003] AI: ai-generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/actions/ai-generator.ts` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/actions/ai-generator.ts

File gmflow probabili:

* src/lib/actions/ai-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-a4a0545-004] AI: campaign-text-generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/campaign-text-generator.ts` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/campaign-text-generator.ts

File gmflow probabili:

* src/lib/ai/campaign-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-cd6c725-001] AI: json-extract.test.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/__tests__/json-extract.test.ts` aggiunto nel commit «fix(ai): harden campaign draft JSON parsing and OpenRouter json mode». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/__tests__/json-extract.test.ts

File gmflow probabili:

* src/lib/ai/__tests__/json-extract.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-cd6c725-002] AI: campaign-text-generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/campaign-text-generator.ts` modificato nel commit «fix(ai): harden campaign draft JSON parsing and OpenRouter json mode». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/campaign-text-generator.ts

File gmflow probabili:

* src/lib/ai/campaign-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-cd6c725-004] AI: openrouter-client.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/openrouter-client.ts` modificato nel commit «fix(ai): harden campaign draft JSON parsing and OpenRouter json mode». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/openrouter-client.ts

File gmflow probabili:

* src/lib/ai/openrouter-client.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-8133bf5-001] WIKI: wiki-image-chat.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/wiki-image-chat.ts` modificato nel commit «fix(ai): reduce OpenRouter HTTP 400 on image generation and save». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/lib/actions/wiki-image-chat.ts

File gmflow probabili:

* src/lib/actions/wiki-image-chat.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-8133bf5-002] AI: openrouter-image-request.test.ts (aggiunto)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/__tests__/openrouter-image-request.test.ts` aggiunto nel commit «fix(ai): reduce OpenRouter HTTP 400 on image generation and save». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/__tests__/openrouter-image-request.test.ts

File gmflow probabili:

* src/lib/ai/__tests__/openrouter-image-request.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-8133bf5-003] AI: image-reference-fetch.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/image-reference-fetch.ts` modificato nel commit «fix(ai): reduce OpenRouter HTTP 400 on image generation and save». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/image-reference-fetch.ts

File gmflow probabili:

* src/lib/ai/image-reference-fetch.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-8133bf5-005] AI: openrouter-provider.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/image-benchmark/providers/openrouter-provider.ts` modificato nel commit «fix(ai): reduce OpenRouter HTTP 400 on image generation and save». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/image-benchmark/providers/openrouter-provider.ts

File gmflow probabili:

* src/lib/image-benchmark/providers/openrouter-provider.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-003] WIKI: wiki-text-chat.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/wiki-text-chat.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/lib/actions/wiki-text-chat.ts

File gmflow probabili:

* src/lib/actions/wiki-text-chat.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d3a640b-004] AI: contextual-names.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/contextual-names.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/contextual-names.ts

File gmflow probabili:

* src/lib/ai/contextual-names.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-005] AI: wiki-npc-params.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/wiki-npc-params.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/wiki-npc-params.ts

File gmflow probabili:

* src/lib/ai/wiki-npc-params.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-006] AI: wiki-text-generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/wiki-text-generator.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/wiki-text-generator.ts

File gmflow probabili:

* src/lib/ai/wiki-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-007] AI: campaign-wiki-ai-memory.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/campaign-wiki-ai-memory.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/campaign-wiki-ai-memory.ts

File gmflow probabili:

* src/lib/campaign-wiki-ai-memory.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-003] WIKI: wiki-text-chat.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/wiki-text-chat.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/lib/actions/wiki-text-chat.ts

File gmflow probabili:

* src/lib/actions/wiki-text-chat.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0d6345e-004] AI: contextual-names.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/contextual-names.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/contextual-names.ts

File gmflow probabili:

* src/lib/ai/contextual-names.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-005] AI: wiki-npc-params.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/wiki-npc-params.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/wiki-npc-params.ts

File gmflow probabili:

* src/lib/ai/wiki-npc-params.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-006] AI: wiki-text-generator.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/wiki-text-generator.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/wiki-text-generator.ts

File gmflow probabili:

* src/lib/ai/wiki-text-generator.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-007] AI: campaign-wiki-ai-memory.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/campaign-wiki-ai-memory.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/campaign-wiki-ai-memory.ts

File gmflow probabili:

* src/lib/campaign-wiki-ai-memory.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-12b3a10-002] CAMPAIGNS: page.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/[id]/wiki/[entityId]/page.tsx` modificato nel commit «feat(gm): add regia immagini projection and wiki related links». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/[id]/wiki/[entityId]/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/wiki/[entityId]/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-648cf37-001] OTHER: layout.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/app/layout.tsx` modificato nel commit «Aggiorna la meta description del sito con messaggio community Napoli.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/app/layout.tsx

File gmflow probabili:

* src/app/layout.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-7ed15be-001] WIKI: create-entity-dialog.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/components/wiki/create-entity-dialog.tsx` modificato nel commit «feat(wiki): add NPC class select with PHB and enemy class options». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/wiki/create-entity-dialog.tsx

File gmflow probabili:

* src/components/wiki/create-entity-dialog.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-7ed15be-002] WIKI: edit-entity-dialog.tsx (modificato)

Stato:
NEEDS_REVIEW

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/components/wiki/edit-entity-dialog.tsx` modificato nel commit «feat(wiki): add NPC class select with PHB and enemy class options». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/wiki/edit-entity-dialog.tsx

File gmflow probabili:

* src/components/wiki/edit-entity-dialog.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-7ed15be-003] AI: wiki-npc-ai-options.ts (modificato)

Stato:
NEEDS_REVIEW

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/wiki-npc-ai-options.ts` modificato nel commit «feat(wiki): add NPC class select with PHB and enemy class options». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/wiki-npc-ai-options.ts

File gmflow probabili:

* src/lib/wiki-npc-ai-options.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-28fe02c-001] OTHER: update-gmflow-export-ledger.mjs (modificato)

Stato:
NEEDS_REVIEW

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `scripts/gmflow-export/update-gmflow-export-ledger.mjs` modificato nel commit «chore(gmflow): add July export packages and ledger-only sync script». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* scripts/gmflow-export/update-gmflow-export-ledger.mjs

File gmflow probabili:

* src/scripts/gmflow-export/update-gmflow-export-ledger.mjs

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

## Modifiche revisionate manualmente

### [BD-GMFLOW-PKG-2026-07-06-001] Package: Funzionalità e bugfix luglio 2026

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Alta

Descrizione:

* Map fixes, AI hardening OpenRouter, name generator, wiki board, bestiary fix, PDF ZIP, regia immagini.

Perché potrebbe servire a gmflow:

* Bugfix critici + feature GM incrementali post-giugno.

Adattamenti necessari:

* Storage R2
* Multi-tenant
* i18n name pools

File B&D coinvolti:

* docs/gmflow-export-packages/2026-07-06-features-bugfixes-export.md

File gmflow probabili:

* docs/imports/gmflow-export-packages/2026-07-06-features-bugfixes-export.md

Rischi:

* Overlap con package map Rev 4
* Non importare homepage copy

Decisioni richieste:

* —

Criterio di import completato:

* Checklist test package
* Map FoW sync verificato

### [BD-GMFLOW-PKG-2026-07-06-CC] Package: Command Center (GM Workspace + AI Control Plane)

Stato:
TO_IMPORT

Categoria:
GM_SCREEN

Priorità per gmflow:
Alta

Descrizione:

* Modulo Command Center Fasi 0-6: Action Registry, AI proposte confermate, voice, workspace GM.

Perché potrebbe servire a gmflow:

* Assistente GM unificato SaaS — alto valore differenziante.

Adattamenti necessari:

* Multi-tenant
* workspace_id NOT NULL
* TenantAdapter
* RLS gmflow-native
* Billing AI

File B&D coinvolti:

* docs/gmflow-export-packages/2026-07-06-command-center-export.md

File gmflow probabili:

* docs/imports/gmflow-export-packages/2026-07-06-command-center-export.md

Rischi:

* Modulo grande
* Non importare RLS B&D
* barber-dragons.adapter da riscrivere

Decisioni richieste:

* command_notes vs gm_notes UX
* Guild GM vs org workspace scope

Criterio di import completato:

* npm run test:command-center
* Proposte AI con conferma funzionanti
* Zero CREATE POLICY B&D

### [BD-GMFLOW-PKG-2026-06-28-001] Package: Nuove funzioni e bugfix (no RLS, no grafica)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Alta

Descrizione:

* Export consolidato: AI refinement, full-body framing, sheet generator, bestiary parser, union auto-walls, auth app-layer. Esclusi RLS e modifiche grafiche.

Perché potrebbe servire a gmflow:

* Porta miglioramenti funzionali post-giugno 2026 senza policy RLS B&D né restyling.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* RLS gmflow-native

File B&D coinvolti:

* docs/gmflow-export-packages/2026-06-28-features-bugfixes-export.md

File gmflow probabili:

* docs/imports/bd-gmflow-export-packages/2026-06-28-features-bugfixes-export.md

Rischi:

* Non importare RLS B&D
* Auth guild potrebbe divergere da modello gmflow

Decisioni richieste:

* GM cross-campaign: globale o per-org in gmflow?

Criterio di import completato:

* Package importato e voci figlie a IMPORTED/PARTIALLY_IMPORTED
* Zero CREATE POLICY da B&D
* Test checklist superata

### [BD-GMFLOW-041d96c-001] WIKI: create-entity-dialog.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/components/wiki/create-entity-dialog.tsx` modificato nel commit «feat(wiki): add prompt-based iterative image refinement after first generation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/wiki/create-entity-dialog.tsx

File gmflow probabili:

* src/components/wiki/create-entity-dialog.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-041d96c-002] WIKI: edit-entity-dialog.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/components/wiki/edit-entity-dialog.tsx` modificato nel commit «feat(wiki): add prompt-based iterative image refinement after first generation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/wiki/edit-entity-dialog.tsx

File gmflow probabili:

* src/components/wiki/edit-entity-dialog.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-041d96c-004] WIKI: wiki-image-chat.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/wiki-image-chat.ts` aggiunto nel commit «feat(wiki): add prompt-based iterative image refinement after first generation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/lib/actions/wiki-image-chat.ts

File gmflow probabili:

* src/lib/actions/wiki-image-chat.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-041d96c-005] AI: image-refine-prompt.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/__tests__/image-refine-prompt.test.ts` aggiunto nel commit «feat(wiki): add prompt-based iterative image refinement after first generation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/__tests__/image-refine-prompt.test.ts

File gmflow probabili:

* src/lib/ai/__tests__/image-refine-prompt.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-041d96c-006] AI: image-provider.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/image-provider.ts` modificato nel commit «feat(wiki): add prompt-based iterative image refinement after first generation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/image-provider.ts

File gmflow probabili:

* src/lib/ai/image-provider.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-041d96c-007] AI: image-reference-fetch.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/image-reference-fetch.ts` aggiunto nel commit «feat(wiki): add prompt-based iterative image refinement after first generation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/image-reference-fetch.ts

File gmflow probabili:

* src/lib/ai/image-reference-fetch.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-041d96c-008] AI: image-refine-prompt.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/image-refine-prompt.ts` aggiunto nel commit «feat(wiki): add prompt-based iterative image refinement after first generation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/image-refine-prompt.ts

File gmflow probabili:

* src/lib/ai/image-refine-prompt.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-041d96c-009] AI: openrouter-provider.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/image-benchmark/providers/openrouter-provider.ts` modificato nel commit «feat(wiki): add prompt-based iterative image refinement after first generation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/image-benchmark/providers/openrouter-provider.ts

File gmflow probabili:

* src/lib/image-benchmark/providers/openrouter-provider.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-041d96c-010] OTHER: types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/image-benchmark/types.ts` modificato nel commit «feat(wiki): add prompt-based iterative image refinement after first generation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/image-benchmark/types.ts

File gmflow probabili:

* src/lib/image-benchmark/types.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-82f09ac-001] WIKI: create-entity-dialog.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/components/wiki/create-entity-dialog.tsx` modificato nel commit «fix(wiki): persist AI portrait preset when creating wiki entities». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/wiki/create-entity-dialog.tsx

File gmflow probabili:

* src/components/wiki/create-entity-dialog.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-82f09ac-002] OTHER: image-url.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/image-url.ts` modificato nel commit «fix(wiki): persist AI portrait preset when creating wiki entities». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/image-url.ts

File gmflow probabili:

* src/lib/image-url.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-688720b-001] AI: skill-expertise-ac.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/sheet-generator/__tests__/skill-expertise-ac.test.ts` aggiunto nel commit «feat(sheet-generator): add expertise, bard skills, and realistic AC rules». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/sheet-generator/__tests__/skill-expertise-ac.test.ts

File gmflow probabili:

* src/lib/sheet-generator/__tests__/skill-expertise-ac.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-688720b-002] AI: armor-class.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/sheet-generator/armor-class.ts` modificato nel commit «feat(sheet-generator): add expertise, bard skills, and realistic AC rules». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/sheet-generator/armor-class.ts

File gmflow probabili:

* src/lib/sheet-generator/armor-class.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-688720b-003] AI: build-choices-client.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/sheet-generator/build-choices-client.ts` modificato nel commit «feat(sheet-generator): add expertise, bard skills, and realistic AC rules». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/sheet-generator/build-choices-client.ts

File gmflow probabili:

* src/lib/sheet-generator/build-choices-client.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-688720b-004] AI: build-choices-types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/sheet-generator/build-choices-types.ts` modificato nel commit «feat(sheet-generator): add expertise, bard skills, and realistic AC rules». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/sheet-generator/build-choices-types.ts

File gmflow probabili:

* src/lib/sheet-generator/build-choices-types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-688720b-005] AI: build-choices.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/sheet-generator/build-choices.ts` modificato nel commit «feat(sheet-generator): add expertise, bard skills, and realistic AC rules». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/sheet-generator/build-choices.ts

File gmflow probabili:

* src/lib/sheet-generator/build-choices.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-688720b-006] AI: build-engine.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/sheet-generator/build-engine.ts` modificato nel commit «feat(sheet-generator): add expertise, bard skills, and realistic AC rules». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/sheet-generator/build-engine.ts

File gmflow probabili:

* src/lib/sheet-generator/build-engine.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-688720b-007] AI: skill-rules.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/sheet-generator/skill-rules.ts` aggiunto nel commit «feat(sheet-generator): add expertise, bard skills, and realistic AC rules». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/sheet-generator/skill-rules.ts

File gmflow probabili:

* src/lib/sheet-generator/skill-rules.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-fef9b75-001] WIKI: wiki-bestiary-search-actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/actions/wiki-bestiary-search-actions.ts` modificato nel commit «feat(wiki): list individual statblocks from multi-creature bestiary chunks». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/lib/actions/wiki-bestiary-search-actions.ts

File gmflow probabili:

* src/lib/actions/wiki-bestiary-search-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-fef9b75-002] OTHER: bestiary-statblock-parser.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/manuals/__tests__/bestiary-statblock-parser.test.ts` aggiunto nel commit «feat(wiki): list individual statblocks from multi-creature bestiary chunks». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/manuals/__tests__/bestiary-statblock-parser.test.ts

File gmflow probabili:

* src/lib/manuals/__tests__/bestiary-statblock-parser.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-fef9b75-003] OTHER: bestiary-statblock-parser.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/manuals/bestiary-statblock-parser.ts` aggiunto nel commit «feat(wiki): list individual statblocks from multi-creature bestiary chunks». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/manuals/bestiary-statblock-parser.ts

File gmflow probabili:

* src/lib/manuals/bestiary-statblock-parser.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-007] CAMPAIGNS: scene-document-actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/scene-document-actions.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/scene-document-actions.ts

File gmflow probabili:

* src/app/campaigns/scene-document-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-034] OTHER: floor-raster.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/raster-export/floor-raster.ts` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/raster-export/floor-raster.ts

File gmflow probabili:

* src/lib/map-core/raster-export/floor-raster.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-049] DATABASE: 20260628120000_scene_documents_and_map_source.sql (aggiunto)

Stato:
TO_IMPORT

Categoria:
DATABASE

Priorità per gmflow:
Alta

Descrizione:

* File `supabase/migrations/20260628120000_scene_documents_and_map_source.sql` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Schema o migrazione DB — valutare impatto RLS e tenant isolation.

Adattamenti necessari:

* Multi-tenant
* sicurezza

File B&D coinvolti:

* supabase/migrations/20260628120000_scene_documents_and_map_source.sql

File gmflow probabili:

* supabase/migrations/20260628120000_scene_documents_and_map_source.sql

Rischi:

* Classificazione automatica non verificata
* Impatto RLS / isolamento tenant

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* RLS/policy verificate per multi-tenant

### [BD-GMFLOW-c75aa38-001] CAMPAIGNS: character-actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/character-actions.ts` modificato nel commit «fix(authz): restore guild-wide GM access to all campaigns.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/character-actions.ts

File gmflow probabili:

* src/app/campaigns/character-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-3cf1907-002] CAMPAIGNS: scene-document-actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/scene-document-actions.ts` modificato nel commit «fix(maps): sync Scene Editor scenes to Esplorazione e FoW on create.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/scene-document-actions.ts

File gmflow probabili:

* src/app/campaigns/scene-document-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-3cf1907-005] OTHER: floor-raster.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/raster-export/floor-raster.ts` modificato nel commit «fix(maps): sync Scene Editor scenes to Esplorazione e FoW on create.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/raster-export/floor-raster.ts

File gmflow probabili:

* src/lib/map-core/raster-export/floor-raster.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f9bcd77-001] CAMPAIGNS: scene-document-actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/scene-document-actions.ts` modificato nel commit «fix(maps): upload full Scene Editor rasters from FormData on save.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/scene-document-actions.ts

File gmflow probabili:

* src/app/campaigns/scene-document-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f9bcd77-003] MEDIA_STORAGE: exploration-map-upload-core.ts (modificato)

Stato:
TO_IMPORT

Categoria:
MEDIA_STORAGE

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/exploration/exploration-map-upload-core.ts` modificato nel commit «fix(maps): upload full Scene Editor rasters from FormData on save.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Upload/storage media — adattare a R2 o storage gmflow.

Adattamenti necessari:

* Storage R2

File B&D coinvolti:

* src/lib/exploration/exploration-map-upload-core.ts

File gmflow probabili:

* src/lib/exploration/exploration-map-upload-core.ts

Rischi:

* Classificazione automatica non verificata
* Divergenza storage B&D (Telegram) vs gmflow (R2)

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Quale adapter storage usare in gmflow?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f9bcd77-005] OTHER: floor-raster.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/raster-export/floor-raster.ts` modificato nel commit «fix(maps): upload full Scene Editor rasters from FormData on save.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/raster-export/floor-raster.ts

File gmflow probabili:

* src/lib/map-core/raster-export/floor-raster.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-003] OTHER: command-center-export.md (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/command-center-export.md` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/command-center-export.md

File gmflow probabili:

* docs/imports/command-center-export.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-004] OTHER: command-center-vision.md (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/command-center-vision.md` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/command-center-vision.md

File gmflow probabili:

* docs/imports/command-center-vision.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-005] OTHER: layout.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/app/command-center/layout.tsx` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/app/command-center/layout.tsx

File gmflow probabili:

* src/app/command-center/layout.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-006] OTHER: page.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/app/command-center/page.tsx` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/app/command-center/page.tsx

File gmflow probabili:

* src/app/command-center/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-008] UI_UX: command-center-client.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/command-center-client.tsx` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/command-center-client.tsx

File gmflow probabili:

* src/components/command-center/command-center-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-013] OTHER: barber-dragons.adapter.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/adapters/barber-dragons.adapter.ts` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/adapters/barber-dragons.adapter.ts

File gmflow probabili:

* src/modules/command-center/adapters/barber-dragons.adapter.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-014] OTHER: index.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/adapters/index.ts` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/adapters/index.ts

File gmflow probabili:

* src/modules/command-center/adapters/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-015] OTHER: types.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/adapters/types.ts` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/adapters/types.ts

File gmflow probabili:

* src/modules/command-center/adapters/types.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-016] OTHER: index.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/index.ts` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/index.ts

File gmflow probabili:

* src/modules/command-center/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-017] OTHER: actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/server/actions.ts` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/server/actions.ts

File gmflow probabili:

* src/modules/command-center/server/actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-018] OTHER: entities.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/types/entities.ts` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/types/entities.ts

File gmflow probabili:

* src/modules/command-center/types/entities.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-019] OTHER: index.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/types/index.ts` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/types/index.ts

File gmflow probabili:

* src/modules/command-center/types/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-09a5000-020] OTHER: workspace.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/types/workspace.ts` aggiunto nel commit «feat(command-center): add Phase 1 GM workspace and inbox.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/types/workspace.ts

File gmflow probabili:

* src/modules/command-center/types/workspace.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-002] OTHER: command-center-export.md (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/command-center-export.md` modificato nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/command-center-export.md

File gmflow probabili:

* docs/imports/command-center-export.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-003] OTHER: command-center-vision.md (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/command-center-vision.md` modificato nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/command-center-vision.md

File gmflow probabili:

* docs/imports/command-center-vision.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-005] OTHER: page.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/app/command-center/page.tsx` modificato nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/app/command-center/page.tsx

File gmflow probabili:

* src/app/command-center/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-006] UI_UX: audit-timeline.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/audit-timeline.tsx` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/audit-timeline.tsx

File gmflow probabili:

* src/components/command-center/audit-timeline.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-007] UI_UX: command-center-client.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/command-center-client.tsx` modificato nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/command-center-client.tsx

File gmflow probabili:

* src/components/command-center/command-center-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-008] OTHER: registry.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/__tests__/registry.test.ts` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/__tests__/registry.test.ts

File gmflow probabili:

* src/modules/command-center/actions/__tests__/registry.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-009] OTHER: audit.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/audit.ts` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/audit.ts

File gmflow probabili:

* src/modules/command-center/actions/audit.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-010] OTHER: workspace.actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/workspace.actions.ts` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/workspace.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/workspace.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-011] OTHER: gm-note.actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/gm-note.actions.ts` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/gm-note.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/gm-note.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-012] OTHER: session.actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/session.actions.ts` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/session.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/session.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-013] WIKI: wiki.actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-014] OTHER: index.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/index.ts` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/index.ts

File gmflow probabili:

* src/modules/command-center/actions/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-015] OTHER: register-all.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/register-all.ts` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/register-all.ts

File gmflow probabili:

* src/modules/command-center/actions/register-all.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-016] OTHER: registry.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/registry.ts` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/registry.ts

File gmflow probabili:

* src/modules/command-center/actions/registry.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-017] OTHER: index.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/index.ts` modificato nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/index.ts

File gmflow probabili:

* src/modules/command-center/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-018] OTHER: actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/server/actions.ts` modificato nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/server/actions.ts

File gmflow probabili:

* src/modules/command-center/server/actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-019] OTHER: actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/types/actions.ts` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/types/actions.ts

File gmflow probabili:

* src/modules/command-center/types/actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-020] OTHER: audit.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/types/audit.ts` aggiunto nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/types/audit.ts

File gmflow probabili:

* src/modules/command-center/types/audit.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-d00079b-021] OTHER: index.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/types/index.ts` modificato nel commit «feat(command-center): add Action Registry and audit log (Phase 2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/types/index.ts

File gmflow probabili:

* src/modules/command-center/types/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f17432f-004] OTHER: page.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/app/command-center/page.tsx` modificato nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/app/command-center/page.tsx

File gmflow probabili:

* src/app/command-center/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f17432f-005] AI: ai-assistant-panel.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` aggiunto nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-f17432f-006] AI: ai-proposal-panel.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-proposal-panel.tsx` aggiunto nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-proposal-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-proposal-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-f17432f-007] UI_UX: command-center-client.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/command-center-client.tsx` modificato nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/command-center-client.tsx

File gmflow probabili:

* src/components/command-center/command-center-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f17432f-008] AI: interpreter.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/interpreter.test.ts` aggiunto nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/interpreter.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/interpreter.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-f17432f-009] AI: autonomy.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/autonomy.ts` aggiunto nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/autonomy.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/autonomy.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-f17432f-010] AI: context-resolver.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/context-resolver.ts` aggiunto nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/context-resolver.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/context-resolver.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-f17432f-011] AI: draft-assistant.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.ts` aggiunto nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-f17432f-012] AI: interpreter.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/interpreter.ts` aggiunto nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-f17432f-013] AI: proposal-builder.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/proposal-builder.ts` aggiunto nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-f17432f-014] OTHER: actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/server/actions.ts` modificato nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/server/actions.ts

File gmflow probabili:

* src/modules/command-center/server/actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-f17432f-015] AI: ai-proposal.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/types/ai-proposal.ts` aggiunto nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/types/ai-proposal.ts

File gmflow probabili:

* src/modules/command-center/types/ai-proposal.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-f17432f-016] OTHER: index.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/types/index.ts` modificato nel commit «feat(command-center): add AI Draft Mode (Phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/types/index.ts

File gmflow probabili:

* src/modules/command-center/types/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-ef0984c-001] AI: ai-proposal-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-proposal-panel.tsx` modificato nel commit «fix(command-center): show AI proposal previews for workspace pages.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-proposal-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-proposal-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-ef0984c-002] OTHER: workspace.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/workspace.actions.ts` modificato nel commit «fix(command-center): show AI proposal previews for workspace pages.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/workspace.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/workspace.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-003] OTHER: command-center-vision.md (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/command-center-vision.md` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/command-center-vision.md

File gmflow probabili:

* docs/imports/command-center-vision.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-005] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1e31f94-006] AI: ai-proposal-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-proposal-panel.tsx` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-proposal-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-proposal-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1e31f94-007] UI_UX: audit-timeline.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/audit-timeline.tsx` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/audit-timeline.tsx

File gmflow probabili:

* src/components/command-center/audit-timeline.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-008] UI_UX: command-center-client.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/command-center-client.tsx` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/command-center-client.tsx

File gmflow probabili:

* src/components/command-center/command-center-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-009] UI_UX: voice-capture-button.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/voice-capture-button.tsx` aggiunto nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/voice-capture-button.tsx

File gmflow probabili:

* src/components/command-center/voice-capture-button.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-010] OTHER: registry.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/__tests__/registry.test.ts` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/__tests__/registry.test.ts

File gmflow probabili:

* src/modules/command-center/actions/__tests__/registry.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-011] AI: ai-proposal.actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/actions/definitions/ai-proposal.actions.ts` aggiunto nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/actions/definitions/ai-proposal.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/ai-proposal.actions.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1e31f94-012] OTHER: workspace.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/workspace.actions.ts` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/workspace.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/workspace.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-013] OTHER: register-all.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/register-all.ts` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/register-all.ts

File gmflow probabili:

* src/modules/command-center/actions/register-all.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-014] OTHER: registry.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/registry.ts` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/registry.ts

File gmflow probabili:

* src/modules/command-center/actions/registry.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-015] AI: interpreter.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/interpreter.test.ts` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/interpreter.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/interpreter.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1e31f94-016] AI: proposal-executor.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/proposal-executor.test.ts` aggiunto nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/proposal-executor.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/proposal-executor.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1e31f94-017] AI: autonomy.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/autonomy.ts` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/autonomy.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/autonomy.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1e31f94-018] AI: draft-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.ts` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1e31f94-019] AI: draft-assistant.types.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` aggiunto nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1e31f94-020] AI: proposal-executor.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/proposal-executor.ts` aggiunto nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/proposal-executor.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/proposal-executor.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1e31f94-021] OTHER: actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/server/actions.ts` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/server/actions.ts

File gmflow probabili:

* src/modules/command-center/server/actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-022] OTHER: actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/types/actions.ts` modificato nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/types/actions.ts

File gmflow probabili:

* src/modules/command-center/types/actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-023] OTHER: command-input-voice.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/voice/__tests__/command-input-voice.test.ts` aggiunto nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/voice/__tests__/command-input-voice.test.ts

File gmflow probabili:

* src/modules/command-center/voice/__tests__/command-input-voice.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-024] OTHER: command-input-voice.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/voice/command-input-voice.ts` aggiunto nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/voice/command-input-voice.ts

File gmflow probabili:

* src/modules/command-center/voice/command-input-voice.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1e31f94-025] OTHER: use-voice-dictation.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/voice/use-voice-dictation.ts` aggiunto nel commit «feat(command-center): add confirmed AI actions and voice input (Phases 4–5).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/voice/use-voice-dictation.ts

File gmflow probabili:

* src/modules/command-center/voice/use-voice-dictation.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-002] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a78de3-003] AI: ai-proposal-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-proposal-panel.tsx` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-proposal-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-proposal-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a78de3-004] UI_UX: audit-timeline.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/audit-timeline.tsx` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/audit-timeline.tsx

File gmflow probabili:

* src/components/command-center/audit-timeline.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-005] OTHER: action-catalog.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/__tests__/action-catalog.test.ts` aggiunto nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/__tests__/action-catalog.test.ts

File gmflow probabili:

* src/modules/command-center/actions/__tests__/action-catalog.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-006] OTHER: registry.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/__tests__/registry.test.ts` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/__tests__/registry.test.ts

File gmflow probabili:

* src/modules/command-center/actions/__tests__/registry.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-007] OTHER: action-catalog.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/action-catalog.ts` aggiunto nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/action-catalog.ts

File gmflow probabili:

* src/modules/command-center/actions/action-catalog.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-008] OTHER: command-input.actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/command-input.actions.ts` aggiunto nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/command-input.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/command-input.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-009] OTHER: memory.actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/memory.actions.ts` aggiunto nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/memory.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/memory.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-010] OTHER: campaign.actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/campaign.actions.ts` aggiunto nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/campaign.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/campaign.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-011] OTHER: character.actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/character.actions.ts` aggiunto nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/character.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/character.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-012] OTHER: mission.actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/mission.actions.ts` aggiunto nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/mission.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/mission.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-013] OTHER: session.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/session.actions.ts` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/session.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/session.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-014] WIKI: wiki.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-015] OTHER: register-all.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/register-all.ts` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/register-all.ts

File gmflow probabili:

* src/modules/command-center/actions/register-all.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a78de3-016] AI: interpreter.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/interpreter.test.ts` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/interpreter.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/interpreter.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a78de3-017] AI: proposal-executor.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/proposal-executor.test.ts` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/proposal-executor.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/proposal-executor.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a78de3-018] AI: interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/interpreter.ts` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a78de3-019] AI: proposal-executor.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/proposal-executor.ts` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/proposal-executor.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/proposal-executor.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a78de3-020] AI: ai-proposal.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/types/ai-proposal.ts` modificato nel commit «feat(command-center): extend Action Registry for campaign domain.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/types/ai-proposal.ts

File gmflow probabili:

* src/modules/command-center/types/ai-proposal.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0accbfa-001] UI_UX: audit-timeline.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/audit-timeline.tsx` modificato nel commit «fix(command-center): resolve Vercel build type errors.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/audit-timeline.tsx

File gmflow probabili:

* src/components/command-center/audit-timeline.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0accbfa-002] OTHER: character.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/character.actions.ts` modificato nel commit «fix(command-center): resolve Vercel build type errors.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/character.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/character.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-478d341-001] OTHER: page.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/app/command-center/page.tsx` modificato nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/app/command-center/page.tsx

File gmflow probabili:

* src/app/command-center/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-478d341-002] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-478d341-003] UI_UX: command-center-client.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/command-center-client.tsx` modificato nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/command-center-client.tsx

File gmflow probabili:

* src/components/command-center/command-center-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-478d341-004] AI: conversation-intent.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts` aggiunto nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-478d341-005] AI: chat-assistant.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` aggiunto nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-478d341-006] AI: conversation-intent.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/conversation-intent.ts` aggiunto nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-478d341-007] AI: draft-assistant.types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` modificato nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-478d341-008] AI: format-proposal-chat.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/format-proposal-chat.ts` aggiunto nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/format-proposal-chat.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/format-proposal-chat.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-478d341-009] AI: interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/interpreter.ts` modificato nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-478d341-010] AI: preview-proposals.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/preview-proposals.ts` aggiunto nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/preview-proposals.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/preview-proposals.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-478d341-011] AI: proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/proposal-builder.ts` modificato nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-478d341-012] AI: proposal-input.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/proposal-input.ts` aggiunto nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/proposal-input.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/proposal-input.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-478d341-013] OTHER: actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/server/actions.ts` modificato nel commit «feat(command-center): move AI proposals to conversational chat confirmation.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/server/actions.ts

File gmflow probabili:

* src/modules/command-center/server/actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-fd82d7b-001] OTHER: page.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/app/command-center/page.tsx` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/app/command-center/page.tsx

File gmflow probabili:

* src/app/command-center/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-fd82d7b-003] AI: ai-assistant-canvas.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-canvas.tsx` aggiunto nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-canvas.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-fd82d7b-004] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-fd82d7b-005] UI_UX: command-center-client.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/command-center-client.tsx` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/command-center-client.tsx

File gmflow probabili:

* src/components/command-center/command-center-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-fd82d7b-008] WIKI: wiki.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-fd82d7b-009] AI: conversation-intent.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-fd82d7b-010] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-fd82d7b-011] AI: conversation-intent.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/conversation-intent.ts` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-fd82d7b-012] AI: draft-assistant.types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-fd82d7b-013] AI: format-proposal-chat.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/format-proposal-chat.ts` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/format-proposal-chat.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/format-proposal-chat.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-fd82d7b-014] AI: interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/interpreter.ts` modificato nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-fd82d7b-015] AI: wiki-proposal-builder.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts` aggiunto nel commit «feat(command-center): wiki AI canvas layout and dashboard assistant link.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a5921c-001] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a5921c-002] UI_UX: audit-timeline.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/audit-timeline.tsx` modificato nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/audit-timeline.tsx

File gmflow probabili:

* src/components/command-center/audit-timeline.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a5921c-003] UI_UX: command-center-client.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/command-center-client.tsx` modificato nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/command-center-client.tsx

File gmflow probabili:

* src/components/command-center/command-center-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a5921c-006] OTHER: workspace.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/workspace.actions.ts` modificato nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/workspace.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/workspace.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a5921c-007] AI: wiki-request-detector.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts` aggiunto nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a5921c-008] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a5921c-009] AI: draft-assistant.types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` modificato nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a5921c-010] AI: wiki-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts` modificato nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a5921c-011] AI: wiki-request-detector.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-request-detector.ts` aggiunto nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a5921c-012] OTHER: actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/server/actions.ts` modificato nel commit «feat(command-center): wiki assistant fallback and workspace deletes.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/server/actions.ts

File gmflow probabili:

* src/modules/command-center/server/actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-089f6f1-003] AI: ai-assistant-canvas.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-canvas.tsx` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-canvas.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-089f6f1-010] AI: character-request-detector.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/character-request-detector.test.ts` aggiunto nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/character-request-detector.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/character-request-detector.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-089f6f1-011] AI: mission-request-detector.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/mission-request-detector.test.ts` aggiunto nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/mission-request-detector.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/mission-request-detector.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-089f6f1-012] AI: campaign-request-detector.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/campaign-request-detector.ts` aggiunto nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/campaign-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/campaign-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-089f6f1-013] AI: character-request-detector.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/character-request-detector.ts` aggiunto nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/character-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/character-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-089f6f1-014] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-089f6f1-015] AI: domain-fallback-interpreter.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts` aggiunto nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-089f6f1-016] AI: interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/interpreter.ts` modificato nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-089f6f1-017] AI: mission-request-detector.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/mission-request-detector.ts` aggiunto nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/mission-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/mission-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-089f6f1-018] AI: proposal-enricher.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/proposal-enricher.ts` aggiunto nel commit «feat(command-center): GM assistant phase 0 foundations.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/proposal-enricher.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/proposal-enricher.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-001] AI: ai-assistant-canvas.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-canvas.tsx` modificato nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-canvas.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-002] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-008] OTHER: campaign.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/campaign.actions.ts` modificato nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/campaign.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/campaign.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-10b04a7-009] AI: campaign-text-generator.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/campaign-text-generator.test.ts` aggiunto nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/campaign-text-generator.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/campaign-text-generator.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-010] AI: conversation-intent.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts` modificato nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-011] AI: mission-text-generator.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/mission-text-generator.test.ts` aggiunto nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/mission-text-generator.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/mission-text-generator.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-012] AI: campaign-proposal-builder.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts` aggiunto nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-013] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-014] AI: conversation-intent.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/conversation-intent.ts` modificato nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-015] AI: draft-assistant.types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` modificato nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-016] AI: interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/interpreter.ts` modificato nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-017] AI: mission-proposal-builder.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/mission-proposal-builder.ts` aggiunto nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/mission-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/mission-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-10b04a7-018] AI: proposal-enricher.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/proposal-enricher.ts` modificato nel commit «feat(command-center): AI campaign and mission proposals (phases 1–2).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/proposal-enricher.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/proposal-enricher.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-002] AI: ai-assistant-canvas.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-canvas.tsx` modificato nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-canvas.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-003] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-009] OTHER: character.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/character.actions.ts` modificato nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/character.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/character.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0a086f7-010] AI: character-text-generator.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/character-text-generator.test.ts` aggiunto nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/character-text-generator.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/character-text-generator.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-011] AI: conversation-intent.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts` modificato nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-012] AI: character-proposal-builder.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/character-proposal-builder.ts` aggiunto nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/character-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/character-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-013] AI: character-proposal-shared.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/character-proposal-shared.ts` aggiunto nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/character-proposal-shared.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/character-proposal-shared.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-014] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-015] AI: conversation-intent.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/conversation-intent.ts` modificato nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-016] AI: draft-assistant.types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` modificato nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0a086f7-017] AI: proposal-enricher.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/proposal-enricher.ts` modificato nel commit «feat(command-center): AI character proposals with embedded sheet generator (phase 3).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/proposal-enricher.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/proposal-enricher.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-001] AI: ai-assistant-canvas.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-canvas.tsx` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-canvas.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-002] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-006] OTHER: registry.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/__tests__/registry.test.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/__tests__/registry.test.ts

File gmflow probabili:

* src/modules/command-center/actions/__tests__/registry.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0dc3ba6-007] OTHER: action-catalog.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/action-catalog.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/action-catalog.ts

File gmflow probabili:

* src/modules/command-center/actions/action-catalog.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0dc3ba6-008] OTHER: session.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/session.actions.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/session.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/session.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0dc3ba6-009] WIKI: wiki-relationship.actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/wiki-relationship.actions.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/wiki-relationship.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/wiki-relationship.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0dc3ba6-010] OTHER: register-all.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/register-all.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/register-all.ts

File gmflow probabili:

* src/modules/command-center/actions/register-all.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-0dc3ba6-011] AI: conversation-intent.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-012] AI: relationship-request-detector.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/relationship-request-detector.test.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/relationship-request-detector.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/relationship-request-detector.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-013] AI: session-close-request-detector.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/session-close-request-detector.test.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/session-close-request-detector.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/session-close-request-detector.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-014] AI: session-close-text-generator.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/session-close-text-generator.test.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/session-close-text-generator.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/session-close-text-generator.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-015] AI: session-request-detector.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/session-request-detector.test.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/session-request-detector.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/session-request-detector.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-016] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-017] AI: conversation-intent.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/conversation-intent.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-018] AI: domain-fallback-interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-019] AI: draft-assistant.types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-020] AI: format-proposal-chat.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/format-proposal-chat.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/format-proposal-chat.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/format-proposal-chat.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-021] AI: proposal-input.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/proposal-input.ts` modificato nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/proposal-input.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/proposal-input.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-022] AI: relationship-proposal-builder.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/relationship-proposal-builder.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/relationship-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/relationship-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-023] AI: relationship-request-detector.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/relationship-request-detector.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/relationship-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/relationship-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-024] AI: session-close-proposal-builder.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/session-close-proposal-builder.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/session-close-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/session-close-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-025] AI: session-close-request-detector.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/session-close-request-detector.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/session-close-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/session-close-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-026] AI: session-close.types.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/session-close.types.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/session-close.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/session-close.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-027] AI: session-proposal-builder.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/session-proposal-builder.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/session-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/session-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0dc3ba6-028] AI: session-request-detector.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/session-request-detector.ts` aggiunto nel commit «feat(command-center): AI relationships, sessions, and session close (phases 4–6).». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/session-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/session-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-e2bcbd3-004] OTHER: build-sheets-zip.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/character-sheets/build-sheets-zip.ts` modificato nel commit «feat(characters): export all campaign sheet PDFs as a single ZIP.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/character-sheets/build-sheets-zip.ts

File gmflow probabili:

* src/lib/character-sheets/build-sheets-zip.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-6fa90f2-001] AI: ai-assistant-canvas.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-canvas.tsx` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-canvas.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-002] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-003] UI_UX: command-center-client.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/command-center-client.tsx` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/command-center-client.tsx

File gmflow probabili:

* src/components/command-center/command-center-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-6fa90f2-004] UI_UX: preview-selectable-text.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/preview-selectable-text.tsx` aggiunto nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/preview-selectable-text.tsx

File gmflow probabili:

* src/components/command-center/preview-selectable-text.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-6fa90f2-006] OTHER: action-catalog.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/action-catalog.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/action-catalog.ts

File gmflow probabili:

* src/modules/command-center/actions/action-catalog.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-6fa90f2-007] WIKI: wiki.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-6fa90f2-008] AI: preview-text-selection.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/preview-text-selection.test.ts` aggiunto nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/preview-text-selection.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/preview-text-selection.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-009] AI: wiki-request-detector.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-010] AI: campaign-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-011] AI: character-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/character-proposal-builder.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/character-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/character-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-012] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-013] AI: domain-fallback-interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-014] AI: draft-assistant.types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-015] AI: format-proposal-chat.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/format-proposal-chat.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/format-proposal-chat.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/format-proposal-chat.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-016] AI: interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/interpreter.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-017] AI: mission-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/mission-proposal-builder.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/mission-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/mission-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-018] AI: preview-text-selection.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/preview-text-selection.ts` aggiunto nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/preview-text-selection.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/preview-text-selection.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-019] AI: session-close-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/session-close-proposal-builder.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/session-close-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/session-close-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-020] AI: wiki-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-6fa90f2-021] AI: wiki-request-detector.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-request-detector.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-001] AI: ai-assistant-canvas.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-canvas.tsx` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-canvas.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-002] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-003] UI_UX: command-center-client.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/command-center-client.tsx` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/command-center-client.tsx

File gmflow probabili:

* src/components/command-center/command-center-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-c983095-004] UI_UX: preview-selectable-text.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/preview-selectable-text.tsx` aggiunto nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/preview-selectable-text.tsx

File gmflow probabili:

* src/components/command-center/preview-selectable-text.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-c983095-006] OTHER: action-catalog.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/action-catalog.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/action-catalog.ts

File gmflow probabili:

* src/modules/command-center/actions/action-catalog.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-c983095-007] WIKI: wiki.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/wiki.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-c983095-008] AI: preview-text-selection.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/preview-text-selection.test.ts` aggiunto nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/preview-text-selection.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/preview-text-selection.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-009] AI: wiki-request-detector.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-010] AI: campaign-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-011] AI: character-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/character-proposal-builder.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/character-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/character-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-012] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-013] AI: domain-fallback-interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-014] AI: draft-assistant.types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-015] AI: format-proposal-chat.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/format-proposal-chat.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/format-proposal-chat.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/format-proposal-chat.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-016] AI: interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/interpreter.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-017] AI: mission-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/mission-proposal-builder.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/mission-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/mission-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-018] AI: preview-text-selection.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/preview-text-selection.ts` aggiunto nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/preview-text-selection.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/preview-text-selection.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-019] AI: session-close-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/session-close-proposal-builder.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/session-close-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/session-close-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-020] AI: wiki-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-c983095-021] AI: wiki-request-detector.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-request-detector.ts` modificato nel commit «feat(command-center): modifica mirata anteprima e miglioramenti wiki AI». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-002] AI: ai-assistant-canvas.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-canvas.tsx` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-canvas.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-003] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-004] UI_UX: command-center-client.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/command-center-client.tsx` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/command-center-client.tsx

File gmflow probabili:

* src/components/command-center/command-center-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a4d59a-005] UI_UX: preview-selectable-text.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/preview-selectable-text.tsx` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/preview-selectable-text.tsx

File gmflow probabili:

* src/components/command-center/preview-selectable-text.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-1a4d59a-008] AI: name-generator-field.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/name-generator/name-generator-field.tsx` aggiunto nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/name-generator/name-generator-field.tsx

File gmflow probabili:

* src/components/name-generator/name-generator-field.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-011] AI: name-generator-actions.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/actions/name-generator-actions.ts` aggiunto nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/actions/name-generator-actions.ts

File gmflow probabili:

* src/lib/actions/name-generator-actions.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-018] AI: local-names.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/name-generator/__tests__/local-names.test.ts` aggiunto nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/name-generator/__tests__/local-names.test.ts

File gmflow probabili:

* src/lib/name-generator/__tests__/local-names.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-019] AI: local-names.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/name-generator/local-names.ts` aggiunto nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/name-generator/local-names.ts

File gmflow probabili:

* src/lib/name-generator/local-names.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-020] AI: types.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/name-generator/types.ts` aggiunto nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/name-generator/types.ts

File gmflow probabili:

* src/lib/name-generator/types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-021] AI: contextual-names.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/contextual-names.test.ts` aggiunto nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/contextual-names.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/contextual-names.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-022] AI: conversation-intent.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-023] AI: proposal-input.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/proposal-input.test.ts` aggiunto nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/proposal-input.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/proposal-input.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-024] AI: campaign-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-025] AI: character-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/character-proposal-builder.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/character-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/character-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-026] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-027] AI: conversation-intent.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/conversation-intent.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/conversation-intent.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-028] AI: domain-fallback-interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-029] AI: proposal-input.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/proposal-input.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/proposal-input.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/proposal-input.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-1a4d59a-030] AI: wiki-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts` modificato nel commit «feat(ai): add contextual name generator across create dialogs and command center». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-508bd44-001] UI_UX: audit-timeline.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/audit-timeline.tsx` modificato nel commit «feat(command-center): align workspace UI with assistant fluid shell». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/audit-timeline.tsx

File gmflow probabili:

* src/components/command-center/audit-timeline.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-508bd44-002] UI_UX: command-center-client.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/command-center/command-center-client.tsx` modificato nel commit «feat(command-center): align workspace UI with assistant fluid shell». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/command-center/command-center-client.tsx

File gmflow probabili:

* src/components/command-center/command-center-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-a4a0545-001] AI: ai-assistant-canvas.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-canvas.tsx` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-canvas.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-a4a0545-002] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-a4a0545-005] OTHER: campaign.actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/modules/command-center/actions/definitions/wrappers/campaign.actions.ts` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/modules/command-center/actions/definitions/wrappers/campaign.actions.ts

File gmflow probabili:

* src/modules/command-center/actions/definitions/wrappers/campaign.actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-a4a0545-006] AI: campaign-type-selection.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/campaign-type-selection.test.ts` aggiunto nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/campaign-type-selection.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/campaign-type-selection.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-a4a0545-007] AI: conversation-intent.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/conversation-intent.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-a4a0545-008] AI: campaign-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/campaign-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-a4a0545-009] AI: campaign-request-detector.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/campaign-request-detector.ts` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/campaign-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/campaign-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-a4a0545-010] AI: campaign-type-selection.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/campaign-type-selection.ts` aggiunto nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/campaign-type-selection.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/campaign-type-selection.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-a4a0545-011] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-a4a0545-012] AI: domain-fallback-interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-a4a0545-013] AI: draft-assistant.types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-a4a0545-014] AI: preview-text-selection.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/preview-text-selection.ts` modificato nel commit «feat(command-center): guided AI campaign create with type, description, and cover». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/preview-text-selection.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/preview-text-selection.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-cd6c725-003] AI: json-extract.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/json-extract.ts` aggiunto nel commit «fix(ai): harden campaign draft JSON parsing and OpenRouter json mode». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/json-extract.ts

File gmflow probabili:

* src/lib/ai/json-extract.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-cd6c725-005] AI: campaign-text-generator.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/campaign-text-generator.test.ts` modificato nel commit «fix(ai): harden campaign draft JSON parsing and OpenRouter json mode». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/campaign-text-generator.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/campaign-text-generator.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-cd6c725-006] AI: interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/interpreter.ts` modificato nel commit «fix(ai): harden campaign draft JSON parsing and OpenRouter json mode». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-8133bf5-004] AI: openrouter-image-request.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/lib/ai/openrouter-image-request.ts` aggiunto nel commit «fix(ai): reduce OpenRouter HTTP 400 on image generation and save». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/lib/ai/openrouter-image-request.ts

File gmflow probabili:

* src/lib/ai/openrouter-image-request.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-001] AI: ai-assistant-canvas.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-canvas.tsx` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-canvas.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-002] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-008] AI: wiki-npc-params.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/wiki-npc-params.test.ts` aggiunto nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/wiki-npc-params.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/wiki-npc-params.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-009] AI: wiki-request-detector.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-010] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-011] AI: domain-fallback-interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-012] AI: draft-assistant.types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-013] AI: preview-text-selection.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/preview-text-selection.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/preview-text-selection.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/preview-text-selection.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-014] AI: wiki-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-d3a640b-015] AI: wiki-request-detector.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-request-detector.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-001] AI: ai-assistant-canvas.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-canvas.tsx` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-canvas.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-002] AI: ai-assistant-panel.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/components/command-center/ai-assistant-panel.tsx` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/components/command-center/ai-assistant-panel.tsx

File gmflow probabili:

* src/components/command-center/ai-assistant-panel.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-008] AI: wiki-npc-params.test.ts (aggiunto)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/wiki-npc-params.test.ts` aggiunto nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/wiki-npc-params.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/wiki-npc-params.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-009] AI: wiki-request-detector.test.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/__tests__/wiki-request-detector.test.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-010] AI: chat-assistant.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/chat-assistant.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/chat-assistant.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-011] AI: domain-fallback-interpreter.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/domain-fallback-interpreter.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-012] AI: draft-assistant.types.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/draft-assistant.types.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/draft-assistant.types.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-013] AI: preview-text-selection.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/preview-text-selection.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/preview-text-selection.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/preview-text-selection.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-014] AI: wiki-proposal-builder.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-proposal-builder.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-0d6345e-015] AI: wiki-request-detector.ts (modificato)

Stato:
TO_IMPORT

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/modules/command-center/ai-control-plane/wiki-request-detector.ts` modificato nel commit «feat(command-center): gate NPC statblock on mechanics and speed up wiki generation». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/modules/command-center/ai-control-plane/wiki-request-detector.ts

File gmflow probabili:

* src/modules/command-center/ai-control-plane/wiki-request-detector.ts

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-12b3a10-001] CAMPAIGNS: page.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/[id]/gm-only/regia-immagini/proiezione/page.tsx` aggiunto nel commit «feat(gm): add regia immagini projection and wiki related links». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/[id]/gm-only/regia-immagini/proiezione/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/gm-only/regia-immagini/proiezione/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-12b3a10-003] CAMPAIGNS: entity-graph-actions.ts (modificato)

Stato:
TO_IMPORT

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/entity-graph-actions.ts` modificato nel commit «feat(gm): add regia immagini projection and wiki related links». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/entity-graph-actions.ts

File gmflow probabili:

* src/app/campaigns/entity-graph-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-12b3a10-004] GM_SCREEN: gm-gallery-sheet.tsx (modificato)

Stato:
TO_IMPORT

Categoria:
GM_SCREEN

Priorità per gmflow:
Media

Descrizione:

* File `src/components/gm/gm-gallery-sheet.tsx` modificato nel commit «feat(gm): add regia immagini projection and wiki related links». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Schermo GM / combattimento — alto valore per GM professionisti.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/gm/gm-gallery-sheet.tsx

File gmflow probabili:

* src/components/gm/gm-gallery-sheet.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-12b3a10-005] WIKI: related-entities-section.tsx (aggiunto)

Stato:
TO_IMPORT

Categoria:
WIKI

Priorità per gmflow:
Media

Descrizione:

* File `src/components/wiki/related-entities-section.tsx` aggiunto nel commit «feat(gm): add regia immagini projection and wiki related links». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Funzionalità wiki/lore rilevante per il prodotto SaaS multi-campagna.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/wiki/related-entities-section.tsx

File gmflow probabili:

* src/components/wiki/related-entities-section.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

## Modifiche da NON importare

### [BD-GMFLOW-365f9c0-001] OTHER: export-feature-to-gmflow.md (aggiunto)

Stato:
BD_ONLY

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `.cursor/commands/export-feature-to-gmflow.md` aggiunto nel commit «chore(gmflow): add export ledger automation and Cursor workflow». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* .cursor/commands/export-feature-to-gmflow.md

File gmflow probabili:

* src/.cursor/commands/export-feature-to-gmflow.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-365f9c0-002] OTHER: bnd-export-agent.mdc (aggiunto)

Stato:
BD_ONLY

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `.cursor/rules/bnd-export-agent.mdc` aggiunto nel commit «chore(gmflow): add export ledger automation and Cursor workflow». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* .cursor/rules/bnd-export-agent.mdc

File gmflow probabili:

* src/.cursor/rules/bnd-export-agent.mdc

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-365f9c0-003] OTHER: .gitignore (modificato)

Stato:
BD_ONLY

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `.gitignore` modificato nel commit «chore(gmflow): add export ledger automation and Cursor workflow». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* .gitignore

File gmflow probabili:

* src/.gitignore

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-365f9c0-004] OTHER: package.json (modificato)

Stato:
BD_ONLY

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `package.json` modificato nel commit «chore(gmflow): add export ledger automation and Cursor workflow». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* package.json

File gmflow probabili:

* src/package.json

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-365f9c0-005] OTHER: install-post-commit-hook.mjs (aggiunto)

Stato:
BD_ONLY

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `scripts/gmflow-export/install-post-commit-hook.mjs` aggiunto nel commit «chore(gmflow): add export ledger automation and Cursor workflow». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* scripts/gmflow-export/install-post-commit-hook.mjs

File gmflow probabili:

* src/scripts/gmflow-export/install-post-commit-hook.mjs

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-365f9c0-006] OTHER: update-gmflow-export-ledger.mjs (aggiunto)

Stato:
BD_ONLY

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `scripts/gmflow-export/update-gmflow-export-ledger.mjs` aggiunto nel commit «chore(gmflow): add export ledger automation and Cursor workflow». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* scripts/gmflow-export/update-gmflow-export-ledger.mjs

File gmflow probabili:

* src/scripts/gmflow-export/update-gmflow-export-ledger.mjs

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e4e9d49-001] OTHER: update-gmflow-export-ledger.mjs (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `scripts/gmflow-export/update-gmflow-export-ledger.mjs` modificato nel commit «fix(gmflow): skip ledger rewrite on export-only commits». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* scripts/gmflow-export/update-gmflow-export-ledger.mjs

File gmflow probabili:

* src/scripts/gmflow-export/update-gmflow-export-ledger.mjs

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-012] UI_UX: scene-editor-canvas.tsx (aggiunto)

Stato:
DISCARDED

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-canvas.tsx` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-canvas.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-94b0f4e-013] UI_UX: scene-editor-client.tsx (aggiunto)

Stato:
DISCARDED

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-client.tsx` aggiunto nel commit «feat(maps): add scene editor with portable map-core and FoW integration». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-client.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-001] OTHER: adr-map-scene-editor.md (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `docs/adr-map-scene-editor.md` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* docs/adr-map-scene-editor.md

File gmflow probabili:

* docs/imports/adr-map-scene-editor.md

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-002] CAMPAIGNS: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/[id]/gm-only/scene-editor/page.tsx` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/[id]/gm-only/scene-editor/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/gm-only/scene-editor/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-003] CAMPAIGNS: scene-document-actions.ts (modificato)

Stato:
DISCARDED

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/scene-document-actions.ts` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/scene-document-actions.ts

File gmflow probabili:

* src/app/campaigns/scene-document-actions.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-004] UI_UX: vista-dall-alto-client.tsx (modificato)

Stato:
DISCARDED

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/exploration/vista-dall-alto-client.tsx` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/exploration/vista-dall-alto-client.tsx

File gmflow probabili:

* src/components/exploration/vista-dall-alto-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-005] GM_SCREEN: gm-exploration-fow-sheet.tsx (modificato)

Stato:
DISCARDED

Categoria:
GM_SCREEN

Priorità per gmflow:
Media

Descrizione:

* File `src/components/gm/gm-exploration-fow-sheet.tsx` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Schermo GM / combattimento — alto valore per GM professionisti.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/gm/gm-exploration-fow-sheet.tsx

File gmflow probabili:

* src/components/gm/gm-exploration-fow-sheet.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-006] UI_UX: scene-editor-canvas.tsx (modificato)

Stato:
DISCARDED

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-canvas.tsx` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-canvas.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-007] UI_UX: scene-editor-client.tsx (modificato)

Stato:
DISCARDED

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-client.tsx` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-client.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-008] UI_UX: scene-editor-list-actions.tsx (modificato)

Stato:
DISCARDED

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-list-actions.tsx` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-list-actions.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-list-actions.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-009] MEDIA_STORAGE: exploration-storage.ts (modificato)

Stato:
DISCARDED

Categoria:
MEDIA_STORAGE

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/exploration/exploration-storage.ts` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Upload/storage media — adattare a R2 o storage gmflow.

Adattamenti necessari:

* Storage R2

File B&D coinvolti:

* src/lib/exploration/exploration-storage.ts

File gmflow probabili:

* src/lib/exploration/exploration-storage.ts

Rischi:

* Classificazione automatica non verificata
* Divergenza storage B&D (Telegram) vs gmflow (R2)

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Quale adapter storage usare in gmflow?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-010] OTHER: auto-walls.test.ts (aggiunto)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/__tests__/auto-walls.test.ts` aggiunto nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/__tests__/auto-walls.test.ts

File gmflow probabili:

* src/lib/map-core/__tests__/auto-walls.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-011] OTHER: floor-raster.ts (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/raster-export/floor-raster.ts` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/raster-export/floor-raster.ts

File gmflow probabili:

* src/lib/map-core/raster-export/floor-raster.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-012] OTHER: auto-walls.ts (aggiunto)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/auto-walls.ts` aggiunto nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/auto-walls.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/auto-walls.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-013] OTHER: draw-floor.ts (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/draw-floor.ts` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/draw-floor.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/draw-floor.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-014] OTHER: draw-props-svg.ts (aggiunto)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/draw-props-svg.ts` aggiunto nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/draw-props-svg.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/draw-props-svg.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-015] OTHER: ds-renderer.ts (aggiunto)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/ds-renderer.ts` aggiunto nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/ds-renderer.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/ds-renderer.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-016] OTHER: clone-document.ts (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/clone-document.ts` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/clone-document.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/clone-document.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-017] OTHER: index.ts (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/index.ts` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/index.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/index.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-018] OTHER: layer-presets.ts (aggiunto)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/layer-presets.ts` aggiunto nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/layer-presets.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/layer-presets.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-019] OTHER: normalize-floor.ts (aggiunto)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/normalize-floor.ts` aggiunto nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/normalize-floor.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/normalize-floor.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-020] OTHER: props-catalog.ts (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/props-catalog.ts` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/props-catalog.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/props-catalog.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-021] OTHER: types.ts (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/types.ts` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/types.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/types.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-be804da-022] OTHER: validate.ts (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-schema/validate.ts` modificato nel commit «feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-schema/validate.ts

File gmflow probabili:

* src/lib/map-core/scene-schema/validate.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-001] OTHER: package-lock.json (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `package-lock.json` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* package-lock.json

File gmflow probabili:

* src/package-lock.json

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-002] OTHER: package.json (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `package.json` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* package.json

File gmflow probabili:

* src/package.json

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-003] AI: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/app/admin/ai-image-prompt-debug/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/app/admin/ai-image-prompt-debug/page.tsx

File gmflow probabili:

* src/app/admin/ai-image-prompt-debug/page.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-e9c93e5-004] AI: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/app/admin/ai-image-styles/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/app/admin/ai-image-styles/page.tsx

File gmflow probabili:

* src/app/admin/ai-image-styles/page.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-e9c93e5-005] ADMIN: admin-audio-library-client.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/audio-library/admin-audio-library-client.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/audio-library/admin-audio-library-client.tsx

File gmflow probabili:

* src/app/admin/audio-library/admin-audio-library-client.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-006] ADMIN: character-catalog-import-client.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/character-catalog-import/character-catalog-import-client.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/character-catalog-import/character-catalog-import-client.tsx

File gmflow probabili:

* src/app/admin/character-catalog-import/character-catalog-import-client.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-007] ADMIN: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/communications/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/communications/page.tsx

File gmflow probabili:

* src/app/admin/communications/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-008] ADMIN: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/crm/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/crm/page.tsx

File gmflow probabili:

* src/app/admin/crm/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-009] ADMIN: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/feedback-statistics/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/feedback-statistics/page.tsx

File gmflow probabili:

* src/app/admin/feedback-statistics/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-010] ADMIN: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/gamification/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/gamification/page.tsx

File gmflow probabili:

* src/app/admin/gamification/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-011] ADMIN: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/image-benchmark/[runId]/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/image-benchmark/[runId]/page.tsx

File gmflow probabili:

* src/app/admin/image-benchmark/[runId]/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-012] ADMIN: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/image-benchmark/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/image-benchmark/page.tsx

File gmflow probabili:

* src/app/admin/image-benchmark/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-013] ADMIN: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/import/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/import/page.tsx

File gmflow probabili:

* src/app/admin/import/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-014] ADMIN: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/knowledge/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/knowledge/page.tsx

File gmflow probabili:

* src/app/admin/knowledge/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-015] ADMIN: layout.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/layout.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/layout.tsx

File gmflow probabili:

* src/app/admin/layout.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-016] MEDIA_STORAGE: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
MEDIA_STORAGE

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/media-export/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Upload/storage media — adattare a R2 o storage gmflow.

Adattamenti necessari:

* Storage R2

File B&D coinvolti:

* src/app/admin/media-export/page.tsx

File gmflow probabili:

* src/app/admin/media-export/page.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza storage B&D (Telegram) vs gmflow (R2)

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Quale adapter storage usare in gmflow?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-017] ADMIN: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/page.tsx

File gmflow probabili:

* src/app/admin/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-018] CAMPAIGNS: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/player-campaigns/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/admin/player-campaigns/page.tsx

File gmflow probabili:

* src/app/admin/player-campaigns/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-019] ADMIN: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/app/admin/users/[id]/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/app/admin/users/[id]/page.tsx

File gmflow probabili:

* src/app/admin/users/[id]/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-020] CAMPAIGNS: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/[id]/gm-only/missioni/proiezione/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/[id]/gm-only/missioni/proiezione/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/gm-only/missioni/proiezione/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-021] CAMPAIGNS: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/gm-only/scene-editor/[sceneDocumentId]/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-022] CAMPAIGNS: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/[id]/gm-only/scene-editor/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/[id]/gm-only/scene-editor/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/gm-only/scene-editor/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-023] CAMPAIGNS: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/[id]/gm-only/vista-dall-alto/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/[id]/gm-only/vista-dall-alto/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/gm-only/vista-dall-alto/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-024] AI: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
AI

Priorità per gmflow:
Alta

Descrizione:

* File `src/app/campaigns/[id]/settings/ai-style/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Migliora generazione testo/immagini o pipeline OpenRouter condivisa con gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi
* Storage R2
* sicurezza

File B&D coinvolti:

* src/app/campaigns/[id]/settings/ai-style/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/settings/ai-style/page.tsx

Rischi:

* Classificazione automatica non verificata
* Costi API OpenRouter
* Dipendenze modello

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* Validare model ID OpenRouter e quota per tenant

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* OPENROUTER_API_KEY configurata in gmflow

### [BD-GMFLOW-e9c93e5-025] CAMPAIGNS: page.tsx (modificato)

Stato:
DISCARDED

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/app/campaigns/[id]/wiki/[entityId]/page.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/app/campaigns/[id]/wiki/[entityId]/page.tsx

File gmflow probabili:

* src/app/campaigns/[id]/wiki/[entityId]/page.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-026] CAMPAIGNS: campaign-workspace.tsx (modificato)

Stato:
DISCARDED

Categoria:
CAMPAIGNS

Priorità per gmflow:
Media

Descrizione:

* File `src/components/campaigns/campaign-workspace.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Logica campagne potenzialmente generalizzabile per multi-tenant.

Adattamenti necessari:

* Multi-tenant
* Permessi
* SaaS/billing

File B&D coinvolti:

* src/components/campaigns/campaign-workspace.tsx

File gmflow probabili:

* src/components/campaigns/campaign-workspace.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-027] UI_UX: layout-conditional-navbar.tsx (modificato)

Stato:
DISCARDED

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/layout-conditional-navbar.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/layout-conditional-navbar.tsx

File gmflow probabili:

* src/components/layout-conditional-navbar.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-028] UI_UX: scene-editor-canvas.tsx (modificato)

Stato:
DISCARDED

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-canvas.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-canvas.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-canvas.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-029] UI_UX: scene-editor-client.tsx (modificato)

Stato:
DISCARDED

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-client.tsx` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-client.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-client.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-030] UI_UX: scene-editor-tool-overlay.tsx (aggiunto)

Stato:
DISCARDED

Categoria:
UI_UX

Priorità per gmflow:
Media

Descrizione:

* File `src/components/scene-editor/scene-editor-tool-overlay.tsx` aggiunto nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Miglioramento interfaccia — valutare design system gmflow.

Adattamenti necessari:

* i18n

File B&D coinvolti:

* src/components/scene-editor/scene-editor-tool-overlay.tsx

File gmflow probabili:

* src/components/scene-editor/scene-editor-tool-overlay.tsx

Rischi:

* Classificazione automatica non verificata
* Divergenza design system / CSS tema

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-031] OTHER: shell-classes.ts (aggiunto)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/layout/shell-classes.ts` aggiunto nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/layout/shell-classes.ts

File gmflow probabili:

* src/lib/layout/shell-classes.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-032] OTHER: auto-walls.test.ts (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/__tests__/auto-walls.test.ts` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/__tests__/auto-walls.test.ts

File gmflow probabili:

* src/lib/map-core/__tests__/auto-walls.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-033] OTHER: corridor-geometry.test.ts (aggiunto)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/__tests__/corridor-geometry.test.ts` aggiunto nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/__tests__/corridor-geometry.test.ts

File gmflow probabili:

* src/lib/map-core/__tests__/corridor-geometry.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-034] OTHER: union-boundary-edges.test.ts (aggiunto)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/__tests__/union-boundary-edges.test.ts` aggiunto nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/__tests__/union-boundary-edges.test.ts

File gmflow probabili:

* src/lib/map-core/__tests__/union-boundary-edges.test.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-035] OTHER: auto-walls.ts (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/auto-walls.ts` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/auto-walls.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/auto-walls.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-036] OTHER: corridor-geometry.ts (aggiunto)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/corridor-geometry.ts` aggiunto nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/corridor-geometry.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/corridor-geometry.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-037] OTHER: draw-floor.ts (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/draw-floor.ts` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/draw-floor.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/draw-floor.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-038] OTHER: ds-renderer.ts (modificato)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/ds-renderer.ts` modificato nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/ds-renderer.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/ds-renderer.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-e9c93e5-039] OTHER: union-boundary-edges.ts (aggiunto)

Stato:
DISCARDED

Categoria:
OTHER

Priorità per gmflow:
Media

Descrizione:

* File `src/lib/map-core/scene-editor/union-boundary-edges.ts` aggiunto nel commit «feat(maps): union-based auto-walls and full-width shell layout». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Modifica generica — valutare manualmente rilevanza gmflow.

Adattamenti necessari:

* altro

File B&D coinvolti:

* src/lib/map-core/scene-editor/union-boundary-edges.ts

File gmflow probabili:

* src/lib/map-core/scene-editor/union-boundary-edges.ts

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-312a24d-001] ADMIN: gm-admin-session-history-panel.tsx (aggiunto)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/components/dashboard/gm-admin-session-history-panel.tsx` aggiunto nel commit «feat(sessions): collapse session history into expandable panels». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/components/dashboard/gm-admin-session-history-panel.tsx

File gmflow probabili:

* src/components/dashboard/gm-admin-session-history-panel.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-312a24d-002] ADMIN: gm-admin-session-history-section.tsx (modificato)

Stato:
DISCARDED

Categoria:
ADMIN

Priorità per gmflow:
Media

Descrizione:

* File `src/components/dashboard/gm-admin-session-history-section.tsx` modificato nel commit «feat(sessions): collapse session history into expandable panels». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Tool admin interni — importare solo se gmflow ha pannello equivalente.

Adattamenti necessari:

* SaaS/billing

File B&D coinvolti:

* src/components/dashboard/gm-admin-session-history-section.tsx

File gmflow probabili:

* src/components/dashboard/gm-admin-session-history-section.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow
* gmflow ha equivalente admin o è solo tooling B&D?

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-312a24d-003] SESSIONS: my-sessions-list-client.tsx (modificato)

Stato:
DISCARDED

Categoria:
SESSIONS

Priorità per gmflow:
Media

Descrizione:

* File `src/components/my-sessions-list-client.tsx` modificato nel commit «feat(sessions): collapse session history into expandable panels». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Gestione sessioni di gioco — valutare parità funzionale gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/my-sessions-list-client.tsx

File gmflow probabili:

* src/components/my-sessions-list-client.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-312a24d-004] SESSIONS: completed-sessions-list-for-player.tsx (modificato)

Stato:
DISCARDED

Categoria:
SESSIONS

Priorità per gmflow:
Media

Descrizione:

* File `src/components/sessions/completed-sessions-list-for-player.tsx` modificato nel commit «feat(sessions): collapse session history into expandable panels». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Gestione sessioni di gioco — valutare parità funzionale gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/sessions/completed-sessions-list-for-player.tsx

File gmflow probabili:

* src/components/sessions/completed-sessions-list-for-player.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-312a24d-005] SESSIONS: session-history-manager.tsx (modificato)

Stato:
DISCARDED

Categoria:
SESSIONS

Priorità per gmflow:
Media

Descrizione:

* File `src/components/sessions/session-history-manager.tsx` modificato nel commit «feat(sessions): collapse session history into expandable panels». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Gestione sessioni di gioco — valutare parità funzionale gmflow.

Adattamenti necessari:

* Multi-tenant
* Permessi

File B&D coinvolti:

* src/components/sessions/session-history-manager.tsx

File gmflow probabili:

* src/components/sessions/session-history-manager.tsx

Rischi:

* Classificazione automatica non verificata

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED

### [BD-GMFLOW-c75aa38-002] DATABASE: 20260626140000_guild_gm_full_campaign_access.sql (aggiunto)

Stato:
DISCARDED

Categoria:
DATABASE

Priorità per gmflow:
Alta

Descrizione:

* File `supabase/migrations/20260626140000_guild_gm_full_campaign_access.sql` aggiunto nel commit «fix(authz): restore guild-wide GM access to all campaigns.». Classificazione automatica — richiede revisione umana.

Perché potrebbe servire a gmflow:

* Schema o migrazione DB — valutare impatto RLS e tenant isolation.

Adattamenti necessari:

* Multi-tenant
* sicurezza

File B&D coinvolti:

* supabase/migrations/20260626140000_guild_gm_full_campaign_access.sql

File gmflow probabili:

* supabase/migrations/20260626140000_guild_gm_full_campaign_access.sql

Rischi:

* Classificazione automatica non verificata
* Impatto RLS / isolamento tenant

Decisioni richieste:

* Confermare se la modifica è rilevante per gmflow

Criterio di import completato:

* Codice portato in gmflow con adattamenti documentati
* Test minimi superati
* Voce ledger aggiornata a IMPORTED o PARTIALLY_IMPORTED
* RLS/policy verificate per multi-tenant

## Coda import consigliata

- **[BD-GMFLOW-PKG-2026-07-06-001]** Package: Funzionalità e bugfix luglio 2026 — priorità Alta (OTHER)
- **[BD-GMFLOW-PKG-2026-07-06-CC]** Package: Command Center (GM Workspace + AI Control Plane) — priorità Alta (GM_SCREEN)
- **[BD-GMFLOW-PKG-2026-06-28-001]** Package: Nuove funzioni e bugfix (no RLS, no grafica) — priorità Alta (OTHER)
- **[BD-GMFLOW-041d96c-005]** AI: image-refine-prompt.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-041d96c-006]** AI: image-provider.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-041d96c-007]** AI: image-reference-fetch.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-041d96c-008]** AI: image-refine-prompt.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-041d96c-009]** AI: openrouter-provider.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-688720b-001]** AI: skill-expertise-ac.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-688720b-002]** AI: armor-class.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-688720b-003]** AI: build-choices-client.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-688720b-004]** AI: build-choices-types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-688720b-005]** AI: build-choices.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-688720b-006]** AI: build-engine.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-688720b-007]** AI: skill-rules.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-94b0f4e-049]** DATABASE: 20260628120000_scene_documents_and_map_source.sql (aggiunto) — priorità Alta (DATABASE)
- **[BD-GMFLOW-f17432f-005]** AI: ai-assistant-panel.tsx (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-f17432f-006]** AI: ai-proposal-panel.tsx (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-f17432f-008]** AI: interpreter.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-f17432f-009]** AI: autonomy.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-f17432f-010]** AI: context-resolver.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-f17432f-011]** AI: draft-assistant.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-f17432f-012]** AI: interpreter.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-f17432f-013]** AI: proposal-builder.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-f17432f-015]** AI: ai-proposal.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-ef0984c-001]** AI: ai-proposal-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1e31f94-005]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1e31f94-006]** AI: ai-proposal-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1e31f94-011]** AI: ai-proposal.actions.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1e31f94-015]** AI: interpreter.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1e31f94-016]** AI: proposal-executor.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1e31f94-017]** AI: autonomy.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1e31f94-018]** AI: draft-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1e31f94-019]** AI: draft-assistant.types.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1e31f94-020]** AI: proposal-executor.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0a78de3-002]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a78de3-003]** AI: ai-proposal-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a78de3-016]** AI: interpreter.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a78de3-017]** AI: proposal-executor.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a78de3-018]** AI: interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a78de3-019]** AI: proposal-executor.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a78de3-020]** AI: ai-proposal.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-478d341-002]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-478d341-004]** AI: conversation-intent.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-478d341-005]** AI: chat-assistant.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-478d341-006]** AI: conversation-intent.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-478d341-007]** AI: draft-assistant.types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-478d341-008]** AI: format-proposal-chat.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-478d341-009]** AI: interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-478d341-010]** AI: preview-proposals.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-478d341-011]** AI: proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-478d341-012]** AI: proposal-input.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-fd82d7b-003]** AI: ai-assistant-canvas.tsx (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-fd82d7b-004]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-fd82d7b-009]** AI: conversation-intent.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-fd82d7b-010]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-fd82d7b-011]** AI: conversation-intent.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-fd82d7b-012]** AI: draft-assistant.types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-fd82d7b-013]** AI: format-proposal-chat.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-fd82d7b-014]** AI: interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-fd82d7b-015]** AI: wiki-proposal-builder.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1a5921c-001]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a5921c-007]** AI: wiki-request-detector.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1a5921c-008]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a5921c-009]** AI: draft-assistant.types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a5921c-010]** AI: wiki-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a5921c-011]** AI: wiki-request-detector.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-089f6f1-003]** AI: ai-assistant-canvas.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-089f6f1-010]** AI: character-request-detector.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-089f6f1-011]** AI: mission-request-detector.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-089f6f1-012]** AI: campaign-request-detector.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-089f6f1-013]** AI: character-request-detector.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-089f6f1-014]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-089f6f1-015]** AI: domain-fallback-interpreter.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-089f6f1-016]** AI: interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-089f6f1-017]** AI: mission-request-detector.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-089f6f1-018]** AI: proposal-enricher.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-001]** AI: ai-assistant-canvas.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-002]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-009]** AI: campaign-text-generator.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-010]** AI: conversation-intent.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-011]** AI: mission-text-generator.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-012]** AI: campaign-proposal-builder.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-013]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-014]** AI: conversation-intent.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-015]** AI: draft-assistant.types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-016]** AI: interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-017]** AI: mission-proposal-builder.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-10b04a7-018]** AI: proposal-enricher.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a086f7-002]** AI: ai-assistant-canvas.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a086f7-003]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a086f7-010]** AI: character-text-generator.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0a086f7-011]** AI: conversation-intent.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a086f7-012]** AI: character-proposal-builder.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0a086f7-013]** AI: character-proposal-shared.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0a086f7-014]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a086f7-015]** AI: conversation-intent.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a086f7-016]** AI: draft-assistant.types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0a086f7-017]** AI: proposal-enricher.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-001]** AI: ai-assistant-canvas.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-002]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-011]** AI: conversation-intent.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-012]** AI: relationship-request-detector.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-013]** AI: session-close-request-detector.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-014]** AI: session-close-text-generator.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-015]** AI: session-request-detector.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-016]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-017]** AI: conversation-intent.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-018]** AI: domain-fallback-interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-019]** AI: draft-assistant.types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-020]** AI: format-proposal-chat.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-021]** AI: proposal-input.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-022]** AI: relationship-proposal-builder.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-023]** AI: relationship-request-detector.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-024]** AI: session-close-proposal-builder.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-025]** AI: session-close-request-detector.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-026]** AI: session-close.types.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-027]** AI: session-proposal-builder.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0dc3ba6-028]** AI: session-request-detector.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-001]** AI: ai-assistant-canvas.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-002]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-008]** AI: preview-text-selection.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-009]** AI: wiki-request-detector.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-010]** AI: campaign-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-011]** AI: character-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-012]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-013]** AI: domain-fallback-interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-014]** AI: draft-assistant.types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-015]** AI: format-proposal-chat.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-016]** AI: interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-017]** AI: mission-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-018]** AI: preview-text-selection.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-019]** AI: session-close-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-020]** AI: wiki-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-6fa90f2-021]** AI: wiki-request-detector.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-001]** AI: ai-assistant-canvas.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-002]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-008]** AI: preview-text-selection.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-009]** AI: wiki-request-detector.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-010]** AI: campaign-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-011]** AI: character-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-012]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-013]** AI: domain-fallback-interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-014]** AI: draft-assistant.types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-015]** AI: format-proposal-chat.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-016]** AI: interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-017]** AI: mission-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-018]** AI: preview-text-selection.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-019]** AI: session-close-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-020]** AI: wiki-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-c983095-021]** AI: wiki-request-detector.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-002]** AI: ai-assistant-canvas.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-003]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-008]** AI: name-generator-field.tsx (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-011]** AI: name-generator-actions.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-018]** AI: local-names.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-019]** AI: local-names.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-020]** AI: types.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-021]** AI: contextual-names.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-022]** AI: conversation-intent.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-023]** AI: proposal-input.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-024]** AI: campaign-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-025]** AI: character-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-026]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-027]** AI: conversation-intent.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-028]** AI: domain-fallback-interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-029]** AI: proposal-input.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-1a4d59a-030]** AI: wiki-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-a4a0545-001]** AI: ai-assistant-canvas.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-a4a0545-002]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-a4a0545-006]** AI: campaign-type-selection.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-a4a0545-007]** AI: conversation-intent.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-a4a0545-008]** AI: campaign-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-a4a0545-009]** AI: campaign-request-detector.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-a4a0545-010]** AI: campaign-type-selection.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-a4a0545-011]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-a4a0545-012]** AI: domain-fallback-interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-a4a0545-013]** AI: draft-assistant.types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-a4a0545-014]** AI: preview-text-selection.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-cd6c725-003]** AI: json-extract.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-cd6c725-005]** AI: campaign-text-generator.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-cd6c725-006]** AI: interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-8133bf5-004]** AI: openrouter-image-request.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-d3a640b-001]** AI: ai-assistant-canvas.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-d3a640b-002]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-d3a640b-008]** AI: wiki-npc-params.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-d3a640b-009]** AI: wiki-request-detector.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-d3a640b-010]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-d3a640b-011]** AI: domain-fallback-interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-d3a640b-012]** AI: draft-assistant.types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-d3a640b-013]** AI: preview-text-selection.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-d3a640b-014]** AI: wiki-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-d3a640b-015]** AI: wiki-request-detector.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0d6345e-001]** AI: ai-assistant-canvas.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0d6345e-002]** AI: ai-assistant-panel.tsx (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0d6345e-008]** AI: wiki-npc-params.test.ts (aggiunto) — priorità Alta (AI)
- **[BD-GMFLOW-0d6345e-009]** AI: wiki-request-detector.test.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0d6345e-010]** AI: chat-assistant.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0d6345e-011]** AI: domain-fallback-interpreter.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0d6345e-012]** AI: draft-assistant.types.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0d6345e-013]** AI: preview-text-selection.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0d6345e-014]** AI: wiki-proposal-builder.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-0d6345e-015]** AI: wiki-request-detector.ts (modificato) — priorità Alta (AI)
- **[BD-GMFLOW-041d96c-001]** WIKI: create-entity-dialog.tsx (modificato) — priorità Media (WIKI)
- **[BD-GMFLOW-041d96c-002]** WIKI: edit-entity-dialog.tsx (modificato) — priorità Media (WIKI)
- **[BD-GMFLOW-041d96c-004]** WIKI: wiki-image-chat.ts (aggiunto) — priorità Media (WIKI)
- **[BD-GMFLOW-041d96c-010]** OTHER: types.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-82f09ac-001]** WIKI: create-entity-dialog.tsx (modificato) — priorità Media (WIKI)
- **[BD-GMFLOW-82f09ac-002]** OTHER: image-url.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-fef9b75-001]** WIKI: wiki-bestiary-search-actions.ts (modificato) — priorità Media (WIKI)
- **[BD-GMFLOW-fef9b75-002]** OTHER: bestiary-statblock-parser.test.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-fef9b75-003]** OTHER: bestiary-statblock-parser.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-94b0f4e-007]** CAMPAIGNS: scene-document-actions.ts (aggiunto) — priorità Media (CAMPAIGNS)
- **[BD-GMFLOW-94b0f4e-034]** OTHER: floor-raster.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-c75aa38-001]** CAMPAIGNS: character-actions.ts (modificato) — priorità Media (CAMPAIGNS)
- **[BD-GMFLOW-3cf1907-002]** CAMPAIGNS: scene-document-actions.ts (modificato) — priorità Media (CAMPAIGNS)
- **[BD-GMFLOW-3cf1907-005]** OTHER: floor-raster.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-f9bcd77-001]** CAMPAIGNS: scene-document-actions.ts (modificato) — priorità Media (CAMPAIGNS)
- **[BD-GMFLOW-f9bcd77-003]** MEDIA_STORAGE: exploration-map-upload-core.ts (modificato) — priorità Media (MEDIA_STORAGE)
- **[BD-GMFLOW-f9bcd77-005]** OTHER: floor-raster.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-003]** OTHER: command-center-export.md (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-004]** OTHER: command-center-vision.md (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-005]** OTHER: layout.tsx (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-006]** OTHER: page.tsx (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-008]** UI_UX: command-center-client.tsx (aggiunto) — priorità Media (UI_UX)
- **[BD-GMFLOW-09a5000-013]** OTHER: barber-dragons.adapter.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-014]** OTHER: index.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-015]** OTHER: types.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-016]** OTHER: index.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-017]** OTHER: actions.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-018]** OTHER: entities.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-019]** OTHER: index.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-09a5000-020]** OTHER: workspace.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-002]** OTHER: command-center-export.md (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-003]** OTHER: command-center-vision.md (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-005]** OTHER: page.tsx (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-006]** UI_UX: audit-timeline.tsx (aggiunto) — priorità Media (UI_UX)
- **[BD-GMFLOW-d00079b-007]** UI_UX: command-center-client.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-d00079b-008]** OTHER: registry.test.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-009]** OTHER: audit.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-010]** OTHER: workspace.actions.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-011]** OTHER: gm-note.actions.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-012]** OTHER: session.actions.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-013]** WIKI: wiki.actions.ts (aggiunto) — priorità Media (WIKI)
- **[BD-GMFLOW-d00079b-014]** OTHER: index.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-015]** OTHER: register-all.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-016]** OTHER: registry.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-017]** OTHER: index.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-018]** OTHER: actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-019]** OTHER: actions.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-020]** OTHER: audit.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-d00079b-021]** OTHER: index.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-f17432f-004]** OTHER: page.tsx (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-f17432f-007]** UI_UX: command-center-client.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-f17432f-014]** OTHER: actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-f17432f-016]** OTHER: index.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-ef0984c-002]** OTHER: workspace.actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-1e31f94-003]** OTHER: command-center-vision.md (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-1e31f94-007]** UI_UX: audit-timeline.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-1e31f94-008]** UI_UX: command-center-client.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-1e31f94-009]** UI_UX: voice-capture-button.tsx (aggiunto) — priorità Media (UI_UX)
- **[BD-GMFLOW-1e31f94-010]** OTHER: registry.test.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-1e31f94-012]** OTHER: workspace.actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-1e31f94-013]** OTHER: register-all.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-1e31f94-014]** OTHER: registry.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-1e31f94-021]** OTHER: actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-1e31f94-022]** OTHER: actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-1e31f94-023]** OTHER: command-input-voice.test.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-1e31f94-024]** OTHER: command-input-voice.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-1e31f94-025]** OTHER: use-voice-dictation.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-0a78de3-004]** UI_UX: audit-timeline.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-0a78de3-005]** OTHER: action-catalog.test.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-0a78de3-006]** OTHER: registry.test.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-0a78de3-007]** OTHER: action-catalog.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-0a78de3-008]** OTHER: command-input.actions.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-0a78de3-009]** OTHER: memory.actions.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-0a78de3-010]** OTHER: campaign.actions.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-0a78de3-011]** OTHER: character.actions.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-0a78de3-012]** OTHER: mission.actions.ts (aggiunto) — priorità Media (OTHER)
- **[BD-GMFLOW-0a78de3-013]** OTHER: session.actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-0a78de3-014]** WIKI: wiki.actions.ts (modificato) — priorità Media (WIKI)
- **[BD-GMFLOW-0a78de3-015]** OTHER: register-all.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-0accbfa-001]** UI_UX: audit-timeline.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-0accbfa-002]** OTHER: character.actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-478d341-001]** OTHER: page.tsx (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-478d341-003]** UI_UX: command-center-client.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-478d341-013]** OTHER: actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-fd82d7b-001]** OTHER: page.tsx (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-fd82d7b-005]** UI_UX: command-center-client.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-fd82d7b-008]** WIKI: wiki.actions.ts (modificato) — priorità Media (WIKI)
- **[BD-GMFLOW-1a5921c-002]** UI_UX: audit-timeline.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-1a5921c-003]** UI_UX: command-center-client.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-1a5921c-006]** OTHER: workspace.actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-1a5921c-012]** OTHER: actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-10b04a7-008]** OTHER: campaign.actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-0a086f7-009]** OTHER: character.actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-0dc3ba6-006]** OTHER: registry.test.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-0dc3ba6-007]** OTHER: action-catalog.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-0dc3ba6-008]** OTHER: session.actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-0dc3ba6-009]** WIKI: wiki-relationship.actions.ts (aggiunto) — priorità Media (WIKI)
- **[BD-GMFLOW-0dc3ba6-010]** OTHER: register-all.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-e2bcbd3-004]** OTHER: build-sheets-zip.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-6fa90f2-003]** UI_UX: command-center-client.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-6fa90f2-004]** UI_UX: preview-selectable-text.tsx (aggiunto) — priorità Media (UI_UX)
- **[BD-GMFLOW-6fa90f2-006]** OTHER: action-catalog.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-6fa90f2-007]** WIKI: wiki.actions.ts (modificato) — priorità Media (WIKI)
- **[BD-GMFLOW-c983095-003]** UI_UX: command-center-client.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-c983095-004]** UI_UX: preview-selectable-text.tsx (aggiunto) — priorità Media (UI_UX)
- **[BD-GMFLOW-c983095-006]** OTHER: action-catalog.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-c983095-007]** WIKI: wiki.actions.ts (modificato) — priorità Media (WIKI)
- **[BD-GMFLOW-1a4d59a-004]** UI_UX: command-center-client.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-1a4d59a-005]** UI_UX: preview-selectable-text.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-508bd44-001]** UI_UX: audit-timeline.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-508bd44-002]** UI_UX: command-center-client.tsx (modificato) — priorità Media (UI_UX)
- **[BD-GMFLOW-a4a0545-005]** OTHER: campaign.actions.ts (modificato) — priorità Media (OTHER)
- **[BD-GMFLOW-12b3a10-001]** CAMPAIGNS: page.tsx (aggiunto) — priorità Media (CAMPAIGNS)
- **[BD-GMFLOW-12b3a10-003]** CAMPAIGNS: entity-graph-actions.ts (modificato) — priorità Media (CAMPAIGNS)
- **[BD-GMFLOW-12b3a10-004]** GM_SCREEN: gm-gallery-sheet.tsx (modificato) — priorità Media (GM_SCREEN)
- **[BD-GMFLOW-12b3a10-005]** WIKI: related-entities-section.tsx (aggiunto) — priorità Media (WIKI)

## Sintesi per ChatGPT

Questo ledger traccia modifiche Barber & Dragons da valutare per import in gmflow.app.
**Non importa codice automaticamente** — copia solo file di stato in `masto-platform/docs/imports/`.

- Repository sorgente: `/Users/alessandropetricciuolo/Desktop/Barber And Dragons - Web App`
- Repository gmflow locale: `/Users/alessandropetricciuolo/Desktop/masto-platform`
- Ultimo commit: `28fe02c` — chore(gmflow): add July export packages and ledger-only sync script
- File analizzati nell'ultimo run: 1
- Nuove voci aggiunte: 1

**Azioni consigliate:**
1. Rivedere voci `NEEDS_REVIEW` nella sezione «Delta automatico».
2. Promuovere a `TO_IMPORT` le modifiche rilevanti; impostare `BD_ONLY` o `DISCARDED` per il resto.
3. Usare `NEEDS_DECISION` quando serve input del product owner.
4. Dopo import manuale in gmflow, aggiornare stato a `IMPORTED` o `PARTIALLY_IMPORTED`.
5. Package dettagliati opzionali in `docs/gmflow-export-packages/`.

**Comandi:**
- `npm run gmflow:export` — aggiorna ledger e copia in gmflow
- `npm run gmflow:install-hook` — hook post-commit automatico
