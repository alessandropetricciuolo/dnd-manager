# Piano tecnico — AI Memory Preview v1

## Decisione

Costruire una **nuova chat Admin in anteprima** per le campagne lunghe. Non sostituisce
la query memoria esistente, non modifica wiki/sessioni/memoria e non coinvolge il
Command Center. Il percorso corrente resta quello di default.

La preview deve essere utilizzabile su Eldaria e registrare evidenza per decidere,
in seguito, se promuovere il nuovo core alle altre modalità AI.

## Obiettivo del primo incremento

Dato un quesito di un Admin su una campagna lunga, il sistema:

1. recupera fonti pertinenti esclusivamente da `campaign_memory_chunks` della
   campagna selezionata;
2. genera una risposta grounded oppure dichiara deterministicamente che l'evidenza
   non è sufficiente;
3. espone classificazione, fonti effettivamente usate, fallback e latenza;
4. raccoglie giudizio del GM;
5. non esegue azioni, non salva proposte e non aggiorna l'indice della memoria.

## Fuori scope v1

- sostituzione di `queryCampaignMemoryAction` o del pannello attuale;
- chat giocatore e qualunque esposizione di note GM/whisper;
- modifica o reindicizzazione dei chunk esistenti;
- generazione narrativa, immagini, schede e ricerca manuali;
- refactor o rimozione di provider/percorsi AI legacy;
- A/B automatico con doppia chiamata al provider per ogni domanda.

## Stato corrente e punti di integrazione

| Area | Implementazione corrente | Decisione preview |
| --- | --- | --- |
| UI memoria GM | `src/components/gm/campaign-memory-query-panel.tsx` | Restare intatta; montare un pannello preview separato sotto o accanto a essa. |
| Query esistente | `src/lib/actions/campaign-memory-query-actions.ts` | Baseline invariata; non importare funzioni private né modificarne comportamento. |
| Dati e retrieval | `campaign_memory_chunks` + RPC `match_campaign_memory` | Riutilizzare schema e RPC in un adattatore nuovo, read-only. |
| Embedding | `generateOpenRouterEmbedding` | Riutilizzare solo per retrieval; isolare la dipendenza dietro un adapter. |
| Testo | `generateAiText` | Riutilizzare nell'adapter v1 per mantenere il provider configurato e confrontare il comportamento. |
| Command Center | `ai-control-plane/context-resolver.ts` | Non riusare: recupera estratti per proposte e non possiede il contratto grounded della chat GM. |
| E2E AI esistente | `tests/e2e/ai/long-campaign-ai.prod.spec.ts` | Non estendere per la preview: altera dati reali. Creare test isolati senza scritture di dominio. |

## Contratto funzionale

### Input

```ts
type AiMemoryPreviewRequest = {
  campaignId: string;
  question: string;
};
```

Precondizioni: utente autenticato con ruolo `admin`, campagna esistente e di
tipo `long`. La preview è attiva direttamente dal codice; non richiede feature flag.
Domanda vuota o oltre il limite deciso dal modulo
di validazione viene rifiutata prima del retrieval.

### Fonti e visibilità

Durante la validazione il chiamante è sempre Admin; può quindi consultare le dieci tipologie
canoniche già indicizzate: wiki, background PG, session summary, session note,
nota GM, whisper, mappa, descrizione campagna, `ai_context` e missione.

Ogni fonte passata al modello e mostrata in UI deve coincidere: una fonte non può
apparire come citazione se il suo chunk non è stato nel contesto. I record di audit
conservano riferimenti e metadati, non duplicati dei contenuti delle fonti.

### Output

```ts
type AiMemoryPreviewResult = {
  runId: string;
  status: "answered" | "insufficient_evidence" | "failed";
  classification: "fatto_canonico" | "informazione_assente" | "conflitto";
  answer: string;
  claims: Array<{
    text: string;
    evidenceIds: string[];
  }>;
  sources: Array<{
    evidenceId: string;
    sourceType: CampaignMemorySourceType;
    sourceId: string;
    title: string;
    href: string;
    similarity: number | null;
  }>;
  retrieval: {
    mode: "semantic" | "lexical_fallback" | "none";
    chunkCount: number;
    retrievedChunkCount: number;
    contextChunkCount: number;
  };
  timingsMs: {
    retrieval: number;
    generation: number | null;
    total: number;
  };
};
```

Regole non negoziabili:

- `insufficient_evidence` non chiama il modello per inventare una risposta;
- ogni claim di una risposta `answered` deve avere almeno un `evidenceId` valido;
- ID di evidenza non presenti, JSON non valido o claim senza fonte producono un
  fallback grounded basato solo sugli estratti recuperati, con stato `failed` o
  `insufficient_evidence`, mai una risposta libera;
