# Handoff QA → Agente Sviluppatore — AI campagna long

> Documento di consegna per un agente che deve mantenere, estendere o correggere il flusso AI.
> Ultimo run validato: **2026-06-13**, **10/10 test** (`npm run test:e2e:ai-prod`), ~3.6 min.

---

## 1. Executive summary

È stata eseguita una QA end-to-end **in produzione** sul flusso AI della **campagna long**, dalla configurazione del contesto GM fino a testo, immagini e memoria campagna.

**Verdetto funzionale:** il sistema **funziona** come progettato. Memoria, riassunti sessione, query semantica e generazioni wiki/image si integrano correttamente.

**Verdetto processo:** il flusso è **testabile ma fragile** per automazione — asimmetrie UI (create vs edit wiki), latenza AI variabile, accumulo dati sandbox e dipendenza da URL/dominio rendono necessari miglioramenti strutturali prima di mettere questi test in CI obbligatoria.

**Aggiornamento 2026-06-13:** implementati i fix P1 emersi dalla QA (parità edit/create testo IA, chiusura Bacchetta, feedback memoria wiki, cleanup artifact E2E). Vedi §12.

---

## 2. Ambiente e prerequisiti

| Elemento | Valore |
|----------|--------|
| Deploy testato | `https://dnd-manager-j8h5.vercel.app` (produzione Vercel, project `barberanddragons.com`) |
| Custom domain | `barberandragons.com` — stesso backend; in alcuni ambienti CI il DNS custom non risolve → usare URL Vercel |
| Campagna sandbox | `E2E-QA Long` — ID in `tests/e2e/.auth/credentials.json` → `campaigns.longId` |
| GM test | `e2e-gm@barberandragons.qa` / `E2eBd2026!` |
| Supabase | service role in `.env.local` per assert DB (`tests/e2e/helpers/ai-memory-db.ts`) |
| Script | `npm run test:e2e:ai-prod` |
| Prerequisito browser | `npx playwright install chromium` |

**Teardown automatico:** su target produzione, `global-teardown.ts` imposta `is_public: false` sulle campagne `E2E-QA*` e invoca `e2e:cleanup-artifacts` (wiki `E2E AI*`, sessioni `E2E Live*`, chunk memoria collegati).

---

## 3. Architettura AI testata (mappa codice)

```
Tab Solo GM (long)
├── CampaignAiArchitectPanel     → generateCampaignContextAction (ai-architect.ts)
│   └── campaigns.ai_context JSON (6 paletti + excluded_manual_book_keys)
├── CampaignMemoryQueryPanel     → queryCampaignMemoryAction, reindexCampaignMemoryAction
│   └── campaign_memory_chunks (embedding + source_type)
├── Wiki (create-entity-dialog)  → generateWikiMarkdownAction, generateFullAiWikiEntity, Bacchetta IA
│   └── syncWikiEntityToCampaignMemory (wiki con include_in_campaign_ai_memory)
├── Sessioni + EndSessionWizard  → closeSessionAction
│   └── syncSessionToCampaignMemory (session_summary)
└── edit-entity-dialog             → Assistente IA rigenera testo + Genera immagine IA

Prompt assembly (long):
├── fetchLongCampaignWikiMemoryPromptBlock (campaign-wiki-ai-memory.ts)
├── campaigns.ai_context (visual_positive / visual_negative)
└── campaign_memory_chunks (RAG semantico)
```

**File chiave da conoscere prima di modifiche:**

- `src/lib/campaign-memory-indexer.ts` — sync wiki/session → chunks
- `src/lib/actions/ai-architect.ts` — Architetto
- `src/lib/ai/wiki-text-generator.ts` — testo wiki
- `src/lib/actions/ai-generator.ts` — immagini + negative prompt
- `src/components/wiki/create-entity-dialog.tsx` — Assistente IA + Bacchetta
- `src/components/wiki/edit-entity-dialog.tsx` — Assistente IA testo + immagine IA
- `src/components/sessions/end-session-wizard.tsx` — chiusura long (6 step)

---

## 4. Scenari QA eseguiti (dettaglio)

### 4.1 Architetto AI — paletti e negative prompt

**Azione:** tab GM → AI → descrizione gothic-noir → «Genera Paletti AI».

**Assert UI:** badge «Cervello AI configurato», campo «Vietato in immagine».

**Assert DB:** `campaigns.ai_context` con tutti e 6 i campi; `visual_negative` contiene termini tipo neon/modern/cartoon/tech.

**Esito:** ✅ ~12–35 s.

---

### 4.2 Wiki canonica + memoria IA

**Azione:** tab Wiki → Nuova voce → checkbox «Memoria IA della campagna» → contenuto con token `E2E-AI-{runId}-WIKI`.

