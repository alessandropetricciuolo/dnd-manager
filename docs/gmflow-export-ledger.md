# B&D → gmflow Export Ledger

## Snapshot

* Data aggiornamento: 2026-06-26T15:15:32.087Z
* Branch corrente: main
* Ultimo commit analizzato: be804da3b0b2c0e9f22b38c53028ddc0d4f1a34c
* Range commit analizzato: 2c01ec2..be804da
* Stato generale: 101 voci NEEDS_REVIEW
* Voci totali: 101 (NEEDS_REVIEW: 101, TO_IMPORT: 0, IMPORTED: 0)

## Delta automatico non revisionato

### [BD-GMFLOW-041d96c-001] WIKI: create-entity-dialog.tsx (modificato)

Stato:
NEEDS_REVIEW

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
NEEDS_REVIEW

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

### [BD-GMFLOW-041d96c-004] WIKI: wiki-image-chat.ts (aggiunto)

Stato:
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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

### [BD-GMFLOW-365f9c0-001] OTHER: export-feature-to-gmflow.md (aggiunto)

Stato:
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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

### [BD-GMFLOW-688720b-001] AI: skill-expertise-ac.test.ts (aggiunto)

Stato:
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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

### [BD-GMFLOW-fef9b75-001] WIKI: wiki-bestiary-search-actions.ts (modificato)

Stato:
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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

### [BD-GMFLOW-94b0f4e-007] CAMPAIGNS: scene-document-actions.ts (aggiunto)

Stato:
NEEDS_REVIEW

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

### [BD-GMFLOW-94b0f4e-012] UI_UX: scene-editor-canvas.tsx (aggiunto)

Stato:
NEEDS_REVIEW

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
NEEDS_REVIEW

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

### [BD-GMFLOW-94b0f4e-034] OTHER: floor-raster.ts (aggiunto)

Stato:
NEEDS_REVIEW

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

### [BD-GMFLOW-94b0f4e-049] DATABASE: 20260628120000_scene_documents_and_map_source.sql (aggiunto)

Stato:
NEEDS_REVIEW

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

### [BD-GMFLOW-be804da-001] OTHER: adr-map-scene-editor.md (modificato)

Stato:
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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
NEEDS_REVIEW

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

## Modifiche revisionate manualmente

_Nessuna voce revisionata._

## Modifiche da NON importare

_Nessuna voce esclusa o in decisione._

## Coda import consigliata

_Coda vuota — promuovere voci da NEEDS_REVIEW a TO_IMPORT dopo revisione._

## Sintesi per ChatGPT

Questo ledger traccia modifiche Barber & Dragons da valutare per import in gmflow.app.
**Non importa codice automaticamente** — copia solo file di stato in `masto-platform/docs/imports/`.

- Repository sorgente: `/Users/alessandropetricciuolo/Desktop/Barber And Dragons - Web App`
- Repository gmflow locale: `/Users/alessandropetricciuolo/Desktop/masto-platform`
- Ultimo commit: `be804da` — feat(maps): add DS-style rendering, auto-walls, and layer presets to scene editor
- File analizzati nell'ultimo run: 22
- Nuove voci aggiunte: 22

**Azioni consigliate:**
1. Rivedere voci `NEEDS_REVIEW` nella sezione «Delta automatico».
2. Promuovere a `TO_IMPORT` le modifiche rilevanti; impostare `BD_ONLY` o `DISCARDED` per il resto.
3. Usare `NEEDS_DECISION` quando serve input del product owner.
4. Dopo import manuale in gmflow, aggiornare stato a `IMPORTED` o `PARTIALLY_IMPORTED`.
5. Package dettagliati opzionali in `docs/gmflow-export-packages/`.

**Comandi:**
- `npm run gmflow:export` — aggiorna ledger e copia in gmflow
- `npm run gmflow:install-hook` — hook post-commit automatico
