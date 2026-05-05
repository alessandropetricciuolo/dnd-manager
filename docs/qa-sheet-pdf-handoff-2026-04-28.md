# Handoff QA - Compilazione `Scheda_Base.pdf`

Data: 2026-04-28
Progetto: Barber And Dragons - Web App
Target testato: `dnd-manager/public/Scheda_Base.pdf`

## Scopo

Verificare la qualita della compilazione PDF delle schede personaggio generate dall'app, con focus su:
- correttezza contenuti rispetto ai manuali (tratti/privilegi)
- leggibilita della scheda PDF (campi troppo lunghi/troncamenti)

## Metodo usato

### Pipeline tecnica

Per ogni caso:
1. Generazione scheda tramite `buildGeneratedCharacterSheet(...)`
2. Mapping campi PDF con `mapGeneratedSheetToPdfFields(...)`
3. Compilazione reale del template `Scheda_Base.pdf` via `pdf-lib`
4. Salvataggio PDF compilato in artefatti
5. Valutazione automatica con metriche/heuristic

Script usato:
- `scripts/qa-test-sheet-pdf.ts`

Comando:
- `npx tsx scripts/qa-test-sheet-pdf.ts --count=90`

### Criteri di valutazione (per-case)

Un caso viene classificato usando rischi aggregati:

- **Correttezza base**
  - `classFeaturesPresent`
  - `hasSpellDcWhenCaster`
  - `hasPositiveHp`

- **Leggibilita (heuristic overflow)**
  - `features-main-too-long` se `Features_Main > 2200`
  - `racial-features-too-long` se `Feat_Racial > 1400`
  - `spell-summary-too-long` se summary incantesimo > 120

- **Verdict**
  - `good`: nessun rischio
  - `acceptable`: 1-2 rischi
  - `poor`: 3+ rischi

## Campione testato

- Run A: 10 casi (seed random)
- Run B: 90 casi (seed random)
- Totale: **100 casi**

## Risultati percentuali finali (100 casi)

- **Good**: 5/100 = **5%**
- **Acceptable**: 95/100 = **95%**
- **Poor**: 0/100 = **0%**

## Risultati ultimo run (90 casi)

- **Good**: 4/90 = **4.44%**
- **Acceptable**: 86/90 = **95.56%**
- **Poor**: 0/90 = **0%**

## Evidenze principali

1. **Leggibilita critica su campi lunghi** (problema dominante)
   - `Features_Main` spesso oltre 3000 caratteri (picchi ~9900)
   - `Feat_Racial` spesso oltre 1500 caratteri (picchi ~9200)
   - Rischio elevato di troncamento/overlap nel PDF base

2. **Feature classe mancanti in alcuni casi**
   - presenza di `classFeaturesPresent=false` in piu record
   - sintomo: privilegio classe non estratto o non mappato

3. **Incantesimi generalmente presenti nei caster**
   - `hasSpellDcWhenCaster=true` nei casi valutati

## Esempi specifici (valori reali)

Di seguito alcuni casi reali estratti dal report, utili per un altro agente per capire il problema sui campi lunghi:

| Case | Razza / Classe / Livello | Features_Main (len) | Feat_Racial (len) | Note |
|---|---|---:|---:|---|
| `case-003` | Goliath / Artefice / 16 | 9748 | 1127 | `features-main-too-long` molto alto |
| `case-014` | Forgiato / Artefice / 10 | 9748 | 3413 | entrambi lunghi, rischio overflow multiplo |
| `case-024` | Coboldo / Artefice / 12 | 9748 | 1674 | overflow su privilegi classe |
| `case-056` | Orco / Artefice / 4 | 9912 | 1283 | picco massimo su `Features_Main` |
| `case-088` | Genasi (acqua) / Bardo / 16 | 4502 | 9281 | picco massimo su `Feat_Racial` |
| `case-065` | Genasi (acqua) / Stregone / 8 | 0 | 9281 | `class-features-missing` + razziali enormi |
| `case-050` | Elfo / Stregone / 20 | 0 | 6671 | privilegio classe mancante |
| `case-043` | Tabaxi / Monaco / 2 | 1858 | 1218 | caso classificato `good` |

Esempio di pattern atteso nei casi problematici:
- `Features_Main` > 2200 -> probabile testo privilegi classe poco leggibile nel PDF
- `Feat_Racial` > 1400 -> probabile troncamento/accavallamento nei blocchi razziali

## Artefatti da leggere

### Report macchina (JSON completo 90 casi)
- `docs/qa-artifacts/sheet-pdf/qa-sheet-pdf-report.json`

### PDF compilati
- Non versionati nel repository: rigenerare con `npx tsx scripts/qa-test-sheet-pdf.ts --count=90` quando serve una verifica visuale.

## Note per il prossimo agente

- Il JSON corrente contiene l'ultimo batch da 90 casi.
- Per analisi 100/100 puntuale per-case, unire anche i 10 casi del run precedente (se necessario ripetere `--count=10` e consolidare).
- Suggerito step successivo:
  1. ranking dei top outlier per `featuresMainLen`/`racialFeaturesLen`
  2. confronto visuale su 10 PDF peggiori
  3. verifica manuale specifica sui casi con `classFeaturesPresent=false`

