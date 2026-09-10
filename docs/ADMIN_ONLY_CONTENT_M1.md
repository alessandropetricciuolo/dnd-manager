# M1 — Schema, feature flag e barriera database

Stato: implementata e verificata localmente; non distribuita  
Base: `origin/main` a `ac8dabdb57ba8256492d93e8284cf5c29869bb70`

## Ambito

La migration M1 aggiunge esclusivamente:

- `campaigns.admin_drafts_enabled boolean NOT NULL DEFAULT false`;
- `wiki_entities.admin_only boolean NOT NULL DEFAULT false`;
- `maps.admin_only boolean NOT NULL DEFAULT false`;
- `campaign_memory_chunks.admin_only boolean NOT NULL DEFAULT false`;
- tre indici parziali per le righe Admin-only;
- una verifica del ruolo globale Admin basata su `profiles.role`, non su metadata modificabili dall'utente;
- una barriera RLS restrittiva separata per `SELECT`, `INSERT`, `UPDATE` e `DELETE` su Wiki e mappe;
- un trigger che consente la creazione o conversione Admin-only soltanto a un Admin globale e con flag campagna attivo.

La migration non contiene aggiornamenti dei dati. Le righe esistenti ricevono il default `false`, mentre `visibility` e i suoi valori `public | secret | selective` non vengono modificati.

## Rollback operativo

Il rollback immediato è spegnere `campaigns.admin_drafts_enabled` per la campagna interessata. Questo blocca nuove creazioni e conversioni Admin-only, senza impedire all'Admin di gestire o rilasciare righe già protette.

La barriera RLS, i trigger e le colonne devono restare installati finché esiste almeno una riga con `admin_only = true`. Rimuoverli prima avrebbe il rischio di esporre contenuti protetti. La rimozione fisica dello schema non fa parte del rollback operativo M1.

## Verifica locale

- harness PostgreSQL PGlite: applicazione della migration e matrice allow/deny superata;
- test pgTAP aggiunto per schema, default, Admin, GM, giocatore, anonimo e flag spento;
- suite sicurezza applicativa: 7/7 passata;
- controllo TypeScript focalizzato sul file dei tipi: passato;
- lint completo: passato con cinque warning preesistenti fuori ambito;
- type-check globale: non verde per errori preesistenti in `campaigns/actions.ts` e nei test `sheet-generator`, non collegati ai file M1;
- test Supabase locale non eseguito perché il daemon Docker non era disponibile;
- nessuna verifica remota: per vincolo M1 non sono state applicate migration né mutate righe live.

## Gate prima della distribuzione

Eseguire `supabase test db supabase/tests/admin_only_content_m1.test.sql` su un database locale pulito con Docker disponibile. Distribuire inizialmente con tutti i flag a `false`; l'attivazione di Eldaria resta parte della milestone di rollout, non di M1.
