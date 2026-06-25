# B&D → gmflow Export Ledger

## Snapshot

* Data aggiornamento: 2026-06-25T09:34:36.850Z
* Branch corrente: main
* Ultimo commit analizzato: 365f9c0f76a33c3122d277fb51f7b84351d43bc7
* Range commit analizzato: 82f09ac..365f9c0
* Stato generale: 18 voci NEEDS_REVIEW
* Voci totali: 18 (NEEDS_REVIEW: 18, TO_IMPORT: 0, IMPORTED: 0)

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
- Ultimo commit: `365f9c0` — chore(gmflow): add export ledger automation and Cursor workflow
- File analizzati nell'ultimo run: 6
- Nuove voci aggiunte: 6

**Azioni consigliate:**
1. Rivedere voci `NEEDS_REVIEW` nella sezione «Delta automatico».
2. Promuovere a `TO_IMPORT` le modifiche rilevanti; impostare `BD_ONLY` o `DISCARDED` per il resto.
3. Usare `NEEDS_DECISION` quando serve input del product owner.
4. Dopo import manuale in gmflow, aggiornare stato a `IMPORTED` o `PARTIALLY_IMPORTED`.
5. Package dettagliati opzionali in `docs/gmflow-export-packages/`.

**Comandi:**
- `npm run gmflow:export` — aggiorna ledger e copia in gmflow
- `npm run gmflow:install-hook` — hook post-commit automatico
