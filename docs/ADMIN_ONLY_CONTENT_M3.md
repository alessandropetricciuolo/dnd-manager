# M3 — Wiki e mappe: creazione, modifica e transizioni

Stato: implementata localmente e verificata; nessuna migration o scrittura Supabase remoto.

| Criterio | Integrazione | Verifica | Limite noto |
|---|---|---|---|
| Solo Admin solo con flag attivo | `createEntity`, `updateEntity`, `uploadMap`, `updateMap` risolvono identità con `resolveAdminContentAccess` e chiamano `assertCanManageAdminContent` | suite `test:admin-content` 11/11; lint focalizzato | il flusso browser autenticato reale è demandato a M7 |
| Nuova Wiki/mappa protetta | payload server-side forza `admin_only=true` e `visibility=secret`; il browser non è autorevole | controllo statico delle Server Action + test policy M2 | bulk import non espone ancora un percorso Solo Admin dedicato |
| Rilascio/ritiro espliciti | `updateEntity` e `updateMap` accettano `release_admin_only` / `admin_only`; il server verifica Admin+flag e conserva la visibilità nel ritiro | lint e type-check focalizzati; audit post-scrittura | la UI di modifica esistente non offre ancora il controllo di transizione completo |
| Audit senza contenuto | `logAdminContentTransition` dopo insert/update riuscito | test audit M2 | la sincronizzazione memoria resta quella storica; il filtro/reindex è M4 |
| Gerarchia mappe | protezione di una mappa padre rifiutata quando esistono figli `admin_only=false`, senza cascata | controllo di dominio in `updateMap` | non viene eseguita una migrazione automatica di gerarchie esistenti |
| Collegamenti Wiki↔mappa | nuovo collegamento verifica la parità Admin/non-Admin | controllo server-side in `updateMap` | il censimento completo di letture/relazioni è M5 |
| Immagini | il percorso Telegram esistente è invariato | lint focalizzato | URL Telegram già noti restano il limite documentato dal piano |

I contenuti con `admin_only=false` mantengono il flusso e la visibilità precedenti. Errori di identità, profilo, flag o schema negano le operazioni protette.
