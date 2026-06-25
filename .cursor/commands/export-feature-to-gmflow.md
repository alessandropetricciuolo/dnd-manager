Aggiorna il ledger export B&D → gmflow per la modifica indicata.

1. Analizza diff/commit della modifica richiesta
2. Se serve, crea package in `docs/gmflow-export-packages/`
3. Aggiorna `docs/gmflow-export-current.json` (stato, priorità, adattamenti)
4. Esegui `npm run gmflow:export` per rigenerare ledger e copiare in gmflow

Riferimenti: `.cursor/rules/bnd-export-agent.mdc`, `docs/gmflow-export-automation.md`
