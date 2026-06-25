# Export Package: Overhaul sistemi generazione AI (testo + immagini wiki)

## Export ID

bnd-ai-generation-systems-2026-06-20

## Origine

Barber & Dragons

## Destinazione prevista

gmflow.app

## Scope autorizzato

Export completo delle modifiche AI effettuate tra il **19 e il 20 giugno 2026** (4 commit: `cfc11e0`, `b549317`, `d2ca9e4`, `39612ee`).

### 1. Standardizzazione immagini su OpenRouter

- Modello fisso sito: `openai/gpt-5-image-mini` (override `AI_IMAGE_MODEL`)
- Aspect ratio per entità: `1:1` NPC/mostri, `16:9` luoghi
- Rimozione routing multi-provider immagini (HF / SiliconFlow) dal flusso produzione
- Rimozione selettore provider/modello immagine dalla UI wiki e admin collegati

### 2. Testo wiki su OpenRouter Gemma

- Modello wiki dedicato: `google/gemma-4-31b-it:free` (override `WIKI_TEXT_MODEL`)
- `generateContextualText` e `generateWikiMarkdownAction` usano `generateOpenRouterWikiText` al posto di HuggingFace per la generazione testuale wiki
- Nuove API chat multi-turno OpenRouter: `generateOpenRouterWikiTextMessages`

### 3. Chat multi-turno wiki (Bacchetta IA + Assistente IA)

- Componente UI riusabile `WikiTextGenChat` (modalità `structured` e `markdown`)
- Server actions: `chatWikiStructuredTextAction`, `chatWikiMarkdownTextAction`
- Flusso Bacchetta IA: genera bozza testuale in chat → preview → generazione immagine **deferred** (non più catena monolitica testo+immagine)
- Server action: `generateMagicDraftImageAction`
- Assistente IA nel form creazione: sostituisce il prompt singolo con chat iterativa

### 4. Prompt immagini luoghi più intelligenti

- Nuovo modulo `image-prompt-location.ts`: rilevamento scene interior/exterior, ancoraggi visivi per venue (bottega, macellaio, taverna…)
- Soppressione selettiva memoria entità «luogo genitore» quando il soggetto è un locale specifico
- Negative prompt aggiuntivi per evitare cityscape/panorama su scene interior

### 5. Refactor generator / parsing JSON

- `buildStructuredWikiTextSystemPrompt`, `parseStructuredWikiJson`, `formatStructuredWikiDraftForChat` estratti in `generator.ts` per riuso chat

### 6. Aggiornamenti admin/debug (opzionali ma coerenti col refactor)

- `src/app/admin/image-benchmark/*` — allineati al modello OpenRouter fisso
- `src/app/admin/ai-image-prompt-debug/*` — rimosso preview payload HF/SiliconFlow
- `src/app/api/check-env/route.ts` — espone `AI_IMAGE_MODEL` al posto di `AI_IMAGE_PROVIDER`

### 7. Test unitari

- `src/lib/ai/__tests__/image-prompt-location.test.ts` (nuovo)
- `src/lib/ai/__tests__/image-prompt-entity-memory.test.ts` (esteso)

## Scope escluso

- **Non esportare** client legacy immagini non toccati in questi commit: `huggingface-client.ts` (generazione immagine), `siliconflow-image-client.ts` — restano in B&D ma **non fanno più parte del flusso wiki**
- **Non esportare** migrazioni DB (nessuna presente in questi commit)
- **Non esportare** modifiche non-AI presenti fuori dal diff dei 4 commit
- **Non esportare** branding/CSS tema Barber (`barber-*`) come requisito — va adattato al design system gmflow
- **Non esportare** `uploadToTelegram` / storage Telegram se gmflow usa un altro backend storage (vedi adattamento)
- **Non esportare** RAG embedding path: `generateRagEmbedding` in `wiki-text-generator.ts` resta su HuggingFace — **fuori scope** salvo decisione gmflow di migrare anche embeddings
- **Non esportare** provider testo generico non-wiki (`AI_TEXT_PROVIDER`, Ollama, HF chat) — invariati salvo side-effect indiretti
- **Non esportare** altre feature wiki non collegate (bestiario, relazioni, missioni, ecc.) se non già presenti in gmflow

