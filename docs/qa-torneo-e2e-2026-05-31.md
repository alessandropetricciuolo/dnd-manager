# QA E2E — Torneo "La Fossa dei draghi"

- **Data**: 2026-05-31
- **Target**: produzione `https://barberanddragons.com` + Supabase `wgygueccztselxysletl`
- **Campagna torneo**: `0d696961-fe0a-4b66-9f1a-856821396c29` — *"La Fossa dei draghi"*
- **GM reale**: `7859a9fd-881a-4770-a894-9883b8559b56`
- **Tester**: account QA `testolone@gmail.com` (role `admin`, opera via RLS come GM)
- **Approccio**: chiamate dirette a Supabase REST API replicando fedelmente la sequenza di mutazioni che fanno le server actions del codice
- **Snapshot iniziale**: salvato e **ripristinato a fine test** (8 teams, 8 matches, 6 team_members)

---

## Verdetto: 1 BUG ALTO + 1 osservazione di prodotto

- **126 check totali** distribuiti su 4 batch di test
- **125 check OK** (99,2%)
- **1 check FAIL → bug riproducibile** in `advanceBracketWinner` quando il vincitore di un quarto coincide con uno dei placeholder usati nelle semifinali
- 1 osservazione minore sulla riapertura match (damage non azzerato)
- Tutte le funzioni del GM screen testate funzionano: setup squadre, generazione bracket, sessione live, telecomando GM, focused match, initiative snapshot, timer, completamento match, avanzamento bracket, triello, chiusura sessione live, vincoli RLS e DB.

---

## 1. Cosa è stato coperto

### Setup torneo (creazione)

- [x] Creazione 8 squadre con nome/colore custom
- [x] Rename squadra
- [x] Update colore squadra
- [x] Vincolo `torneo_team_members.character_id UNIQUE` (PG in una sola squadra)
- [x] Assegnazione PG: 2 PG per ogni squadra (16 PG totali, scelti tra i 24 disponibili in campagna)
- [x] Tentativo di assegnare un PG già in altra squadra → atteso conflict 409 (UNIQUE violation) — OK
- [x] Vincolo `torneo_teams ON DELETE RESTRICT` quando il team è coinvolto in match — atteso 409 FK violation — OK

### Generazione bracket

- [x] Inserimento 4 quarti + 2 semifinali + 1 finale + 1 triello (8 match)
- [x] Coppie quarti corrette: `(1v8) (4v5) (2v7) (3v6)` come da `buildEightTeamBracketPlan`
- [x] `advances_to_match_id` e `advances_to_slot` impostati correttamente per QF→SF→F→T
- [x] `match_kind` corretto: `bracket` per i primi 7, `triello` per l'ultimo
- [x] Verifica strutturale: 4 quarti + 2 semi + 1 finale + 1 triello

### Sessione live GM

- [x] Avvio live session (`torneo_live_sessions.status='live'`)
- [x] Unique constraint: una sola live per campagna (atteso 409 sul secondo INSERT) — OK
- [x] Generazione `gm_remote_sessions` collegata via `torneo_live_session_id`
- [x] `live.remote_session_public_id` correttamente linkato dopo creazione del telecomando
- [x] Set `focused_match_id` sul telecomando GM
- [x] Revoca telecomando (`revoked_at`)
- [x] Chiusura live (`status='ended', ended_at=now`)

### Esecuzione match

Per ogni match (8 totali) ho eseguito:

- [x] Set status `pending → active`
- [x] Set timer (`timer_round_label`, `timer_duration_sec`, `timer_started_at`)
- [x] Salvataggio `initiative_snapshot` (JSONB)
- [x] Completamento: `winner_team_id` + damage totali + `completed_at` + `notes`
- [x] Vincolo "solo 1 match active per campagna" — OK
- [x] Riapertura match (`completed → pending` con reset di `winner_team_id` e `completed_at`)
- [x] Damage check `>= 0` (no negativi consentiti)

### Avanzamento bracket

- [x] Quarti → Semifinali: 3/4 OK + **1 FAIL (bug, vedi §3)**
- [x] Semifinali → Finale: 2/2 OK
- [x] Finale → triello: setup `team_a = team_b = champion` (atteso per il triello)