**Assert DB:** chunk `source_type: wiki` con token entro 90 s (`waitForMemoryToken`).

**Esito:** ✅ ~8 s (+ sync async).

**Nota dev:** l’indicizzazione wiki avviene lato server al save; toast post-save indica «N chunk» in memoria campagna (long + checkbox attiva).

---

### 4.3 Generazione testo — Assistente IA (create dialog)

**Azione:** Nuova voce → espandi `<details>` «Assistente IA» → imposta razza/classe/livello NPC → «Genera testo» → Crea voce.

**Vincolo prodotto:** per NPC, `handleAssistGenerateText` **blocca** senza razza+classe+livello (`create-entity-dialog.tsx` ~549).

**Assert:** toast «Contenuto AI generato»; `#entity-content` > 80 caratteri.

**Esito:** ✅ ~1.1–1.9 min (OpenRouter).

**Gap prodotto:** ~~in **Modifica voce wiki** (`edit-entity-dialog.tsx`) **non esiste** «Genera testo»~~ **Risolto (2026-06-13):** sezione collassabile «Assistente IA — rigenera testo» in modifica (NPC, luoghi, oggetti, lore). I mostri restano solo in creazione con bestiario.

---

### 4.4 Sessione live — chiusura con riassunto

**Azione:** tab Sessioni → Nuova sessione → **data oggi + orario già trascorso** (`pickCalendarTodayPastTime`) → luogo `E2E Live {runId}` → wizard chiusura → riassunto con `E2E-AI-{runId}-SESSION`.

**Perché orario passato:** il bottone «Chiudi sessione» compare solo se `sessionInstant <= now` (`session-list-client.tsx`).

**Perché zero iscritti OK:** `canProceedStep1` consente chiusura senza iscritti (`end-session-wizard.tsx` ~380).

**Assert DB:** chunk `session_summary` con token entro 120 s.

**Esito:** ✅ ~13 s (wizard) + sync memoria.

**Debito dati:** ogni run lascia sessioni scheduled/completed con prefisso `E2E Live` — lista sessioni cresce.

---

### 4.5 Query memoria campagna

**Azione:** tab GM → «Chiedi alla Memoria Campagna» → domanda sul sigillo `{token}-SESSION`.

**Assert UI:** toast «Memoria interrogata»; sezione Risposta con riferimenti a sigillo/porto/sessione.

**Esito:** ✅ ~10–16 s.

**Non testato in questa suite:** export `.md` completo/compatto, «Reindicizza memoria» (non necessario — sync automatico ha funzionato).

---

### 4.6 Rigenerazione wiki — Bacchetta IA

**Azione:** Bacchetta IA, tipo **`lore`** (solo testo, veloce), prompt che cita il sigillo della sessione → Chiudi dialog Bacchetta → Crea voce.

**Esito:** ✅ ~40 s (lore) vs **>5 min / timeout** con NPC+location (catena testo+immagine).

**Comportamento UI documentato:** toast «Bozza testo pronta…» / «Bozza completa pronta…»; ~~il modale Bacchetta resta aperto~~ **Risolto (2026-06-13):** il dialog si chiude al successo e scrolla al form.

---

### 4.7 Generazione immagine — negative prompt

**Azione:** dettaglio wiki → Modifica → «Genera immagine IA».

**Assert:** toast successo; `ai_context.visual_negative` ancora popolato in DB.

**Esito:** ✅ ~15 s (HF FLUX in prod).

**Limite test attuale:** non verifichiamo il **prompt effettivo** inviato a HF — solo persistenza negative in DB + successo generazione.

---

## 5. Stato DB post-run (riferimento)

```json
{
  "chunkCount": 33,
  "sessionSummaryChunks": 4,
  "wikiChunks": 29,
  "aiContext": {
    "narrative_tone": "dark gothic-noir with brooding suspense and political intrigue",
    "visual_negative": "jeans, modern clothing, cars, cyberpunk, sci-fi, phones, neon colors, cartoonish style, bright futuristic technology"
  }
}
```

Conclusione memoria: **syncSessionToCampaignMemory** alla chiusura sessione è affidabile; non serve reindex manuale per i riassunti testati.

---

## 6. Problemi e attriti scoperti (non tutti bug)

### 6.1 Prodotti / UX

| ID | Severità | Descrizione | Stato |
|----|----------|-------------|-------|
| UX-1 | Media | Assistente «Genera testo» solo in **create**, non in **edit** wiki | ✅ Risolto — `edit-entity-dialog.tsx` |
| UX-2 | Bassa | Bacchetta IA non chiude il dialog dopo successo | ✅ Risolto — auto-close + scroll |
| UX-3 | Media | NPC text AI richiede razza/classe/livello ma l’errore è solo toast | ⚠️ Aperto — tooltip/messaggio più esplicito |
| UX-4 | Bassa | Nessun indicatore «voce indicizzata in memoria campagna» post-save wiki | ✅ Risolto — toast con N chunk |
| UX-5 | Bassa | Sessioni/wiki E2E accumulate | ✅ Risolto — `e2e:cleanup-artifacts` + teardown |

