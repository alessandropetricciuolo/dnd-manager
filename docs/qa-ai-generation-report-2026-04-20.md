# QA Report - AI Generazione Mostri/NPC

Data: 2026-04-20
Ambito: Generazione AI testo (descrizione + statblock), non immagini.

## Obiettivo

Validare la qualita della generazione AI per:
- Mostri: completezza/coerenza di narrativa e statblock
- NPC: completezza/coerenza di narrativa e blocco tecnico

## Metodo di test utilizzato

### Configurazione runtime verificata

- `AI_TEXT_PROVIDER=openrouter`
- `OPENROUTER_API_KEY` presente
- `OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free`

### Strategia di esecuzione

- Batch automatico con 40 richieste totali:
  - 20 seed Mostro casuali e unici
  - 20 seed NPC casuali e unici
- Chiamata usata: `generateAiText(...)` (pipeline testo server-side)
- Prompt forzato a produrre output con due sezioni obbligatorie:
  - `[NARRATIVA]`
  - `[MECCANICA]`

### Criteri di valutazione per ogni caso

Un caso e considerato `PASS` solo se:
1. `[NARRATIVA]` presente e non vuota (`narrLen >= 80`)
2. `[MECCANICA]` presente e non vuota (`mechLen >= 60`)
3. Nessun leakage/meta-output (es. testo tipo prompt o "as an ai")
4. Checker meccanico valido:
   - Mostro: AC/CA + HP/PF + CR + almeno 3 tra FOR/DES/COS/INT/SAG/CAR
   - NPC: (AC/CA o HP/PF) + almeno una sezione azioni/capacita

### Limiti del run

- Il log dettagliato stampava solo i casi `FAIL`.
- I casi `PASS` sono tracciati nel conteggio aggregato ma senza seed esteso nel report del run.

## Risultati aggregati

- Mostri: `pass 3/20`, `fail 17/20`
- NPC: `pass 14/20`, `fail 6/20`
- Totale: `pass 17/40`, `fail 23/40`

## Tabella casi falliti (dettaglio completo)

| # | Tipo | Seed (sintesi) | Esito | Categoria primaria | Evidenza |
|---|---|---|---|---|---|
| 1 | Monster | urbano serpente piumato CR3 | FAIL | Meccanica vuota | `mechLen: 0` |
| 2 | Monster | abissale ettin CR9 | FAIL | Meccanica vuota | `mechLen: 0` |
| 3 | Monster | dimenticato elementale CR10 | FAIL | Statblock incoerente | HP ok, CR non rilevato |
| 4 | Monster | meccanico golem CR13 | FAIL | Meccanica vuota | `mechLen: 0` |
| 5 | Monster | abissale gnoll CR19 | FAIL | Meccanica vuota | `mechLen: 0` |
| 6 | Monster | mutaforma melma senziente CR9 | FAIL | Statblock incoerente | CR non rilevato |
| 7 | Monster | dimenticato aracnide gigante CR14 | FAIL | Meccanica vuota | `mechLen: 0` |
| 8 | Monster | montano arpia CR5 | FAIL | Timeout provider | `Timeout >120s` |
| 9 | Monster | infernale aracnide gigante CR18 | FAIL | Statblock incoerente | CR non rilevato |
| 10 | Monster | cristallino goblin CR10 | FAIL | Statblock incoerente | AC/CR non robusti |
| 11 | Monster | sanguinario elementale CR15 | FAIL | Meccanica vuota | `mechLen: 0` |
| 12 | Monster | primordiale kirin decaduto CR4 | FAIL | Meccanica vuota | `mechLen: 0` |
| 13 | Monster | acquatico minotauro CR6 | FAIL | Provider error | `Provider returned error` |
| 14 | Monster | nomade bestia corazzata CR16 | FAIL | Provider error | `HTTP 502` |
| 15 | Monster | cristallino chimera CR9 | FAIL | Statblock incoerente | CR non rilevato |
| 16 | Monster | ossidato melma senziente CR6 | FAIL | Statblock incoerente | CR assente |
| 17 | Monster | silvano wight CR3 | FAIL | Output leakage/formato | narrativa=`and` |
| 18 | NPC | firbolg mago lv1 | FAIL | Statblock incoerente | checker NPC non passa |
| 19 | NPC | drow guerriero lv1 | FAIL | Provider error | `Provider returned error` |
| 20 | NPC | tabaxi barbaro lv20 | FAIL | Timeout provider | `Timeout >120s` |
| 21 | NPC | mezzorco chierico lv10 | FAIL | Timeout provider | `Timeout >120s` |
| 22 | NPC | tabaxi ladro lv2 | FAIL | Statblock incoerente | checker NPC non passa |
| 23 | NPC | halfling stregone lv17 | FAIL | Output leakage/formato | narrativa=`and` |

## Classificazione severita consigliata

- High
  - Meccanica vuota su Monster (7 casi)
  - Timeout/502/provider error ricorrenti (6 casi)
- Medium
  - Statblock incoerente/non parsabile (8 casi)
- Low/Medium
  - Leakage formato/meta-output (2 casi)

## Nota operativa per futuri run

Per audit completo 40/40, loggare sempre sia `PASS` che `FAIL` con seed e checksum output.