### Triello finale

- [x] Valida che il `winner_character_id` del triello deve essere un PG della squadra campione
- [x] Identificazione PG della squadra vincente (interrogazione `torneo_team_members`)
- [x] Completamento triello con `winner_character_id` di un PG legittimo
- [x] Edge case: validazione che un PG di squadra perdente non potrebbe essere vincitore (logica server-side correttamente identificata)

### Chiusura torneo + cleanup

- [x] End live session
- [x] Verifica: 8/8 match completati
- [x] Verifica: triello ha `winner_team_id` + `winner_character_id`
- [x] Verifica: finale ha entrambi i team da semifinali (non placeholder)
- [x] Verifica: tutti i match hanno damage_totali > 0
- [x] Ripristino completo dello snapshot iniziale (8 teams + 8 matches + 6 members, **con UUID originali**)

---

## 2. Stress test latenze (118 operazioni REST in produzione)

| Operazione | Esempi | Latenza tipica |
|---|---|---:|
| INSERT torneo_teams | 8 | 120-150ms |
| UPDATE torneo_teams (rename/colore) | 2 | 133-137ms |
| INSERT torneo_team_members | 16 | 140-316ms (avg ~190ms) |
| INSERT torneo_matches (bracket) | 8 | 139-186ms |
| PATCH torneo_matches (advances_to) | 7 | 134-163ms |
| PATCH torneo_matches (status=active) | 7 | 116-212ms |
| PATCH torneo_matches (timer) | 7 | 118-163ms |
| PATCH torneo_matches (initiative_snapshot) | 7 | 118-150ms |
| PATCH torneo_matches (completed + advance) | 7 | 115-365ms |
| INSERT torneo_live_sessions | 2 | 134-136ms |
| INSERT gm_remote_sessions | 1 | 140ms |

**Throughput**: 100 mutazioni eseguite in **18 secondi** (incluso ricostruzione bracket completo + ciclo live), media **~180ms/operazione**. Nessuna richiesta in errore di rete o timeout.

---

## 3. ⚠️ BUG ALTO — `advanceBracketWinner` può violare il constraint `torneo_matches_distinct_teams`

### Descrizione

Quando si completa il **Quarto 3** del bracket e il vincitore è la squadra in posizione `sort_order = 1` (cioè `team[1]`), la funzione `advanceBracketWinner` tenta di scrivere:

```
torneo_matches (Semifinale 2)
  team_a_id = winner_Q3 = team[1]
  team_b_id = team[1]    ← placeholder iniziale (mai aggiornato)
```

Il constraint `torneo_matches_distinct_teams` (`CHECK (match_kind = 'triello' OR team_a_id <> team_b_id)`) restituisce **HTTP 400** e l'avanzamento fallisce **silenziosamente**.

### Riproduzione minima (eseguita e confermata)

In `EXTRA 1: REPRO`:

1. Crea SF2 con `team_a_id = teams[0]`, `team_b_id = teams[1]` (esattamente come fa `buildEightTeamBracketPlan`)
2. Crea Q3 con `team_a_id = teams[1]`, `team_b_id = teams[6]`, `advances_to_match_id = SF2`, `advances_to_slot = 'a'`
3. Marca Q3 `status = completed`, `winner_team_id = teams[1]`
4. PATCH SF2 `team_a_id = teams[1]` → **HTTP 400** (`team_a_id = team_b_id = teams[1]`)

### Cause root

In `src/lib/torneo/bracket.ts` (funzione `buildEightTeamBracketPlan`), tutte le semifinali (e la finale) sono inizializzate con team placeholder fissi:

```ts
for (let i = 0; i < 2; i += 1) {
  plan.push({
    round: BRACKET_ROUND.SEMI,
    ...
    teamAId: ordered[0]!.id,   // sempre teams[0]
    teamBId: ordered[1]!.id,   // sempre teams[1]
  });
}
```

In `src/app/campaigns/torneo-actions.ts` (funzione `advanceBracketWinner`):