### 6.2 Testabilità / automazione

| ID | Severità | Descrizione |
|----|----------|-------------|
| T-1 | Alta | Toast Sonner multipli → strict mode Playwright; servono selettori specifici (`getByText('Entità creata')`) non `[data-sonner-toast]` generico |
| T-2 | Alta | Latenza AI 1–5+ min → suite serial con `timeout: 600_000`; fragile in CI parallela |
| T-3 | Media | `barberandragons.com` vs URL Vercel — `isProductionE2ETarget` aggiornato in `scripts/e2e-env.ts` |
| T-4 | Media | Assistente IA in `<details collapsible>` — serve click su `summary` |
| T-5 | Media | Chiusura sessione richiede data/ora passata — helper `pickCalendarTodayPastTime` non ovvio per chi scrive test |

### 6.3 Processo QA (come è stato eseguito)

Iterazioni fallite prima del 10/10:

1. DNS custom non risolto → switch a Vercel URL  
2. Playwright chromium non installato  
3. Selettore Assistente IA su pagina dettaglio (edit) invece che create dialog  
4. Toast progress «Generazione scheda testo…» matchava regex troppo larga  
5. Session card selector `[class*=Card]` inadeguato al DOM reale  
6. Strict mode su doppio bottone «Chiudi sessione»  
7. Bacchetta: timeout 5 min su NPC full chain; fix usando tipo `lore`  
8. Bacchetta: dialog aperto bloccava «Crea voce»  

**Costo totale stabilizzazione:** ~8–10 run manuali (~45 min di wall time effettivo oltre ai tempi AI).

---

## 7. Migliorie al processo QA (raccomandate)

### 7.1 Struttura test

1. **Separare tier:**
   - **P0 smoke (no AI, ~30 s):** Architetto salva JSON; wiki save trigger sync (mock o assert DB con contenuto pre-esistente); session close con summary stub.
   - **P1 AI prod (serial, nightly):** suite attuale `long-campaign-ai.prod.spec.ts`.
   - **P2 costosi:** Bacchetta NPC+location full chain, export memoria `.md`, reindex.

2. **Fixture con token deterministico:** esporre `E2E_AI_RUN_ID` env per ri-run parziali (`--grep "5 ·"`) senza ripetere step 1–4.

3. **Assert DB + UI:** mantenere `ai-memory-db.ts` per verifiche oggettive; l’UI da sola non basta per memoria.

4. ~~**Cleanup post-run:**~~ ✅ Fatto — vedi `scripts/e2e-cleanup-long-campaign-artifacts.ts` e §12.

### 7.2 CI/CD

```yaml
# Esempio concettuale — NON ancora in repo
- schedule: nightly
  env:
    PLAYWRIGHT_BASE_URL: https://dnd-manager-j8h5.vercel.app
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets... }}
  run: npm run test:e2e:ai-prod
  timeout-minutes: 15
```

- **Non** mettere P1 AI su ogni PR (costo + flakiness OpenRouter/HF).
- PR: solo P0 locale `:3099` (già 44 test in `qa-playwright-test-plan.md`).
- Secrets: `SUPABASE_SERVICE_ROLE_KEY`, credenziali GM già provisionate.

### 7.3 Osservabilità

- Log strutturato `[generateWikiMarkdownAction]`, `[syncSessionToCampaignMemory]` con `campaignId`, `durationMs`, `chunkCount`.
- Endpoint admin/debug (GM-only) «ultimo prompt immagine» per audit negative prompt — utile per QA senza leggere log Vercel.

### 7.4 Documentazione

- Aggiornare `docs/qa-playwright-test-plan.md` con sezione **P2 AI prod** e link a questo handoff.
- Documentare in UI (tooltip) che NPC richiede razza/classe/livello prima di «Genera testo».

---

## 8. Migliorie prodotto suggerite (priorità dev)

### P1 — Alto impatto

1. ~~**Parità edit/create per testo IA**~~ ✅ Fatto — `edit-entity-dialog.tsx` (Assistente IA collassabile).
2. ~~**Chiusura automatica dialog Bacchetta**~~ ✅ Fatto — `create-entity-dialog.tsx`.
3. ~~**Cleanup sandbox API/script**~~ ✅ Fatto — `scripts/e2e-cleanup-long-campaign-artifacts.ts`, invocato da `global-teardown.ts`, npm `e2e:cleanup-artifacts`.

