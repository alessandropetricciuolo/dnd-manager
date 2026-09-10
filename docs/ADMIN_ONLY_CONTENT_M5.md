# M5 — Vie indirette e assenza di metadati rivelatori

Stato: implementata e verificata localmente; nessuna migration, scrittura Supabase remota, push o deploy.
Base: `a0d9844` su `codex/m1-admin-only`.

## Esito

Le superfici di lettura che usano Wiki, mappe, relazioni, pin o memoria ora applicano lo scope `admin_only` prima di costruire l'output. Le query con client `service_role` sono non-Admin per default e ricevono contenuti protetti soltanto quando il route ha verificato il ruolo Admin lato server. Le relazioni filtrano sia la sorgente sia il bersaglio; pin e selettori non trasportano ID di destinazioni protette.

La barriera database M1 resta la difesa primaria per il client Supabase autenticato. M5 aggiunge il filtro applicativo necessario per lettori privilegiati, fallback e serializzatori.

## Matrice completa percorso → attore → barriera → test

| Gruppo | File/percorso effettivo | Attore | Barriera | Test/sentinella |
|---|---|---|---|---|
| A | `components/wiki/wiki-list.tsx` | GM/player/anon | `admin_only=false` prima di liste e conteggi; Admin include | M5.A |
| A | `wiki-actions.ts:getEntity`, URL `/campaigns/:id/wiki/:entityId` | GM/player/anon | riga protetta esclusa, risposta `null` → `notFound`; Admin incluso | M5.A |
| A | `components/maps/map-gallery.tsx` | GM/player/anon | filtro prima dell'albero parent/child; prop Admin non amplia lo scope | M5.A |
| A | `maps/:mapId/page.tsx`, `maps/:mapId/view/page.tsx` | GM/player/anon | lookup diretto con `admin_only=false`; riga assente → `notFound` | M5.B |
| A | `maps/:mapId/overlay-edit/page.tsx` | GM | lookup protetto escluso; Admin può accedere | Typecheck + M5.B coverage |
| B | Compendio | GM | query Wiki filtrata prima di `elements`, ricerca e dettagli | M5.E |
| B | Ricerca bestiario/manuali | GM/player | non legge le tabelle protette; corpus manuali fuori dal modello Admin-only | test bestiary esistenti; fuori-scope motivato sotto |
| B | `map-actions.ts:listWikiLocationsForMapAction` | GM | cataloghi Wiki/mappe filtrati prima dei selettori | suite admin-content + typecheck |
| B | `getUnlockableContent`, `getPlayerContentAccess` | GM | fixture protette escluse da nomi, ID e conteggi di sblocco | typecheck + M5.E coverage |
| C | `entity-graph-actions.ts:getEntityGraphData` | GM | nodi Wiki/mappe filtrati; edge mantenuto solo se sorgente e target sono nel catalogo visibile | M5.C |
| C | `getRelatedEntityLinks` | GM/player | query target con `admin_only=false`; edge irrisolvibile viene omesso | M5.C coverage |
| C | selettori `getWikiEntitiesForCampaign`, `getMapsForCampaign` | GM | `admin_only=false` nel query builder | M5.C |
| C | create/update relationship, Wiki↔mappa | GM | verifica server-side di sorgente/target; attraversamento Admin/non-Admin rifiutato | M5.C |
| C | pagine mappa: parent, bound map, campaign map selector | GM/player | parent e destinazioni protette non vengono caricati | M5.B |
| C | pin e destinazioni `map_pins` | GM/player | pin con destinazione non visibile vengono omessi; nessun link ID serializzato | M5.B |
| C | esplorazioni/sblocchi | GM | contenuti protetti esclusi dai picker di sblocco; scritture esistenti non enumerano fixture | M5.E |
| D | API Wiki ZIP + `buildCampaignWikiArchiveZip` | GM | `includeAdminOnly=false`; entità e relazioni protette escluse prima di Markdown/manifest/immagini | M5.D |
| D | API Wiki ZIP | Admin | route verifica ruolo e abilita `includeAdminOnly` | M5.D + typecheck |
| D | export memoria Markdown | GM | client privilegiato filtra `campaign_memory_chunks.admin_only=false` prima di count/serializzazione | M5.D |
| D | export memoria Markdown | Admin | scope server-side consente tutti i chunk | M5.D + typecheck |
| D | export raccolta media | GM | `collectSiteImages` applica filtro a Wiki/mappe; niente URL o label protetti | M5.D |
| D | export raccolta media | Admin | route verifica ruolo e abilita raccolta completa | M5.D + typecheck |
| E | `context-service.ts` catalogo, chunk nominati, canonical references | GM | Wiki/mappe/chunk filtrati prima di evidence e citation | M5.E |
| E | `campaign-wiki-ai-memory.ts` | GM | client privilegiato legge solo Wiki non protette | M5.E |
| E | image prompt entity memory | GM | Wiki/mappe filtrate prima di prompt, reference line e count | M5.E |
| E | Command Center batch/relationship/session suggestions | GM | ogni catalogo service-role applica `admin_only=false` | M5.E |
| E | Command Center picker/label resolution | GM | adapter e Server Action filtrano nomi/ID protetti | M5.E |
| E | GM debrief, iniziativa, galleria Regia | GM | query Wiki/mappe filtrate; Admin mantiene vista completa | typecheck + focused suite |
| E | retrieval semantico/lessicale/count | GM/player | M4 mantiene default non-Admin e predicato sul fallback/count | `npm run test:ai-preview` |
| E | preview AI Admin | Admin | scope verificato separatamente; non riusa un flag browser | `npm run test:ai-preview` |

### Accessi fuori scope

- Le query di indicizzazione (`campaign-memory-indexer.ts`) sono scritture server interne: propagano `admin_only` dalla fonte ai chunk e non restituiscono output utente. Restano coperte da M4 e non sono un lettore da filtrare per attore.
- Le tabelle dei manuali del bestiario non contengono Wiki/mappe/chunk di campagna e non hanno la colonna `admin_only`; la ricerca dei manuali è quindi fuori dal confine M5, mentre ogni catalogo Wiki/mappe circostante è filtrato.
- `gmflow-export-current.json` e `gmflow-export-ledger.md` erano modifiche preesistenti e non sono stati toccati né inclusi.
- MCP personale è M6: nessun contratto o trasporto MCP è stato modificato in M5.
- Nessun tipo TypeScript, import statico o fixture di test è contato come superficie runtime.

## Verifica eseguita

- `npm run test:admin-content`: **21/21** passati, inclusi cinque sentinella M5 A–E.
- `npx tsc --noEmit`: nessun errore nei file M5; restano 17 errori preesistenti in `actions.ts` (payload union sblocchi), test `sheet-generator` e test `wiki-turn-resolution`.
- Nessuna migration applicata, nessun dato remoto mutato, nessuna verifica deployment/browser/MCP dichiarata.
- La scansione statica dei percorsi coperti verifica che la fixture `admin_only` venga esclusa prima dell'output; l'E2E autenticato reale è M7.

## Limitazioni note

Il filtro media copre le righe Wiki/mappe nel collector; URL Telegram già noti restano il limite residuo già documentato dal piano. Le policy RLS e la verifica browser autenticata su Supabase remoto richiedono M7.

