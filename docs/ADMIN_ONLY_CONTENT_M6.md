# M6 — MCP personale Admin-only

Stato: implementata e verificata localmente; nessuna migration remota, deploy o push.
Base: `0b69c957f62e8bcad78bb839785485bf66071bbe` (M5).

## Esito

Il connettore personale usa esclusivamente il confine `MCP transport → Next API → Supabase`. Il trasporto non importa Supabase, non apre connessioni SQL e non riceve `service_role`. L’API valida il Bearer token con Supabase Auth e rilegge `profiles.role`; solo un Admin verificato e il `MCP_CAMPAIGN_ID` configurato per Eldaria possono accedere. Il flag server-side `campaigns.admin_drafts_enabled` è richiesto a ogni operazione.

Le richieste non Admin e quelle fuori scope ricevono `404 Not found`, senza enumerare account, campagna o fixture. Le ricerche/letture omettono Admin-only per default; l’Admin deve chiedere esplicitamente `admin_only: true`. Le creazioni protette impostano il flag server-side; gli aggiornamenti usano `mcp_revision` come precondizione atomica e il trigger registra audit nella stessa transazione.

## Matrice requisito → integrazione → test → limite

| Requisito | File/percorso e attore | Barriera | Test | Limite reale |
|---|---|---|---|---|
| MCP chiama solo API Next | `integrations/mcp/server.mjs`, `tools.mjs`; trasporto personale | bridge verso `/api/integrations/content`; validazione URL HTTPS/localhost, redirect disabilitati | `integrations/mcp/test.mjs`: bridge + scansione assenza DB/service-role | il server MCP va eseguito con `BD_API_URL`, token e scope configurati |
| Identità Admin verificata server-side | `/api/integrations/content/auth`, `src/lib/mcp-api/auth.ts` | Supabase `auth.getUser(token)` + `profiles.role`; metadata/caller non sono autorità | test API 401; test trasporto auth per-request | non è stata provata una sessione remota reale |
| Scope personale Eldaria revocabile | `auth.ts`, `service.ts`, route asset | token Supabase revocabile; `MCP_CAMPAIGN_ID` è config server-only; flag campagna richiesto | test Admin/non-Admin e campagna fuori scope | UUID Eldaria deve essere fornito nell’ambiente di esecuzione; nessun dato live modificato |
| Contratti `admin_only` | `src/lib/mcp-api/contracts.ts`, `integrations/mcp/tools.mjs` | schema strict su search/get/create/update; flag booleano validato, non fidato | test contratto + 9 tool MCP elencati | `set_status`/asset non espongono il flag perché restano operazioni Admin già autenticate |
| Default non protetto | `service.ts` search/get | `.eq("admin_only", false)` salvo opt-in Admin; Admin-only è sempre `true` in envelope | sentinella ricerca vuota e filtro query | la barriera RLS M1 resta necessaria sul database remoto |
| Non-enumerabilità | service, auth route, asset route, HTTP server | 404 uniforme per non Admin, scope errato e riga assente; auth HTTP non crea sessione globale | test non Admin 404 e trasporto auth | i log locali riportano solo operazione/status, non contenuto/token |
| Creazione protetta | `executeContent` create_* | payload server-side imposta `admin_only`, `visibility=secret`, `is_secret=true` | test Admin create + verifica payload | la pubblicazione resta fuori M6; `admin_drafts_enabled` deve essere attivo |
| Revisioni ottimistiche | `service.ts`, migration `mcp_revision` + trigger | lettura della revisione e `UPDATE ... WHERE mcp_revision`; conflitto → 409 | test stale/concurrent 409 senza aggiornamento parziale | la chiamata reale a Supabase non è stata eseguita |
| Audit transazionale | migration `mcp_private.audit_write`, trigger Wiki/asset/link | inserimento audit nello stesso transaction scope; nessun body/nome nei record | PGlite applica migration, verifica audit, bump e rollback su errore | la verifica è PGlite locale, non Supabase locale/Docker o remoto |
| Media coerenti allo scope | upload/attach/get asset API + migration | Admin+campagna flag; FK composita asset/campagna; nessun URL remoto | contratti e migration smoke; path asset senza enumerazione | gli asset non sono parte del rollout browser M7 |
| Nessun multi-ruolo MCP | `definitions`, auth HTTP | un solo connettore personale e ruolo Admin; nessuna capability role switch | conteggio/lista 9 tool e assenza delete/SQL | distribuzione ad altri utenti è fuori scope |

## Verifiche eseguite

- `npx tsx --test src/lib/mcp-api/__tests__/m6-admin-mcp.test.ts`: **5/5**.
- `npx tsx --test supabase/tests/m6_mcp_migration.test.ts`: **1/1**; migration, audit, revision bump e rollback transazionale verificati con PGlite.
- `npm ci --prefix integrations/mcp && npm test --prefix integrations/mcp`: **3/3** (il pacchetto standalone include ora `package-lock.json`; `npm test` da solo presuppone che il precedente `npm ci` abbia materializzato `integrations/mcp/node_modules`).
- ESLint focalizzato su API, contratti, test e migration harness: passato.
- `node --check integrations/mcp/server.mjs` e `tools.mjs`: passati.
- `npx tsc --noEmit`: nessun errore nei file M6; restano gli errori preesistenti già documentati da M5 (17 errori in `campaigns/actions.ts`, test sheet-generator e wiki-turn-resolution).
- Nessun `service_role`, Supabase o database path nel trasporto MCP; nessuna migration eseguita su remoto.

## Fuori scope e preservazione

La verifica MCP autenticata reale, Supabase locale Docker, deployment/browser e configurazione dell’UUID Eldaria sono demandati a M7. Non sono stati modificati il checkout principale, remoto, push/deploy o i due file GMFlow già sporchi (`docs/gmflow-export-current.json`, `docs/gmflow-export-ledger.md`).