### P2 — Medio impatto

4. ~~**Feedback post-save memoria wiki**~~ ✅ Fatto — messaggio toast con chunk count in `createEntity` / `updateEntity`.

5. **Test harness prompt immagine**  
   Flag dev `AI_LOG_IMAGE_PROMPT=1` per assert automated su negative prompt nel payload HF.

6. **Timeout configurabili server-side**  
   Vercel function max duration per `generateFullAiWikiEntity` — documentare limite attuale vs catena NPC.

### P3 — Backlog

7. Assert semantico più stretto in test 5 (match token esatto vs keyword sigillo/porto).
8. Test «Reindicizza memoria» dopo delete wiki entity (coerenza index).
9. Test player: memoria **non** visibile fuori tab GM (security regression).

---

## 9. Inventario file introdotti/modificati (QA)

| Path | Ruolo |
|------|-------|
| `tests/e2e/ai/long-campaign-ai.prod.spec.ts` | Suite serial 7 scenari + setup |
| `tests/e2e/helpers/ai-memory-db.ts` | Assert Supabase chunks + ai_context |
| `tests/e2e/helpers/wiki-ai-ui.ts` | Helper Bacchetta, Assistente, edit |
| `tests/e2e/helpers/campaign-ui.ts` | `pickCalendarTodayPastTime` |
| `playwright.config.ts` | Project `ai-prod`, timeout 600s |
| `scripts/e2e-env.ts` | `resolveProductionBaseUrl`, host Vercel |
| `package.json` | script `test:e2e:ai-prod` |
| `docs/qa-ai-long-campaign-prod-report.md` | Report sintetico QA |
| `scripts/e2e-cleanup-long-campaign-artifacts.ts` | Cleanup wiki `E2E AI*` e sessioni `E2E Live*` |
| `docs/qa-ai-developer-handoff.md` | Questo documento |

---

## 10. Checklist per l’agente sviluppatore

Prima di modificare AI/memoria/wiki:

- [ ] Leggere `campaign-memory-indexer.ts` e capire quando parte sync (save wiki, close session, update session summary).
- [ ] Verificare se la modifica impatta **long only** (`isLongCampaignType`).
- [ ] Eseguire `npm run test:e2e:ai-prod` se tocchi: architect, wiki generator, session close, memory query, image generator.
- [ ] Eseguire `npm run test:e2e` locale se tocchi auth/routing condiviso.
- [ ] Non committare `.env.local` né `tests/e2e/.auth/credentials.json`.
- [ ] Dopo test prod, verificare che teardown abbia privatizzato `E2E-QA Long` (o ripubblicare manualmente se serve demo).

Comandi rapidi:

```bash
# QA AI produzione (completa)
npm run test:e2e:ai-prod

# Solo assert DB campagna long
npx tsx -e "
import { loadEnvLocal } from './scripts/e2e-env';
import { fetchAiMemorySnapshot } from './tests/e2e/helpers/ai-memory-db';
import { readFileSync } from 'fs';
loadEnvLocal();
const id = JSON.parse(readFileSync('tests/e2e/.auth/credentials.json','utf8')).campaigns.longId;
fetchAiMemorySnapshot(id).then(console.log);
"

# E2E locale regressione generale
npm run test:e2e
```

---

## 11. Conclusione per planning

Il **core business** (memoria campagna long alimentata da wiki + session summary, consumata da generazioni AI) è **validato in produzione**.

Il **processo** necessita ancora di: tiering test e CI nightly (non per-PR). I fix P1 UX (parità edit/create, Bacchetta, feedback memoria, cleanup sandbox) sono **implementati** — vedi §12.

Priorità suggerita sprint prossimo: **tiering test CI (P0/P1/P2)** + **tooltip NPC razza/classe/livello** + **integrazione P2 AI in qa-playwright-test-plan.md**.

---

## 12. Implementazioni post-QA (2026-06-13)

| Intervento | File principali |
|------------|-----------------|
| «Genera testo» in modifica wiki (NPC/luogo/oggetto/lore) | `edit-entity-dialog.tsx` |
| Bacchetta IA si chiude al successo + scroll al form | `create-entity-dialog.tsx` |
| Toast memoria campagna con N chunk dopo save wiki long | `wiki-actions.ts`, `campaign-memory-indexer.ts` |
| Cleanup artifact E2E (wiki + sessioni + chunk memoria) | `scripts/e2e-cleanup-long-campaign-artifacts.ts`, `global-teardown.ts` |

Comandi cleanup manuale:

```bash
PLAYWRIGHT_BASE_URL=https://dnd-manager-j8h5.vercel.app npm run e2e:cleanup-artifacts
```
