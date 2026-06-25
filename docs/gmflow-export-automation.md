# Automazione export B&D → gmflow

Questo sistema **estende** l'agente export già presente in Barber & Dragons. **Non sostituisce** gli agenti di export/import e **non importa codice** in gmflow automaticamente.

## Cosa fa

1. Dopo ogni commit (se il hook è installato) o su comando manuale, analizza i file modificati nell'ultimo commit.
2. Aggiorna il ledger leggibile e il JSON machine-readable in B&D.
3. **Copia solo i file di stato** nel repository gmflow locale:
   - `docs/imports/bd-gmflow-export-ledger.md`
   - `docs/imports/bd-gmflow-export-current.json`

## Cosa non fa

- Non modifica codice applicativo in B&D o gmflow
- Non crea commit o push automatici
- Non inserisce segreti
- Non blocca un commit git se l'export fallisce
- Non sostituisce i package dettagliati in `docs/gmflow-export-packages/`

## File prodotti (B&D)

| File | Scopo |
|------|--------|
| `docs/gmflow-export-ledger.md` | Ledger umano + ChatGPT |
| `docs/gmflow-export-current.json` | Stato per Import Agent gmflow |
| `.gmflow-sync.local.json` | Path locale repo gmflow (gitignored) |

## Comandi

```bash
# Aggiorna ledger e copia in gmflow
npm run gmflow:export

# Installa hook post-commit
npm run gmflow:install-hook
```

## Hook post-commit

Il hook esegue `npm run gmflow:export` dopo ogni commit.

- Log: `/tmp/bd-gmflow-export.log`
- Se lo script fallisce, il commit **non** viene annullato
- Funziona con path che contengono spazi

### Disattivare il hook

Opzione A — rimuovi il blocco marcato `# bd-gmflow-export-hook` da `.git/hooks/post-commit`

Opzione B — elimina `.git/hooks/post-commit` (se contiene solo il nostro hook)

Opzione C — rendi il file non eseguibile: `chmod -x .git/hooks/post-commit`

## Configurazione path gmflow

Crea o modifica `.gmflow-sync.local.json` nella root B&D:

```json
{
  "gmflowRepoPath": "/Users/alessandropetricciuolo/Desktop/masto-platform"
}
```

Se assente, viene usato il path di default sopra.

## Destinazione copia in gmflow

```
<masto-platform>/docs/imports/bd-gmflow-export-ledger.md
<masto-platform>/docs/imports/bd-gmflow-export-current.json
```

La cartella `docs/imports/` viene creata automaticamente se manca.

## Stati delle voci

| Stato | Significato |
|-------|-------------|
| `NEEDS_REVIEW` | Classificazione automatica, da revisionare |
| `TO_IMPORT` | Approvata per import in gmflow |
| `IMPORTED` | Import completato |
| `PARTIALLY_IMPORTED` | Import parziale |
| `BD_ONLY` | Specifica B&D, non per gmflow |
| `DISCARDED` | Non importare |
| `NEEDS_DECISION` | Serve decisione product/architecture |

## Workflow consigliato

1. Commit in B&D → hook aggiorna ledger (o `npm run gmflow:export` manuale).
2. Apri `docs/gmflow-export-ledger.md` e rivedi voci `NEEDS_REVIEW`.
3. Modifica manualmente stato/priorità nel JSON (o chiedi all'agente export di farlo).
4. Per feature complesse, crea anche un package in `docs/gmflow-export-packages/`.
5. Import manuale in gmflow tramite Import Agent.
6. Aggiorna stato a `IMPORTED` o `PARTIALLY_IMPORTED`.

### Promuovere una voce

- **→ TO_IMPORT**: rilevante per gmflow, pronta per la coda
- **→ BD_ONLY**: tooling o branding solo B&D
- **→ DISCARDED**: rumore, refactor interno, debug
- **→ NEEDS_DECISION**: ambiguità architetturale o product

## Limiti

- Analizza **solo l'ultimo commit** (`HEAD~1..HEAD`), non l'intera history
- Classificazione categoria/priorità è euristica — usare `NEEDS_REVIEW` quando incerto
- `gmflowLikelyFiles` è una stima basata su path speculari, non un diff reale gmflow
- Duplicati evitati per stesso commit hash + stesso file B&D
- Non rileva divergenze già presenti in gmflow

## Test rapido

```bash
npm run gmflow:export
cat docs/gmflow-export-current.json | head -40
ls -la "/Users/alessandropetricciuolo/Desktop/masto-platform/docs/imports/"
```