## Sintesi della modifica

Refactoring end-to-end della generazione AI wiki in B&D:

1. **Immagini**: un solo provider (OpenRouter) e un solo modello default (`gpt-5-image-mini`), senza scelta utente.
2. **Testo wiki**: OpenRouter con modello Gemma dedicato, con chat conversazionale multi-turno al posto di prompt one-shot.
3. **UX Bacchetta IA**: separazione testo (chat + preview) e immagine (generazione on-demand dopo approvazione bozza).
4. **Qualità immagini luoghi**: prompt builder con scene framing interior, visual anchors e filtro memoria campagna per evitare panorami di città quando si chiede un locale.

## Comportamento prima

- L'utente poteva scegliere provider immagine (HuggingFace FLUX / SiliconFlow) via hook + API `/api/ai/image-providers` e componente `AiImageProviderSelect`
- Bacchetta IA (NPC/Luogo): catena server monolitica `generateFullAiWikiEntity` — testo + immagine in un'unica chiamata, nessuna preview intermedia
- Assistente IA nel form: singolo textarea prompt → `generateWikiMarkdownAction` one-shot
- Testo wiki strutturato (JSON): generato via HuggingFace `generateAiText`
- Immagini luoghi: stesso technical line generico «environmental wide shot»; memoria campagna poteva iniettare lore di città/regioni genitore anche per botteghe/locande specifiche

## Comportamento dopo

- Nessun selettore provider immagine; tutte le generazioni wiki/admin passano da OpenRouter con `AI_IMAGE_MODEL` (default `openai/gpt-5-image-mini`)
- Bacchetta IA: chat multi-turno (`WikiTextGenChat` mode `structured`) → bozza JSON preview → pulsante «Genera immagine» separato → «Applica al form»
- Assistente IA: chat multi-turno (`WikiTextGenChat` mode `markdown`) con affinamenti iterativi; primo turno delega a `generateWikiMarkdownAction`, turni successivi usano system prompt di refinement
- Testo wiki: OpenRouter Gemma (`WIKI_TEXT_MODEL`) con retry e timeout 120s
- Immagini luoghi: detection `interior_commerce` / `interior_tavern` / ecc., scene anchors (es. meat hooks per macellaio), negative «no wide cityscape», soppressione riferimenti memoria a luoghi genitore quando il soggetto è un venue specifico

## File B&D coinvolti

### Aggiunti

| File | Ruolo |
|------|-------|
| `src/lib/actions/wiki-text-chat.ts` | Server actions chat multi-turno wiki |
| `src/components/wiki/wiki-text-gen-chat.tsx` | UI chat riusabile (structured + markdown) |
| `src/lib/ai/image-prompt-location.ts` | Logica scene/anchor luoghi |
| `src/lib/ai/__tests__/image-prompt-location.test.ts` | Test location prompts |

### Modificati (core — indispensabili)

| File | Ruolo |
|------|-------|
| `src/lib/ai/generator.ts` | OpenRouter wiki text; prompt system estratti; parse JSON |
| `src/lib/ai/openrouter-client.ts` | Modello wiki Gemma; chat multi-turno; `SITE_WIKI_TEXT_MODEL` |
| `src/lib/ai/openrouter-image-preview.ts` | `SITE_IMAGE_MODEL`, aspect ratio per entità |
| `src/lib/ai/image-provider.ts` | Semplificato → solo OpenRouter (`generateSiteImage*`) |
| `src/lib/ai/image-prompt-builder.ts` | Integrazione location scene; rimosso `getProviderPayloadForPreview` |
| `src/lib/ai/image-prompt-entity-memory.ts` | Soppressione parent-place memory |
| `src/lib/ai/wiki-text-generator.ts` | Testo via OpenRouter; RAG embedding invariato (HF) |
| `src/lib/ai/index.ts` | Re-export aggiornati |
| `src/lib/actions/ai-generator.ts` | Portrait via `generateSiteImageForEntity` |
| `src/lib/actions/ai-wiki-chain.ts` | `generateMagicDraftImageAction`; image prompt seed; no provider option |
| `src/components/wiki/create-entity-dialog.tsx` | Magic wand chat + deferred image; assist chat |
| `src/components/wiki/edit-entity-dialog.tsx` | Assist chat in modifica |
| `src/global-env.d.ts` | `AI_IMAGE_MODEL`, `WIKI_TEXT_MODEL`; fix commento SiliconFlow |

