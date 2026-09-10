# M4 — Memoria IA e bozze generate

Stato: implementazione locale verificata; nessuna migration applicata a remoto.

| Criterio | Integrazione | Verifica | Limite |
|---|---|---|---|
| Chunk ereditano il confine | indexer legge `admin_only` da Wiki/mappe e lo salva nello stesso `campaign_memory_chunks` | lint/typecheck focalizzato; test indexer esistenti | retry operativo resta demandato al job chiamante |
| Retrieval scoped | RPC `match_campaign_memory` e `match_campaign_memory_preview` espongono `include_admin_only` default false; preview Admin passa `AdminContentAccess` verificato; semantic/lexical/count filtrano | test retriever 31/31 + lint | gli altri callsite IA restano default non-Admin finché non dispongono di identità verificata |
| Default fail-closed | `retrievePreviewMemory` include Admin-only solo con `AdminContentAccess` verificato; client privilegiato senza scope filtra `admin_only=false` | test contratto | browser/MCP reale è M6/M7 |
| Idempotenza | upsert esistente cancella per fonte e reinserisce chiavi uniche, propagando il flag | test unitari e unique index M1 | nessun filtro IA completo su tutte le superfici M5 |

M4 non applica migration né dati remoti. Il salvataggio Wiki IA richiede ora scelta strutturata Secret/Solo Admin prima della conferma, con riconvalida server-side; la prova autenticata reale resta M7.
