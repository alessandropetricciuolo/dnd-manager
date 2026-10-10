# Documenti di campagna

Migrazione applicata e verificata su Supabase produzione il 10 ottobre 2026; pubblicazione del codice autorizzata. Nessuna voce esistente trasferita da questa implementazione.

## Comportamento

- `/campaigns/[id]/documenti` è una sezione solo Admin con ricerca per titolo/testo, accessibile dalla Wiki.
- Ogni tipo di entità può essere trasferito dalla pagina di dettaglio con “Sposta nei Documenti di campagna”. ID, contenuto, relazioni, media e tipo restano gli stessi.
- `is_campaign_document` è una collocazione distinta da `archived_at`: il trasferimento non archivia né ripristina una voce.
- Le liste Wiki (entrambe le viste), la loro ricerca e la lista mostri per iniziativa escludono i documenti.
- “Riporta nella Wiki” conserva Admin-only. Rendere pubblico un contenuto resta un'operazione distinta.
- Restrictive RLS, vincolo `is_campaign_document => admin_only` e trigger autorizzazione proteggono il database. La pagina e la server action verificano il ruolo Admin.
- Le copie Wiki nell'indice memoria diventano Admin-only nella stessa transazione del trasferimento; se la protezione fallisce, il trasferimento viene annullato.
- MCP `search_lore` accetta `collection: wiki | documents | all` (default Wiki). Documenti/all richiedono `admin_only: true`. `get_entity` e immagini usano gli stessi ID e l'opt-in protetto esistente. Gli envelope indicano `is_campaign_document`. `update_entity` accetta `is_campaign_document: true/false` con revisione corrente e opt-in `admin_only: true`: trasferisce e ripristina senza duplicare la voce, mantenendo la protezione Admin.

## Attivazione successiva

Applicare le migrazioni `20261010192905_campaign_documents.sql` e `20261010194933_campaign_documents_function_grants.sql` prima del codice. La seconda revoca i grant EXECUTE espliciti di default Supabase sulle funzioni trigger interne. Come per gli altri contenuti Admin-only, la campagna deve avere `admin_drafts_enabled=true` per convertire una voce attualmente non protetta. Nessuna classificazione automatica per titolo o tipo: le voci vengono spostate solo dopo decisione del proprietario.

Il dettaglio mantiene la route Wiki per conservare link e strumenti; la navigazione indietro conduce ai documenti quando pertinente. L'archivio delle voci Wiki continua a funzionare separatamente.

## Verifiche

Suite MCP/immagini: 25 test passati. Test PostgreSQL isolato PGlite: verifica migrazione, Admin/GM/player/anon, vincolo, protezione indice, identità e stato archived_at preservati, rollback su errore indice. ESLint dei file modificati e git diff --check passati. TypeScript globale segnala errori preesistenti fuori dai file modificati, nessun errore dei nuovi file dopo la correzione della regex.

Docker locale non attivo: verifica SQL eseguita in PGlite isolato. Migrazione applicata a produzione con readback di campo, vincolo, policy restrictive e trigger; 424 voci preservate e zero documenti prima dei trasferimenti. Flag Eldaria admin_drafts_enabled già true. Navigazione autenticata end-to-end affidata alla chat principale dopo il deploy. Gli URL dei media seguono il comportamento preesistente: la nuova sezione non cambia la protezione degli URL di immagini già condivise.

Esecuzione del test SQL senza installare dipendenze nel repository: impostare `PGLITE_TEST_MODULE` al modulo PGlite disponibile e avviare `tsx --test supabase/tests/campaign_documents.test.ts`. In alternativa il test usa il pacchetto standard `@electric-sql/pglite`.