- una contraddizione tra fonti recuperate viene segnalata, non arbitrata;
- nessun output preview può cambiare il canone.

## Architettura proposta

Creare un modulo isolato, senza spostare codice legacy nel primo incremento:

```text
UI preview (Admin only)
  -> Server Action preview
    -> access guard
    -> campaign-memory retriever (read-only)
    -> grounded-answer service
       -> structured-output parser and policy validator
    -> preview audit repository
  <- risultato con evidence e metriche
```

### File nuovi

| File | Responsabilità |
| --- | --- |
| `src/lib/ai-core/contracts.ts` | Tipi condivisi di request, evidence, risultato, classificazione e feedback. |
| `src/lib/ai-core/campaign-memory-retriever.ts` | Retrieval semantico, fallback lessicale, deduplicazione delle fonti e costruzione dei link. Solo lettura. |
| `src/lib/ai-core/grounded-answer.ts` | Prompt, generazione strutturata, parser, validazione di citazioni, fallback grounded. |
| `src/lib/ai-core/policy.ts` | Limiti input/output, decisione assenza evidenza, validazione dei claim e messaggi sicuri. |
| `src/lib/ai-core/preview-audit.ts` | Persistenza/lettura del run e feedback, senza contenuti integrali delle fonti. |
| `src/lib/actions/ai-memory-preview-actions.ts` | Server Actions `runAiMemoryPreviewAction` e `submitAiMemoryPreviewFeedbackAction`. |
| `src/components/gm/ai-memory-preview-panel.tsx` | UI preview, fonti, metriche, feedback GM. |
| `supabase/migrations/<timestamp>_ai_memory_preview_runs.sql` | Tabella audit, indici e RLS server-only; accesso applicativo solo Admin. |
| `src/lib/ai-core/__tests__/*.test.ts` | Unit test puri per policy, parser e retrieval mockato. |

### File da modificare

| File | Modifica minima |
| --- | --- |
| `src/app/campaigns/[id]/gm-only/ai-memory-preview/page.tsx` | Pagina dedicata Admin-only; verifica ruolo e campagna prima di montare il pannello. |
| `src/components/gm/gm-homepage.tsx` | Link alla pagina dedicata esclusivamente per Admin di campagne long; legacy invariato. |
| `package.json` | Aggiungere uno script dedicato ai test preview solo se necessario. |

Non modificare `campaign-memory-indexer.ts`, `campaign-memory-query-actions.ts`,
`ai-control-plane/*`, generatori wiki/immagine o le migration della memoria esistente.

## Retrieval v1

1. Verificare accesso e tipo `long` prima di creare embedding.
2. Creare embedding della domanda con l'adapter corrente.
3. Chiamare `match_campaign_memory` con soglie decrescenti, partendo dalla stessa
   famiglia di soglie del baseline.
4. Se il retrieval semantico fallisce o non restituisce fonti, eseguire fallback
   lessicale scoped alla campagna.
5. Rerank locale: overlap dei termini, fonte richiesta (missione/mappa/sessione),
   recenza e intento; mantenere il dettaglio della regola applicata nel run audit.
6. Limitare il contesto a un budget esplicito per caratteri/token e deduplicare per
   sorgente. Non inserire un blocco cronologico completo di wiki/background.
7. Se nessuna fonte supera il contratto, restituire `informazione_assente`.

Il retriever non deve importare funzioni private dal baseline: la logica inizialmente
può essere duplicata in modo mirato. La convergenza o estrazione comune sarà una
decisione successiva, dopo il confronto dei risultati.

## Generazione e guardrail v1

Il modello riceve una lista numerata di evidence con titolo, tipo, contenuto e ID.
Deve restituire JSON con classificazione, risposta e claim associati agli ID.

Usare il parser JSON già disponibile in `src/lib/ai/json-extract.ts` se compatibile,
ma mantenere la validazione di schema nel nuovo modulo. Il prompt richiede italiano,
nessuna conoscenza esterna, dichiarazione delle lacune e citazioni `[E1]`, `[E2]`.

Fallback sicuro:

- assenza fonti: messaggio deterministico di assenza;
- errore provider/parser/policy: breve messaggio di indisponibilità + elenco
  estratti delle fonti recuperate; nessuna sintesi non validata;
- conflitto rilevato: elenco delle fonti in conflitto e invito alla verifica GM.

Il provider non viene cambiato in v1. La preview usa l'adapter configurato per
`generateAiText`; ogni run registra il nome logico del percorso, non API key o
payload dei provider.

## Audit e feedback

