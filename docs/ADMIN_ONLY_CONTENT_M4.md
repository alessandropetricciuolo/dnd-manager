# M4 — Memoria IA e bozze generate

Stato: implementazione locale verificata; nessuna migration applicata a remoto.

| Criterio | Integrazione | Verifica | Limite |
|---|---|---|---|
| Chunk ereditano il confine | indexer legge `admin_only` da Wiki/mappe e lo salva nello stesso `campaign_memory_chunks` | lint/typecheck focalizzato; test indexer esistenti | retry operativo resta demandato al job chiamante |
| Retrieval scoped | RPC additiva `match_campaign_memory(..., include_admin_only default false)` e retriever filtra semantic/lexical/count | test retriever + migration contract | i callsite Admin devono passare scope verificato, mai un boolean client |
| Default fail-closed | `retrievePreviewMemory` include Admin-only solo con `AdminContentAccess` verificato; client privilegiato senza scope filtra `admin_only=false` | test contratto | browser/MCP reale è M6/M7 |
| Idempotenza | upsert esistente cancella per fonte e reinserisce chiavi uniche, propagando il flag | test unitari e unique index M1 | nessun filtro IA completo su tutte le superfici M5 |

M4 non applica migration né dati remoti. La scelta strutturata Secret/Solo Admin nel salvataggio IA e la prova autenticata reale restano vincolate ai callsite UI dedicati e alla verifica M7.
