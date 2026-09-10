# M2 — Policy applicativa centralizzata

Stato: implementata e verificata localmente; non distribuita  
Base M1: `7b677ec`

## Esito

M2 introduce un confine server-side condiviso in `src/lib/admin-content/`:

- l'identità deriva da `auth.getUser()` e il ruolo da `profiles.role`;
- solo uno scope Admin creato dalla verifica server può includere contenuti Admin-only;
- GM, player, anonimo e client privilegiati senza attore Admin ricevono il predicato obbligatorio `admin_only = false`;
- errori di autenticazione, profilo, ruolo o schema negano l'accesso;
- la gestione verifica sia l'Admin globale sia `campaigns.admin_drafts_enabled` letto dal server;
- l'audit delle transizioni accetta soltanto azione, ID attore, campagna, tipo e ID entità, mai contenuto sensibile.

Non sono state modificate query IA, export, relazioni, pin, pagine Wiki/mappe o scritture canoniche: l'applicazione della fondazione alle singole superfici resta nelle milestone previste.

## Hardening necessario del ruolo Admin

L'audit M2 ha rilevato che la policy storica `Users can update own profile` permetteva al proprietario di tentare la modifica di `profiles.role`; inoltre il trigger di signup copiava il ruolo dai metadata senza escludere `admin`.

La migration additiva M2:

- blocca ogni cambio di ruolo eseguito da player o GM;
- conserva gli aggiornamenti autonomi dei campi profilo non sensibili;
- consente la gestione ruoli a un Admin già verificato e al client server `service_role`;
- assegna sempre `player` al signup e non deriva alcun ruolo autorizzativo dai metadata;
- sostituisce la policy Admin autoreferenziale con `is_global_admin()` introdotta da M1.

## Criteri e verifiche

| Criterio | Punto di integrazione | Verifica | Limite noto |
|---|---|---|---|
| Admin distinto da GM | `admin-content/access.ts` | test Admin/GM/player/anon | I chiamanti di dominio verranno migrati nelle milestone dedicate |
| Scope non falsificabile con boolean client | brand privato + `WeakSet` dello scope verificato | oggetto forgiato con `includeAdminOnly: true` resta filtrato | Il modulo deve essere usato solo lato server, come imposto dalla dipendenza dal client Supabase server |
| Client privilegiato fail-closed | `createPrivilegedNonAdminContentAccess` + query adapter | predicato `admin_only=false` verificato | M4/M5 applicheranno lo scope ai percorsi privilegiati censiti |
| Gestione protetta | `assertCanManageAdminContent` | Admin+flag ammesso; GM, flag spento, campagna/schema mancanti negati | Nessuna nuova scrittura canonica in M2 |
| Audit senza contenuto | `logAdminContentTransition` | payload esatto verificato e non-Admin negato | Persistenza/audit transazionale delle azioni reali appartiene alle milestone di scrittura |
| Ruolo non autopromovibile | migration `admin_role_hardening_m2` | harness PostgreSQL: player/GM negati, Admin ammesso | Test pgTAP locale richiede Docker disponibile |
| Preview Admin esistente centralizzata | `ai-core/access.ts` | suite accesso preview inclusa | Nessuna modifica al retrieval |

## Verifica locale

- `npm run test:admin-content`: 11/11;
- access test Admin Preview insieme ai nuovi test: 14/14;
- harness PostgreSQL PGlite M1+M2: passato, incluse RLS e self-promotion;
- ESLint focalizzato: passato;
- type-check globale: restano soltanto i 17 errori preesistenti già riprodotti su `origin/main` durante M1;
- nessuna migration applicata e nessun dato remoto modificato.

Il test pgTAP `supabase/tests/admin_role_hardening_m2.test.sql` resta da eseguire con Supabase locale quando Docker è disponibile.