### Modificati (supporto — opzionali)

| File | Ruolo |
|------|-------|
| `src/lib/image-benchmark/models.ts` | Modello benchmark = SITE_IMAGE_MODEL |
| `src/lib/image-benchmark/providers/index.ts` | Export openrouter |
| `src/lib/image-benchmark/providers/openrouter-provider.ts` | Usato da `image-provider.ts` produzione |
| `src/app/admin/image-benchmark/*` | UI admin benchmark allineata |
| `src/app/admin/ai-image-prompt-debug/*` | Debug prompt senza multi-provider |
| `src/app/api/check-env/route.ts` | Diagnostica env dev |
| `src/lib/ai/__tests__/image-prompt-entity-memory.test.ts` | Test soppressione parent place |

### Eliminati (da rimuovere anche in gmflow se presenti)

| File | Ruolo |
|------|-------|
| `src/components/ai/ai-image-provider-select.tsx` | Selettore provider immagine |
| `src/lib/hooks/use-ai-image-provider.ts` | Hook persistenza provider in localStorage |
| `src/app/api/ai/image-providers/route.ts` | API lista provider |

### Dipendenze esterne ai file del diff (non modificate ma richieste)

| File | Ruolo |
|------|-------|
| `src/lib/image-benchmark/providers/openrouter-provider.ts` | Client HTTP generazione immagine OpenRouter |
| `src/lib/telegram-storage.ts` | Upload immagine generata (B&D) |
| `src/lib/ai/huggingface-client.ts` | Solo `generateRagEmbedding` per RAG wiki markdown |
| `src/lib/campaign-wiki-ai-memory.ts` | Memoria campagna long per prompt |
| `src/utils/supabase/server.ts`, `admin.ts` | Auth + DB |

## Backend coinvolto

- **Server Actions Next.js** (nessuna nuova API route REST, salvo rimozione `/api/ai/image-providers`):
  - `chatWikiStructuredTextAction`
  - `chatWikiMarkdownTextAction`
  - `generateMagicDraftImageAction`
  - `generateContextualPortraitAction` (signature cambiata: ritorna `model` non `provider`)
  - `generateFullAiWikiEntity` (signature: rimosso `options.imageProvider`)
- **Chiamate esterne server-side**:
  - OpenRouter `POST /v1/chat/completions` (testo wiki + immagini)
  - OpenRouter `POST /v1/embeddings` (invariato, usato altrove — non parte di questo export salvo memoria campagna già esistente)
- **Auth**: verifica sessione Supabase + ruolo `gm` o `admin` su tutte le action chat/generazione

## Database coinvolto

**Nessuna migrazione schema.**

Lettura esistente:

- `campaigns.ai_context`, `campaigns.type` — contesto Architetto + tipo campagna (long → memoria wiki)
- `profiles.role` — autorizzazione GM/admin
- Tabelle memoria campagna wiki (via `fetchLongCampaignWikiMemoryPromptBlock`, `resolveImagePromptEntityReferences`) — già presenti

Scrittura: invariata rispetto al flusso wiki pre-esistente (salvataggio entità dopo apply form).

## Storage coinvolto

- **Upload immagine generata**: B&D usa `uploadToTelegram` → URL pubblico Telegram
- gmflow deve mappare lo stesso hook al proprio storage (Blob, S3, Supabase Storage, ecc.)
- Nessun nuovo bucket/path introdotto da questi commit

