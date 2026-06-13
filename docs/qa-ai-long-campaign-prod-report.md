# QA AI — Campagna long in produzione

- **Data**: 2026-06-13
- **Campagna**: `E2E-QA Long` (`31dec3d2-18ca-47a7-a1fe-4365d2ade01f`)
- **Ambiente**: produzione Vercel `https://dnd-manager-j8h5.vercel.app` (stesso deploy di `barberandragons.com`)
- **Account GM**: `e2e-gm@barberandragons.qa`
- **Suite**: `npm run test:e2e:ai-prod` → **10/10 passed** (~3.6 min)

---

## Verdetto

Il flusso AI end-to-end sulla campagna long **funziona in produzione**: contesto GM, paletti immagine (positivi/negativi), wiki con memoria, generazione testo, chiusura sessione con riassunto, indicizzazione memoria, query semantica, rigenerazione wiki e generazione immagine.

---

## Scenari eseguiti

| # | Scenario | Esito | Note |
|---|----------|-------|------|
| 1 | **Architetto AI** (tab Solo GM) | ✅ | Descrizione gothic-noir → 6 paletti salvati in `campaigns.ai_context` |
| 2 | **Wiki + memoria IA** | ✅ | Voce con `include_in_campaign_ai_memory`; chunk `wiki` in DB entro ~90s |
| 3 | **Assistente IA → Genera testo** | ✅ | Richiede razza/classe/livello NPC; testo >80 char; ~1.6 min |
| 4 | **Sessione live → chiusura wizard** | ✅ | Sessione oggi con orario passato; riassunto con token univoco `E2E-AI-*-SESSION` |
| 5 | **Query memoria campagna** | ✅ | Risposta coerente su sigillo/porto/sessione; fonti `session_summary` |
| 6 | **Bacchetta IA (lore)** | ✅ | Usa memoria sessione; bozza → Chiudi dialog → Crea voce (~40s con tipo lore) |
| 7 | **Generazione immagine IA** | ✅ | Edit wiki → `Genera immagine IA`; rispetta `visual_negative` in DB (~15s) |

---

## Stato DB post-test (campagna long)

```json
{
  "chunkCount": 33,
  "sessionSummaryChunks": 4,
  "wikiChunks": 29,
  "visual_negative": "jeans, modern clothing, cars, cyberpunk, sci-fi, phones, neon colors, cartoonish style, bright futuristic technology"
}
```

La memoria si aggiorna **automaticamente** alla chiusura sessione (chunk `session_summary` visibile subito dopo il wizard, senza reindicizzazione manuale).

---

## Osservazioni / rischi

1. **Dominio custom**: da questo ambiente `barberandragons.com` non risolve DNS; i test usano l’URL Vercel ufficiale del progetto. In locale/browser l’utente può usare entrambi.
2. **Bacchetta IA NPC/location**: catena testo+immagine può superare **5 minuti** o fallire per timeout provider; per test automatizzati conviene `lore`/`item` (solo testo).
3. **Dialog Bacchetta**: dopo la generazione il modale resta aperto — bisogna **Chiudi** prima di `Crea voce` (comportamento UI, non bug).
4. **Sessioni E2E accumulate**: ogni run crea sessioni/wiki con prefisso `E2E`; pulizia periodica consigliata.
5. **Teardown**: a fine run prod le campagne `E2E-QA%` tornano **private** (inclusa Long).

---

## Come rieseguire

```bash
npx playwright install chromium   # prima volta
npm run test:e2e:ai-prod
```

File principali:

- `tests/e2e/ai/long-campaign-ai.prod.spec.ts`
- `tests/e2e/helpers/ai-memory-db.ts` (verifica Supabase)
- `tests/e2e/helpers/wiki-ai-ui.ts`

---

## Raccomandazioni follow-up

- [ ] Aggiungere test negativo: verificare che `visual_negative` compaia nel prompt HF (log server-side o mock).
- [ ] Test edit wiki **rigenera testo** quando/se verrà esposto anche in `edit-entity-dialog`.
- [ ] Job di cleanup sessioni/wiki `E2E AI*` sulla campagna long sandbox.