Creare `ai_memory_preview_runs` separata da `ai_action_requests`: sono concetti
diversi. Campi minimi:

```text
id, campaign_id, requested_by, mode,
question, status, classification, answer,
source_refs jsonb, retrieval jsonb, timings_ms jsonb,
feedback_rating nullable, feedback_note nullable,
created_at, feedback_at
```

`source_refs` contiene `sourceType`, `sourceId`, `title`, `evidenceId` e score, non
il testo del chunk. RLS server-only; `requested_by` deve corrispondere all'Admin
che crea il run. Nessuna API pubblica. Il feedback consentito in v1: `approved`,
`needs_review`, `incorrect` più nota facoltativa.

La scrittura nella tabella audit è l'unica persistenza ammessa dalla preview. Non è
una scrittura di dominio né un aggiornamento della memoria della campagna.

## UI Admin-only

La preview è attiva direttamente dal codice e vive nella pagina dedicata
`/campaigns/[id]/gm-only/ai-memory-preview`. Solo l'Admin vede il link in **Strumenti GM**
e solo l'Admin può raggiungere la pagina o invocare le Server Actions; GM e player ricevono
un accesso indistinguibile da risorsa inesistente. Il pannello **Memoria Campagna — Preview**
resta separato dal pannello corrente e deve mostrare:

- badge `Preview — nessuna modifica al canone`;
- domanda e pulsante separato;
- risposta e classificazione;
- fonti cliccabili, retrieval/fallback e latenza;
- pulsanti feedback `Approvato`, `Da rivedere`, `Errato` e nota opzionale;
- ID run, utile per confronti e debugging.

Il bottone esistente **Interroga** continua a usare solo `queryCampaignMemoryAction`.
Non mostrare la preview a giocatori né lasciar raggiungere Server Action senza guard.

## Sequenza di implementazione per OpenCode

### M1 — Contratti, migration e accesso

1. Creare contratti e policy puri.
2. Aggiungere migration `ai_memory_preview_runs`, RLS e tipi DB aggiornati.
3. Implementare guard Admin + long campaign.
4. Test unitari di accesso e policy; nessuna UI.

**Accettazione:** build e test passano; una richiesta non autorizzata non raggiunge
embedding/provider/database audit.

### M2 — Retriever e risposta grounded

1. Implementare retriever read-only con semantic + lexical fallback.
2. Implementare result deterministico per assenza fonti.
3. Implementare generatore strutturato, parser e validator evidence-to-claim.
4. Salvare audit del run senza testo di chunk.

**Accettazione:** nessuna scrittura su tabelle di dominio; ogni claim mostrato ha una
fonte valida; risposta senza fonti non usa il modello.

### M3 — Pannello preview e feedback

1. Montare il pannello nella pagina Admin-only dedicata, con link dalla sezione Strumenti GM.
2. Visualizzare metriche/fonti/ID run.
3. Salvare feedback senza rieseguire la domanda.

**Accettazione:** la preview è disponibile senza configurazione ambiente, esiste solo
nella pagina dedicata per Admin e il pannello legacy resta operativo e invariato.

### M4 — Verifica

1. Test unitari senza provider esterni: parser, policy, citazioni, assenza fonti,
   access control e payload audit.
2. E2E locale su campagna fixture/provisionata: preview, fonti, feedback e assenza
   di scritture su `campaign_memory_chunks`.
3. Smoke manuale su Eldaria con gli scenari M-01, M-05, M-06, M-07 e M-08 del set
   `docs/AI_EVALUATION_SCENARIOS_ELDARIA.md`.
4. Registrare qualità e latenza per almeno tre esecuzioni per scenario variabile.

**Non usare** `tests/e2e/ai/long-campaign-ai.prod.spec.ts` come verifica preview:
il test corrente crea e modifica dati in produzione.

## Criteri di promozione post-preview

Il percorso non sostituisce il legacy finché non risultano tutti veri:

- nessuna violazione GM/player o esposizione di fonte privata;
- zero risposte positive senza evidence nel set M-01…M-10;
- M-05 restituisce sempre assenza esplicita;
- il GM giudica utilizzabili le risposte narrative/fattuali campionate;
- latenza p50 e p95 sono misurate, non stimate;
- fallback e provider errors sono leggibili e non producono testo non grounded.

## Handoff a OpenCode

Implementare M1–M4 in ordine. Fermarsi dopo ogni milestone con diff, test eseguiti e
evidenza delle acceptance criteria. Non rinominare o rimuovere codice AI esistente,
non modificare il comportamento della query memoria corrente e non modificare la preview
né abilitarla in percorsi diversi dalla pagina Admin-only senza approvazione esplicita del CEO.