## Provider o servizi esterni coinvolti

| Provider | Uso in questo export | Note |
|----------|---------------------|------|
| **OpenRouter** | Testo wiki (Gemma), immagini (`gpt-5-image-mini`) | **Obbligatorio** |
| HuggingFace | Solo `generateRagEmbedding` in wiki markdown assist | Opzionale se gmflow ha già embedding alternativo |
| SiliconFlow | **Rimosso** dal flusso immagine wiki | Non importare |
| HuggingFace FLUX | **Rimosso** dal flusso immagine wiki | Non importare |
| Ollama | Non toccato | — |

## Variabili ambiente richieste

### Obbligatorie (produzione wiki AI)

```env
OPENROUTER_API_KEY=           # Chiave OpenRouter — obbligatoria per testo wiki e immagini
```

### Consigliate (override modello)

```env
AI_IMAGE_MODEL=openai/gpt-5-image-mini    # Default se assente
WIKI_TEXT_MODEL=google/gemma-4-31b-it:free # Default se assente
OPENROUTER_HTTP_REFERER=                  # Best practice OpenRouter (URL sito gmflow)
OPENROUTER_APP_TITLE=                     # Nome app gmflow (NON "Barber And Dragons")
```

### Opzionali (già esistenti, non modificate da questo export)

```env
OPENROUTER_BASE_URL=                      # Default https://openrouter.ai/api/v1
OPENROUTER_MODEL=                         # Testo generico non-wiki (default gpt-4o-mini)
OPENROUTER_EMBEDDING_MODEL=               # Embeddings memoria campagna
HUGGINGFACE_API_KEY / HF_TOKEN            # Solo se si mantiene RAG embedding HF in wiki-text-generator
```

### Deprecate / da rimuovere dalla config gmflow

```env
AI_IMAGE_PROVIDER=          # Non più letta dal flusso produzione immagini wiki
SILICONFLOW_*               # Non più usate per immagini wiki (client legacy può restare orphan)
```

## Parti specifiche B&D da rimuovere

| Elemento | Dove | Azione gmflow |
|----------|------|---------------|
| `"Barber And Dragons"` | `openrouter-client.ts` → `buildOpenRouterHeaders` default `X-Title` | Sostituire con nome prodotto gmflow o env |
| Classi CSS `barber-*` | `wiki-text-gen-chat.tsx`, dialog wiki | Adattare al design system gmflow |
| Copy UI italiano hardcoded | Chat, toast, placeholder | i18n o copy gmflow |
| `uploadToTelegram` | `ai-generator.ts` | Sostituire con storage gmflow |
| Check ruolo `gm` \| `admin` | `wiki-text-chat.ts`, `ai-wiki-chain.ts` | Allineare RBAC multi-tenant gmflow |
| Admin pages `image-benchmark`, `ai-image-prompt-debug` | Solo B&D QA | Importare solo se gmflow ha equivalente admin |
| `src/app/api/check-env/route.ts` | Dev-only B&D | Non importare in produzione gmflow |

## Adattamento richiesto per gmflow

1. **OpenRouter obbligatorio** per flussi wiki testo+immagine; configurare `OPENROUTER_API_KEY` per tenant o globale SaaS.
2. **Rimuovere** componenti/hook/API multi-provider immagine se presenti in gmflow.
3. **Integrare `WikiTextGenChat`** nei dialog creazione/modifica entità wiki gmflow (stessi punti di mount di B&D: pannello Bacchetta IA + Assistente IA).
4. **Storage immagini**: implementare adapter upload post-generazione (stessa interfaccia async → URL pubblico).
5. **RBAC**: mappare `assertGmAuth()` al modello permessi gmflow (owner campagna, seat GM, piano Pro, ecc.).
6. **Branding headers OpenRouter**: `OPENROUTER_APP_TITLE`, `OPENROUTER_HTTP_REFERER` con dominio gmflow.
7. **Modello Gemma free tier**: valutare se il tier free OpenRouter è accettabile in produzione SaaS; considerare modello paid di fallback.
8. **RAG embedding**: decidere se mantenere HF per `generateRagEmbedding` o migrare a `generateOpenRouterEmbedding` (già disponibile in `openrouter-client.ts`).
9. **Multi-tenant**: verificare che `campaignId` nelle action sia sempre scoped al tenant dell'utente (già pattern B&D, da rinforzare in gmflow).
10. **Admin benchmark** (opzionale): se importato, verificare che non esponga dati cross-tenant.

