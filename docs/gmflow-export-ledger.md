# B&D → gmflow Export Ledger

## Snapshot

* Data aggiornamento: 2026-06-25T09:34:30.327Z
* Branch corrente: main
* Ultimo commit analizzato: 82f09ac9711da267c1614feeaa4432e826daafc2
* Range commit analizzato: 041d96c..82f09ac
* Stato generale: 12 voci NEEDS_REVIEW
* Voci totali: 12 (NEEDS_REVIEW: 12, TO_IMPORT: 0, IMPORTED: 0)

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
- Ultimo commit: `82f09ac` — fix(wiki): persist AI portrait preset when creating wiki entities
- File analizzati nell'ultimo run: 2
- Nuove voci aggiunte: 2

**Azioni consigliate:**
1. Rivedere voci `NEEDS_REVIEW` nella sezione «Delta automatico».
2. Promuovere a `TO_IMPORT` le modifiche rilevanti; impostare `BD_ONLY` o `DISCARDED` per il resto.
3. Usare `NEEDS_DECISION` quando serve input del product owner.
4. Dopo import manuale in gmflow, aggiornare stato a `IMPORTED` o `PARTIALLY_IMPORTED`.
5. Package dettagliati opzionali in `docs/gmflow-export-packages/`.

**Comandi:**
- `npm run gmflow:export` — aggiorna ledger e copia in gmflow
- `npm run gmflow:install-hook` — hook post-commit automatico