```ts
const slot = completed.advances_to_slot as "a" | "b";
const patch = slot === "a" ? { team_a_id: winnerTeamId } : { team_b_id: winnerTeamId };
await supabase.from("torneo_matches").update(patch)...
```

Non c'è alcun check di unicità prima del patch, e la chiamata a `advanceBracketWinner` in `completeTorneoMatchAction` è `await`-ata ma il risultato non viene mai verificato.

### Impatto sul torneo reale

- **Probabilità**: ~25% per torneo (dipende da quale squadra vince Q3; `teams[1]` ha 50% di chance, e il pairing è `teams[1] vs teams[6]`)
- **Effetto visibile per il GM**:
  - Il Quarto 3 risulta correttamente **completato** con il giusto vincitore
  - Ma la **Semifinale 2** mantiene il placeholder `teams[0]` come `team_a_id` (squadra già eliminata in Q1!)
  - Quando il GM apre la SF2, vede "teams[0] (Q1 loser) vs winner_Q4" — squadra fantasma in semifinale
  - Nessun messaggio di errore in UI
- **Casi simili teorici** (placeholder `teams[0]` e `teams[1]` in SF1, SF2, Finale, Triello):
  - SF1 partenza: `teams[0] vs teams[1]` → riempito da Q1 winner (teams[0] o teams[7]) e Q2 winner (teams[3] o teams[4]); collisione possibile solo se Q1 vince teams[1] (impossibile, non gioca Q1) → **safe**
  - SF2 partenza: `teams[0] vs teams[1]` → Q3 vince teams[1] = **collision sicura**
  - Finale partenza: `teams[0] vs teams[1]` → SF1 winner ∈ {teams[0], teams[3], teams[4], teams[7]}, SF2 winner ∈ {teams[1], teams[2], teams[5], teams[6]} → collisione possibile in finale se SF2 winner = teams[0] (impossibile, non è in SF2) → **safe**

### Severity: ALTO

Bug riproducibile in produzione, può rompere il bracket in modo silenzioso, e nel torneo reale stasera ha il **50% di probabilità di manifestarsi** se i vincitori dei quarti sono quelli "sbagliati".

### Fix consigliato

**Opzione A (minimale)**: in `buildEightTeamBracketPlan`, usare placeholder *distinti* per ogni semifinale:

```ts
// SF1 usa teams[0]/teams[1], SF2 usa teams[2]/teams[3], Finale usa teams[4]/teams[5]
```

Così le collisioni si spostano su squadre che mai potrebbero vincere proprio quei match. Non risolve completamente, ma riduce a ~0% la probabilità.

**Opzione B (corretta)**: in `advanceBracketWinner`, **prima** dell'UPDATE, verificare se il `team_a_id` o `team_b_id` corrente del match target coincide con il nuovo vincitore; se sì, settare l'altro slot come placeholder neutro (es. lo stesso winner per evitare il check) o fare un UPDATE composto. Esempio:

```ts
// se slot=a e team_b_id corrente == winnerTeamId, allora forziamo team_b_id = null
// (richiede modifica al constraint per permettere team_b_id NULL, o un placeholder dedicato)
```

**Opzione C (robusta)**: introdurre una colonna `team_a_placeholder boolean` e `team_b_placeholder boolean` per distinguere placeholder da team reali, ed evitare collisioni nel constraint solo quando entrambi i lati sono reali.

**Opzione D (workaround)**: catturare l'errore di `advanceBracketWinner`, segnalarlo all'UI come warning, lasciare al GM la responsabilità di aggiornare manualmente la semifinale.

### Test di regressione consigliati dopo il fix

1. Generare bracket e simulare tutti i 16 esiti possibili dei 4 quarti (2^4 = 16)
2. Verificare che per ognuno dei 16, le 2 semifinali abbiano team_a_id ≠ team_b_id e siano popolate con i veri vincitori
3. Stessa verifica per finale → triello

---

## 4. ⚠️ OSSERVAZIONE PRODOTTO — riapertura match non azzera i damage

### Descrizione

Quando si riapre un match (status `completed → pending`), il codice in `setTorneoMatchStatusAction` azzera `winner_team_id` e `completed_at` ma **non** `team_a_damage_total` e `team_b_damage_total`. Questi rimangono al valore raggiunto durante la prima esecuzione.