## Ambiguità rilevate

| # | Ambiguità | Cosa NON è incluso finché non chiarito |
|---|-----------|----------------------------------------|
| A1 | Utente ha chiesto «tutto» sui sistemi AI — il diff include anche pagine **admin debug/benchmark**, non solo flusso utente GM | Admin pages marcate **opzionali**; gmflow Import Agent deve chiedere se importarle |
| A2 | `generateRagEmbedding` resta HuggingFace mentre testo wiki è OpenRouter | Migrazione embedding **non** in scope; gmflow potrebbe voler uniformare tutto su OpenRouter |
| A3 | Client `siliconflow-image-client.ts` e `huggingface-client.ts` (immagini) esistono ancora nel repo B&D ma sono **orphan** per wiki | gmflow non deve reintrodurli nel flusso; eventuale cleanup file legacy è decisione separata |
| A4 | Modello `google/gemma-4-31b-it:free` — suffisso `:free` può cambiare disponibilità/costi su OpenRouter | gmflow deve validare model ID attuale su openrouter.ai/models |
| A5 | Modello `openai/gpt-5-image-mini` — verificare esistenza e pricing su OpenRouter al momento dell'import | Fallback env `AI_IMAGE_MODEL` documentato |
| A6 | Stato gmflow rispetto a `create-entity-dialog` / `edit-entity-dialog` — potrebbero divergere strutturalmente | Import Agent deve fare merge manuale UI, non copy-paste cieco del file intero se gmflow ha UX diversa |
| A7 | `generateFullAiWikiEntity` esiste ancora ma la UI Bacchetta IA non la usa più | Esportare per retrocompat API interna; gmflow può deprecarla se nessun caller |

## Rischi

| Rischio | Severità | Mitigazione |
|---------|----------|-------------|
| Costi OpenRouter (immagini + chat multi-turno) | Alta | Rate limit, quota per tenant, caching bozze |
| Modello Gemma free instabile o rate-limited | Media | Fallback `WIKI_TEXT_MODEL` paid; retry già implementati (3 tentativi) |
| Regressioni immagini luoghi (false positive interior detection) | Media | Test `image-prompt-location.test.ts`; QA manuale casi edge |
| Rimozione provider HF/SiliconFlow rompe gmflow se altri flussi li usavano | Media | Grep gmflow per `generateAiImageWithProvider`, `AI_IMAGE_PROVIDER` |
| Chat multi-turno aumenta token/costo vs one-shot | Media | Limite messaggi UI; warning costi |
| Upload Telegram-specifico non portabile | Bassa | Adapter storage obbligatorio in gmflow |
| JSON parse failures da Gemma in chat structured | Media | `parseStructuredWikiJson` già gestisce errori; UX toast |

## Test minimi richiesti

### Unit

- [ ] `image-prompt-location.test.ts` — scene kind, anchors, venue detection
- [ ] `image-prompt-entity-memory.test.ts` — `shouldSuppressParentPlaceMemoryReference`

### Integrazione / E2E

- [ ] Bacchetta IA NPC: chat → bozza preview → genera immagine → applica form
- [ ] Bacchetta IA Luogo: verificare immagine interior (es. «bottega del macellaio») non mostra cityscape
- [ ] Assistente IA creazione: primo prompt → bozza → messaggio refinement → apply
- [ ] Assistente IA modifica entità: chat refinement su voce esistente
- [ ] Generazione portrait standalone (pulsante immagine form): usa OpenRouter, aspect ratio corretto
- [ ] Utente non autorizzato: action chat rifiutate
- [ ] Env senza `OPENROUTER_API_KEY`: errore chiaro lato server
- [ ] Verificare assenza selettore provider immagine in UI

### Regressione

- [ ] Flussi wiki senza AI (creazione manuale) invariati
- [ ] Salvataggio entità post-apply bozza chat
- [ ] Campagna long: memoria campagna ancora iniettata nel system prompt chat

## Import Contract per gmflow

### Fase 1 — Core backend (obbligatoria)

1. Applicare diff su file `src/lib/ai/*` elencati in Scope autorizzato
2. Aggiungere `src/lib/actions/wiki-text-chat.ts`
3. Aggiornare `src/lib/actions/ai-generator.ts`, `ai-wiki-chain.ts`
4. Aggiornare `src/global-env.d.ts` con `AI_IMAGE_MODEL`, `WIKI_TEXT_MODEL`
5. Configurare env `OPENROUTER_API_KEY`, `OPENROUTER_APP_TITLE`, `OPENROUTER_HTTP_REFERER`
6. Rimuovere file eliminati in B&D se presenti in gmflow

### Fase 2 — UI wiki (obbligatoria)

1. Aggiungere `src/components/wiki/wiki-text-gen-chat.tsx` (adattare CSS)
2. Merge `create-entity-dialog.tsx` e `edit-entity-dialog.tsx`:
   - Stato `magicDraft`, `magicChatKey`, `assistChatDraft`
   - Sostituire prompt one-shot con `WikiTextGenChat`
   - Flusso deferred image via `generateMagicDraftImageAction`
   - Rimuovere import `AiImageProviderSelect`, `useAiImageProvider`, `generateFullAiWikiEntity` dalla UI magic wand

### Fase 3 — Adapter gmflow (obbligatoria)

1. Storage upload immagine post-`generateSiteImageForEntity`
2. RBAC nelle server actions
3. Branding OpenRouter headers

### Fase 4 — Opzionale

1. Admin benchmark/debug pages
2. Test files
3. `check-env` route dev

### Ordine commit suggerito (allineato a B&D)

```
1. cfc11e0 — OpenRouter image standardization + rimozione multi-provider
2. b549317 — Gemma wiki text + location prompts + magic preview UX
3. d2ca9e4 — fix global-env.d.ts
4. 39612ee — multi-turn chat
```

### Verifica post-import

```bash
# Cercare riferimenti obsoleti
rg "AI_IMAGE_PROVIDER|generateAiImageWithProvider|AiImageProviderSelect|useAiImageProvider|image-providers"
rg "generateAiText" src/lib/ai/generator.ts  # deve essere assente
rg "generateOpenRouterWikiText" src/lib/ai/generator.ts  # deve essere presente
```

## Prompt per gmflow Import Agent