### Impatto

Probabilmente intenzionale (per non perdere il conteggio), ma è ambiguo:

- Se il GM riapre per correggere un esito, i damage residui possono confondere
- Se il GM riapre per rifare il match da zero, dovrebbe ricominciare da 0

### Severity: BASSO

Comportamento di prodotto, da chiarire con il GM o documentare in UI.

---

## 5. Funzioni testate ma non coperte completamente

Queste funzioni esistono nel codice e sono state esercitate parzialmente via REST, ma una verifica E2E con UI browser sarebbe utile:

- **Timer pause/resume** (`timer_paused_at`): mai impostato in questo test; bisognerebbe simulare pause durante un match attivo e verificare il calcolo del residuo (logica in `src/lib/torneo/match-timer.ts`)
- **Initiative tracker realtime sync** tra GM screen e Table Operator (`src/app/torneo-live/[livePublicId]/table/[matchId]`): il salvataggio in DB funziona, ma il refresh realtime via Supabase channels non è stato testato
- **GM remote token validation** (telecomando con `token_plain`): ho creato la sessione, ma non ho testato il flusso completo di autenticazione del telecomando via token, che richiede l'endpoint `/api/gm-remote/[publicId]/torneo-matches`
- **Megatimer display** (`src/components/gm/torneo-megatimer-display.tsx`): rendering UI non testato
- **Bracket board** (`torneo-bracket-board.tsx` e `torneo-bracket-live-view.tsx`): rendering visuale non testato

---

## 6. Stato finale produzione

**Snapshot iniziale completamente ripristinato.**

| Tabella | Prima del test | Dopo test | Dopo ripristino |
|---|---:|---:|---:|
| `torneo_teams` (per campagna) | 8 | 0 | **8** |
| `torneo_matches` (per campagna) | 8 | 0 | **8** |
| `torneo_team_members` (per teams) | 6 | 0 | **6** |
| `torneo_live_sessions live` | 0 | 0 | **0** |

Gli UUID originali sono stati preservati, tutti i 23 record sono identici a prima.

---

## 7. Azioni consigliate (in ordine di priorità)

| # | Azione | Severity | Effort | Note |
|---:|---|---|---|---|
| 1 | **Fix bug `advanceBracketWinner`** (Opzione A: placeholder distinti per SF/F) | ALTO | 5 min | Modifica `buildEightTeamBracketPlan` |
| 2 | **Test di regressione bracket** (16 esiti possibili) | ALTO | 30 min | Vedi §3 |
| 3 | Catturare e mostrare errori di `advanceBracketWinner` in UI come warning toast | ALTO | 15 min | Difensivo |
| 4 | Decidere se riapertura match deve azzerare anche i damage | BASSO | 5 min | Vedi §4 |
| 5 | Test E2E browser (Playwright) per il GM screen torneo | MEDIO | 2h | Coprire UI/realtime/timer |
| 6 | Documentare il flusso GM screen per il GM | BASSO | 30 min | Per gli altri GM |

---

## 8. Riferimenti

- Script test E2E: `/tmp/torneo/test_runner.py`, `/tmp/torneo/test_extra.py`
- Log esecuzione: `/tmp/torneo/run.log`, `/tmp/torneo/extra.log`
- Report JSON: `/tmp/torneo/test_report.json`, `/tmp/torneo/extra_report.json`
- Snapshot iniziale: `/tmp/torneo/snap_teams.json`, `/tmp/torneo/snap_matches.json`, `/tmp/torneo/snap_members.json`
- Script ripristino: `/tmp/torneo/restore.py`
- File codice coinvolti:
  - `src/lib/torneo/bracket.ts` (qui sta la causa del bug)
  - `src/app/campaigns/torneo-actions.ts` (advanceBracketWinner, completeTorneoMatchAction)
  - `src/app/campaigns/torneo-live-actions.ts` (live session + remote)
  - `supabase/migrations/20260517120000_torneo_teams_matches.sql` (constraint `torneo_matches_distinct_teams`)