```
Sei l'Import Agent di gmflow.app. Devi importare l'export package:

  Export ID: bnd-ai-generation-systems-2026-06-20
  File package: docs/gmflow-export-packages/2026-06-20-ai-generation-systems-export.md

CONTESTO
Barber & Dragons ha refactorato i sistemi di generazione AI wiki tra il 19-20 giu 2026.
gmflow deriva dalla stessa base ma evolve in parallelo. Importa SOLO quanto descritto nel package.

OBIETTIVO
Portare in gmflow:
1. Generazione immagini wiki unificata su OpenRouter (modello default openai/gpt-5-image-mini)
2. Generazione testo wiki su OpenRouter Gemma (WIKI_TEXT_MODEL)
3. Chat multi-turno per Bacchetta IA e Assistente IA wiki
4. Prompt builder immagini luoghi migliorato (interior scenes, venue anchors, parent-place suppression)
5. Rimozione plumbing multi-provider immagine (HF/SiliconFlow) dal flusso produzione

COMMIT DI RIFERIMENTO B&D (in ordine)
- cfc11e0 feat(ai): standardize site image generation on gpt-5-image-mini via OpenRouter
- b549317 feat(ai): Gemma wiki text, magic preview UX, and smarter location image prompts
- d2ca9e4 fix(types): repair corrupted WIKI_TEXT_MODEL entry in global-env.d.ts
- 39612ee feat(wiki): add multi-turn chat for AI text generation and refinement

FILE NUOVI (creare)
- src/lib/actions/wiki-text-chat.ts
- src/components/wiki/wiki-text-gen-chat.tsx
- src/lib/ai/image-prompt-location.ts
- src/lib/ai/__tests__/image-prompt-location.test.ts (opzionale)

FILE DA MODIFICARE (core)
- src/lib/ai/generator.ts
- src/lib/ai/openrouter-client.ts
- src/lib/ai/openrouter-image-preview.ts
- src/lib/ai/image-provider.ts
- src/lib/ai/image-prompt-builder.ts
- src/lib/ai/image-prompt-entity-memory.ts
- src/lib/ai/wiki-text-generator.ts
- src/lib/ai/index.ts
- src/lib/actions/ai-generator.ts
- src/lib/actions/ai-wiki-chain.ts
- src/components/wiki/create-entity-dialog.tsx
- src/components/wiki/edit-entity-dialog.tsx
- src/global-env.d.ts

FILE DA ELIMINARE (se presenti in gmflow)
- src/components/ai/ai-image-provider-select.tsx
- src/lib/hooks/use-ai-image-provider.ts
- src/app/api/ai/image-providers/route.ts

ADATTAMENTI OBBLIGATORI GMFLOW
- OPENROUTER_APP_TITLE: usare "gmflow" (o env), NON "Barber And Dragons"
- Sostituire uploadToTelegram con storage gmflow
- Adattare classi CSS barber-* nel componente WikiTextGenChat
- Allineare assertGmAuth() al RBAC multi-tenant gmflow
- Configurare OPENROUTER_API_KEY (globale o per-tenant secondo architettura gmflow)

ENV RICHIESTE
- OPENROUTER_API_KEY (obbligatoria)
- AI_IMAGE_MODEL (opzionale, default openai/gpt-5-image-mini)
- WIKI_TEXT_MODEL (opzionale, default google/gemma-4-31b-it:free)
- OPENROUTER_HTTP_REFERER, OPENROUTER_APP_TITLE (consigliate)

NON IMPORTARE
- Migrazioni DB (nessuna in questo export)
- Client immagine HF/SiliconFlow come provider produzione wiki
- Branding Barber & Dragons
- Admin benchmark/debug (salvo esplicita richiesta)
- Segreti o chiavi API

AMBIGUITÀ DA RISOLVERE PRIMA DEL MERGE
- A2: mantenere generateRagEmbedding su HuggingFace o migrare a OpenRouter embeddings?
- A4/A5: validare model ID OpenRouter attuali (Gemma free, gpt-5-image-mini)
- A6: se i dialog wiki gmflow sono divergenti, fare merge selettivo UI non file intero

TEST POST-IMPORT
Eseguire checklist "Test minimi richiesti" nel package.
grep zero risultati per: AI_IMAGE_PROVIDER, AiImageProviderSelect, useAiImageProvider

VINCOLI
- Non fare porting globale B&D → gmflow
- Non modificare altre feature non elencate
- Segnalare ogni deviazione dal package nel PR description
```

## Vincoli

- Non modificare gmflow da questo agente B&D
- Non includere segreti, chiavi API o valori env reali
- Non includere codice non collegato ai 4 commit del 19-20 giu 2026
- Non includere branding Barber & Dragons se non come riferimento da rimuovere
- Admin pages e test unitari sono opzionali — esplicitamente fuori scope obbligatorio se gmflow non li richiede
- Il prompt Import Agent sopra è valido: ambiguità A1-A7 documentate ma non bloccanti per import core backend+UI wiki

---

**Commit range B&D:** `cfc11e0^..39612ee` (32 file, +1540 / −1053 linee)

**Generato:** 2026-06-20 — Export Agent Barber & Dragons
