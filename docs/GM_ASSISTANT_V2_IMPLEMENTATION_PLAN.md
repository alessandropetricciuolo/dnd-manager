# Piano tecnico — Assistente GM v2 (pilot conversazionale)

## Decisione

Evolvere l'Assistente GM in una chat conversazionale contestuale che produce,
revisiona e salva artefatti reali di campagna. Il nuovo motore sostituisce il
legacy all'interno dell'Assistente GM:

- **v2** e' disponibile a GM e Admin per le campagne che possono gia' gestire;
- **nessun giocatore** puo' accedere al percorso, alle Server Action o ai dati
  di audit del pilot;
- i percorsi AI legacy fuori dall'Assistente GM restano invariati;
- nessuna bozza o generazione modifica il canone senza conferma esplicita del
  GM;
- un artefatto confermato usa le Action Registry gia' esistenti per essere
  salvato nella campagna e indicizzato secondo le regole di dominio esistenti.

Non introdurre agenti autonomi. Il v2 e' un orchestratore conversazionale con
strumenti tipizzati e guardrail deterministici.

## Obiettivo prodotto

Il GM deve poter avere un dialogo naturale, ad esempio:

> Crea un PNG per la Citta' di Sotto.
>
> Rendilo piu' anziano, legalo al Catino e fai il ritratto notturno senza
> armatura.
>
> Questa versione va bene: salva testo e immagine nella wiki della campagna.

Il sistema deve:

1. mantenere il contesto della conversazione e delle bozze in lavorazione;
2. fondare i fatti canonici sulle fonti della campagna, oppure dichiarare che
   non dispone dell'informazione;
3. distinguere fatti documentati da proposte creative;
4. aggiornare la stessa bozza o immagine quando il GM chiede modifiche;
5. presentare una conferma UI esplicita prima della scrittura;
6. creare gli oggetti di dominio reali e collegati (wiki, immagini, missioni,
   sessioni, task, campagne, schede);
7. registrare fonti, esito, latenza e feedback, senza duplicare chunk o binari.

## Vincoli non negoziabili

1. **Accesso.** Admin e GM autorizzati soltanto; controllo eseguito prima di
   retrieval, provider, persistenza o audit. Il pilot non amplia mai i permessi
   dei player.
2. **Canone.** Il modello non scrive direttamente tabelle di dominio. Ogni
   salvataggio passa da `executeAction` e richiede una conferma esplicita nella
   UI.
3. **Memoria.** Usare il retriever v2 (`retrievePreviewMemory` e RPC esatta
   `match_campaign_memory_preview`), non `match_campaign_memory`.
4. **Fatti e creativita'.** I fatti canonici devono avere evidence ID validi.
   Una continuazione creativa e' consentita solo se etichettata come proposta,
   senza presentarla come fatto noto.
5. **Regole.** Per schede e regole, i manuali ufficiali prevalgono su memoria,
   catalogo e conoscenza del modello. Se manca una fonte ufficiale, dichiararlo.
6. **Immagini.** Il v2 deve riusare policy visiva, stile, prompt positivi e
   negative prompt del legacy. Il RAG v2 aggiunge fatti della campagna, non
   sostituisce tali controlli.
7. **Legacy.** Non modificare o rimuovere percorsi legacy salvo il refactor
   strettamente necessario per estrarre un builder condiviso, coperto da test
   di regressione.
8. **Audit.** Mai salvare API key, embedding, chunk completi, prompt completi
   sensibili o binari immagine nell'audit. Salvare riferimenti, hash/versioni
   di policy e metriche.

## Architettura target

```text
Assistente GM v2 (GM/Admin)
  -> accesso campagna
  -> thread conversazionale persistente
  -> orchestratore strutturato
       -> retrieval memoria v2 / evidenze
       -> narrativa / wiki
       -> immagini ibride
       -> manuali ufficiali e schede
       -> action proposal builder
  -> risposta conversazionale + card artefatto revisionabile
  -> conferma UI esplicita
  -> Action Registry esistente
  -> salvataggio di dominio + reindex esistente, quando applicabile
```

### Cosa sostituisce e cosa conserva

| Area | Stato nel pilot |
| --- | --- |
| UI Assistente GM | Evoluta: chat continua, artefatti e conferme UI |
| `pendingProposal` e fasi `awaiting_*` | Sostituiti gradualmente dal work state v2; non usare risposte rigide come unico input |
| Retrieval Command Center legacy | Sostituito nel solo v2 dal retriever memoria v2 |
| Action Registry e audit azioni | Conservati; sono l'unica strada per le scritture |
| Generatori wiki/campagna/scheda legacy | Conservati e avvolti da adapter v2 finche' i test non dimostrano equivalenza o miglioramento |
| Prompt immagini legacy | Conservati in un builder condiviso e usati anche dal v2 |
| Pagine e generatori AI fuori dal Command Center | Invariati |
| Preview Admin dedicata | Invariata e separata; resta laboratorio di validazione |

## Contratti v2

I contratti devono essere tipi puri e validati lato server. Non affidarsi alla
sola istruzione nel prompt.

```ts
type AiAssistantThread = {
  id: string;
  ownerUserId: string;
  campaignId: string | null;
  mode: "v2_pilot";
  status: "active" | "archived";
  stateVersion: number;
  summary: string | null; // sintesi breve, non memoria canonica
};

type AiAssistantArtifact = {
  id: string;
  threadId: string;
  campaignId: string | null;
  kind: "narrative" | "wiki" | "image" | "rules" | "sheet" | "action";
  status: "draft" | "ready_for_review" | "approved" | "saved" | "discarded" | "failed";
  revision: number;
  parentArtifactId: string | null;
  payload: Record<string, unknown>; // schema specifico per kind
  sourceRefs: AiMemoryPreviewSourceRef[];
  policyVersion: string | null;
  savedEntity: { type: string; id: string } | null;
};

type AiAssistantTurnResult = {
  assistantMessage: string;
  intent: "answer" | "create" | "revise" | "generate_image" | "save" | "discard" | "ask_clarification";
  evidence: AiMemoryPreviewSource[];
  artifactOperations: Array<
    | { op: "create"; artifact: AiAssistantArtifactDraft }
    | { op: "revise"; artifactId: string; patch: JsonPatchLike[] }
    | { op: "request_confirmation"; artifactId: string; actionName: string }
  >;
  clarification: { required: boolean; question: string | null };
};
```

Regole del contratto:

- il modello puo' proporre operazioni, ma il server valida tipo, campagna,
  ownership, evidence e schema prima di persisterle;
- una revisione usa `artifactId` e `revision` correnti; se sono obsoleti, il
  server rifiuta con conflitto e ricarica la bozza;
- la conferma avviene su una specifica revisione e un'azione specifica;
- testo libero come “salva”, “vai bene” e “usa questa versione” e' interpretato
  come possibile conferma, ma la UI richiede comunque il click finale;
- un chiarimento e' richiesto solo quando manca un dato davvero bloccante;
  non usare fasi conversazionali rigide per chiedere si/no.

## Dati, accesso e migration

Creare una migration nuova, timestamp successivo all'ultima migration del
repository, con:

1. `ai_assistant_threads`
   - owner, campagna, mode, summary breve, `state_version`, timestamps;
   - indice `(owner_user_id, updated_at desc)` e `(campaign_id, updated_at desc)`.
2. `ai_assistant_turns`
   - thread, numero progressivo, ruolo, contenuto, intent, riferimenti artefatto,
     provider/model logico, usage e timing sicuri;
   - non contenere prompt completi assemblati, chunk, embedding o segreti.
3. `ai_assistant_artifacts`
   - thread, campagna, tipo, stato, revisione, parent, payload JSONB validato,
     `source_refs`, `policy_version`, `saved_entity`, errore sicuro;
   - indice per thread/stato e per campagna/stato.
4. `ai_assistant_feedback`
   - artifact o turn, voto `approved | needs_review | incorrect`, nota limitata,
     autore e timestamp.

Le policy RLS devono permettere al solo proprietario GM/Admin di leggere e
aggiornare le proprie conversazioni; l'accesso Admin e' esplicito. Le Server
Action devono ripetere la guardia: RLS non e' un sostituto della policy
applicativa. Prima dell'implementazione, il worker deve verificare quale modello
di appartenenza campagna e' gia' usato dal prodotto e riusarlo: non assumere che
il ruolo `gm` da solo autorizzi tutte le campagne.

## Modello e routing

Non hardcodare un provider o un modello nel componente UI.

- Introdurre un adapter `assistant-model-router` con nomi logici:
  `orchestrator`, `narrative`, `rules`, `image_prompt`.
- Il modello `orchestrator` deve produrre JSON strutturato e ragionare su
  modifiche multi-turno; temperatura bassa/moderata.
- I modelli dei generatori esistenti restano dietro i loro adapter fino alla
  valutazione comparativa.
- Registrare nel turn solo provider/model logico, latency e token usage, mai
  credenziali.
- Se il router o un provider non e' disponibile, conservare la bozza precedente
  e spiegare l'errore; non degradare in una risposta inventata.

La scelta del modello definitivo avviene dopo la valutazione del pilot, non in
base a impressioni isolate.

## Milestone e task per worker

I task sono **sequenziali**. Un worker non deve iniziare una milestone finche'
quella precedente non e' verificata e integrata. Ogni task produce un commit
atomico, non modifica file non elencati senza motivarlo e non tocca gli export
`docs/gmflow-*` generati localmente.

### M0 — Baseline, contratti e test di sicurezza

**Scopo:** fissare i contratti e proteggere l'accesso prima della UI.

**File di proprieta':**

- `src/modules/command-center/ai-v2/contracts.ts` (nuovo)
- `src/modules/command-center/ai-v2/policy.ts` (nuovo)
- `src/modules/command-center/ai-v2/access.ts` (nuovo)
- `supabase/migrations/<timestamp>_ai_assistant_v2_pilot.sql` (nuovo)
- `src/types/database.types.ts` (rigenerato/aggiornato coerentemente)
- `src/modules/command-center/ai-v2/__tests__/policy.test.ts` (nuovo)
- `src/modules/command-center/ai-v2/__tests__/access.test.ts` (nuovo)

**Implementare:** tipi, schema validator, limiti input, state version,
guardia GM/Admin e campagna, schema DB/RLS. Nessuna chiamata AI,
nessuna UI, nessuna scrittura nelle tabelle di dominio.

**Accettazione:**

- player e utente non autenticato sono rifiutati prima di ogni retrieval/provider;
- GM/Admin non puo' operare su una campagna che non puo' gestire;
- payload, revisioni e feedback non validi sono rifiutati;
- migration applicabile su progetto Supabase corretto;
- test M0 e `npm run test:command-center` passano.

### M1 — Thread conversazionale e orchestratore strutturato

**Scopo:** eliminare le risposte bloccate senza permettere salvataggi.

**File di proprieta':**

- `src/modules/command-center/ai-v2/thread-repository.ts` (nuovo)
- `src/modules/command-center/ai-v2/turn-service.ts` (nuovo)
- `src/modules/command-center/ai-v2/orchestrator.ts` (nuovo)
- `src/modules/command-center/ai-v2/assistant-model-router.ts` (nuovo)
- `src/modules/command-center/server/ai-v2-actions.ts` (nuovo)
- `src/modules/command-center/ai-v2/__tests__/turn-service.test.ts` (nuovo)
- `src/modules/command-center/ai-v2/__tests__/orchestrator.test.ts` (nuovo)

**Implementare:** creazione/ripresa thread, ultimi turn e sintesi limitata,
output JSON validato, operazioni su artefatti, revisione in linguaggio naturale,
gestione conflitti di revisione. I messaggi “sì”, “no”, “conferma” devono essere
normali input semantici, non nomi di stati obbligatori.

**Fuori scope:** Action Registry, immagini reali, scritture di dominio.

**Accettazione:** una bozza narrativa puo' essere creata e modificata almeno tre
volte con richieste naturali; una richiesta ambigua genera una sola domanda
mirata; provider/parsing failure non distrugge la bozza; nessuna action di
dominio viene invocata.

### M2 — Grounding memoria v2 e narrativa/wiki revisionabile

**Scopo:** collegare la conversazione alla memoria canonica affidabile.

**File di proprieta':**

- `src/modules/command-center/ai-v2/context-service.ts` (nuovo)
- `src/modules/command-center/ai-v2/narrative-service.ts` (nuovo)
- `src/modules/command-center/ai-v2/artifact-schemas.ts` (nuovo)
- `src/modules/command-center/ai-v2/__tests__/context-service.test.ts` (nuovo)
- `src/modules/command-center/ai-v2/__tests__/narrative-service.test.ts` (nuovo)

**Riutilizzare senza duplicare:**

- `src/lib/ai-core/campaign-memory-retriever.ts`;
- `src/lib/ai-core/grounded-answer.ts` e contratti evidence;
- le routine wiki esistenti solo dietro adapter esplicito.

**Implementare:** retrieval scoped alla campagna con RPC esatta, contesto a
budget, evidence ref, risposta “informazione assente”, separazione fra fatti
citati e proposte creative. La narrativa proposta per wiki deve essere una
revisione dell'artefatto, non una rigenerazione scollegata.

**Accettazione:**

- nessun import o uso di `match_campaign_memory` in `ai-v2`;
- domanda senza fonte dichiara la lacuna e non chiama il generatore libero;
- ogni fatto dichiarato canonico possiede fonte valida mostrabile;
- una revisione conserva i fatti approvati e cambia solo le parti richieste;
- risultati del set Eldaria sono registrabili con feedback.

### M3 — UI chat fluida e conferma per artefatto

**Scopo:** rendere utilizzabile il v2 da GM in modo naturale.

**File di proprieta':**

- `src/components/command-center/ai-assistant-v2-panel.tsx` (nuovo)
- `src/components/command-center/ai-assistant-v2-artifact-card.tsx` (nuovo)
- `src/components/command-center/ai-assistant-v2-sources.tsx` (nuovo)
- `src/components/command-center/command-center-client.tsx`
- `src/app/command-center/page.tsx`
- test componenti/UI appropriati e Playwright dedicato

**Implementare:** selettore “Assistente v2 — Pilot”, thread recente, messaggi
continuativi, card bozza con revisioni, fonti, azioni **Modifica**, **Rigenera**,
**Scarta**, **Prepara salvataggio** e **Conferma e salva**. La chat non mostra
istruzioni rigide tipo “scrivi si/no”; usa pulsanti contestuali e accetta testo
libero. Indicare sempre campagna attiva, modalita' pilot e stato non salvato.

**Accettazione:** un GM pilota puo' riprendere un thread dopo refresh; puo'
modificare testo selezionato e artefatto intero; nessuna card dichiara “salvata”
prima dell'esito server; player non puo' caricare route o Server Action.

### M4 — Bridge di salvataggio verso Action Registry

**Scopo:** trasformare artefatti approvati in oggetti reali della campagna.

**File di proprieta':**

- `src/modules/command-center/ai-v2/save-service.ts` (nuovo)
- `src/modules/command-center/ai-v2/action-bridge.ts` (nuovo)
- `src/modules/command-center/ai-v2/__tests__/save-service.test.ts` (nuovo)
- modifiche minime a `src/modules/command-center/actions/*` solo se manca un
  adapter, senza cambiare il comportamento legacy.

**Implementare:** mapping artefatto -> payload action validato, verifica
`revision` e campaign ID al momento della conferma, chiamata `executeAction`,
aggiornamento `saved_entity`, audit con `source: ai_assistant_v2`, gestione
idempotenza. Usare il reindex gia' previsto dal dominio; non chiamarne un secondo
se l'azione esistente lo effettua gia'.

**Accettazione per ogni tipo iniziale:**

| Artefatto | Action di salvataggio |
| --- | --- |
| Wiki NPC/luogo/lore/oggetto/mostro | `wiki.entity.create` / `wiki.entity.update` |
| Missione | `mission.create` / `mission.update` |
| Sessione | `session.create` / `session.update` |
| Nota GM | `gm.note.create` / `gm.note.update` |
| Task workspace | `workspace.task.create` |
| Campagna | `campaign.create` / `campaign.update` |

Ogni test deve provare: nessuna scrittura senza click di conferma, doppio click
idempotente, rifiuto su revisione obsoleta, campagna errata o policy negata,
entita' salvata collegata alla campagna corretta e audit presente.

### M5 — Immagini v2 ibride e collegamento agli artefatti

**Scopo:** mantenere le immagini qualitativamente forti senza perdere i
controlli legacy.

**File di proprieta':**

- `src/lib/ai/image-prompt-policy.ts` (nuovo/shared)
- adapter minimi in `src/lib/ai/image-prompt-builder.ts`
- `src/modules/command-center/ai-v2/image-service.ts` (nuovo)
- `src/modules/command-center/ai-v2/__tests__/image-service.test.ts` (nuovo)
- test di regressione per il builder legacy.

**Implementare:** estrarre una policy comune che mantenga:

- `campaign.ai_context.visual_negative`;
- `ai_image_styles.negative_prompt` e prompt positivo;
- `STANDARD_VISUAL_NEGATIVES`;
- hint di composizione per NPC, luogo, oggetto e mostro;
- ratio e provider payload esistenti.

Il v2 aggiunge soltanto fatti visivi recuperati dalla memoria e modifiche
richieste dal GM. Ogni rigenerazione parte dall'artefatto immagine precedente,
non da una richiesta priva di contesto. Salvare nell'artefatto URL, policy
version/hash e fonti; non binari o prompt sensibili completi.

**Accettazione:** a parita' di input il percorso legacy conserva la stessa
policy; il v2 mostra le fonti usate, accetta modifiche naturali e salva l'URL
immagine nella voce/campagna corretta solo dopo conferma.

### M5.5 — Chiusura di sicurezza e integrazione del pilot (bloccante)

**Scopo:** correggere gli scostamenti M0-M5 prima di esporre il v2 a qualsiasi
GM o di iniziare regole/schede.

**Questo gate e' obbligatorio se i task M0-M5 sono stati implementati in modo
parziale o in un'unica serie di modifiche non ancora verificata.**

**Correzioni richieste:**

1. Mantenere il v2 come percorso predefinito dell'Assistente GM, come deciso.
   Route e Server Action devono comunque verificare GM/Admin e la gestione della
   campagna prima di retrieval, provider o persistenza; player e utenti non
   autenticati non devono raggiungere alcun percorso v2.
2. Completare migration e tipi DB: feedback, check constraint per `kind`/`status`,
   indici, policy GM/Admin/owner e policy separate per turn,
   artefatti e feedback. Un client autenticato non deve poter creare turni
   assistant, falsificare evidence, cambiare `saved_entity` o segnare un
   artefatto come salvato via Data API.
3. Applicare la guardia pilot e la policy campagna **prima** di ogni uso del
   client service-role per retrieval, policy immagine o provider.
4. Sostituire il router deterministico con un adapter provider reale a output
   strutturato, validato dal server. Il test doppio deve simulare il provider;
   il router finto puo' restare solo come fixture.
5. Persistenza corretta delle revisioni: modifica, rigenera, scarta e prepara
   devono aggiornare l'artefatto server-side con confronto atomico di
   `revision`/`state_version`. Dopo refresh la UI ricarica thread, turni e
   artefatti reali.
6. Salvataggio idempotente: riservare atomicamente lo stato `saving` prima di
   invocare `executeAction`; completare lo stato `saved` dopo successo e
   recuperare l'esito in caso di retry. Non invocare l'action prima della
   reservation, altrimenti due click possono creare due entita'.
7. Implementare il mapping completo e validato artifact -> action per i tipi
   M4; non accettare un `actionName` libero dal browser e non salvare ogni
   artefatto come `gm.note.create` o wiki `lore`.
8. Correggere il percorso immagine: inviare davvero il negative prompt legacy
   nel payload OpenRouter, passare fonti RAG v2 e tipo entita' reale, e usare
   una vera referenza multimodale per la revisione di un'immagine precedente.
   Il semplice URL nel testo non e' un image-to-image edit.
9. Aggiungere test di integrazione per guardia, RLS, revisione, conferma doppia,
   save mapping, citazioni e payload immagine; fare smoke browser autenticato
   e test provider reale su campagna/test asset sicuri.

**Accettazione:** M0-M5 sono dichiarabili completate solo quando tutti i nove
punti sono dimostrati da test e verifiche reali. Fino ad allora M6 e M7 restano
bloccate e non va applicata la migration al progetto produttivo.

### M6 — Regole e schede

**Scopo:** aggiungere la capacita' piu' sensibile solo dopo la stabilita' del
flusso conversazionale e di salvataggio.

**File di proprieta':**

- `src/modules/command-center/ai-v2/rules-service.ts` (nuovo)
- `src/modules/command-center/ai-v2/sheet-service.ts` (nuovo)
- test mirati a manuali, conflitti e output scheda.

**Implementare:** adapter al preview regole/manuali ufficiali, citazioni delle
fonti, stato `official_verified | official_not_found | conflict`, house rule
separata. La generazione scheda produce una bozza e richiede conferma prima del
collegamento al personaggio. Non usare il catalogo come fonte primaria.

**Accettazione:** domanda priva di manuale ufficiale non inventa meccaniche;
conflitti sono dichiarati; una scheda salvata e' collegata al PG/campagna giusti
ed e' auditabile.

### M7 — Valutazione, rollout e promozione

**Scopo:** decidere con dati se promuovere v2, non con una sola buona prova.

**Implementare:** dashboard Admin di feedback aggregati e set A/B manuale per
gli scenari Eldaria. Misurare per capability e modello:

- correttezza/grounding e violazioni di canone;
- riuscita delle revisioni al primo tentativo;
- violazioni negative prompt/stile per immagini;
- tempo totale e per fase;
- costo/token quando disponibile;
- voto GM e motivo;
- salvataggi riusciti, annullati o falliti.

**Gate di promozione:** nessun aumento di accesso o sostituzione legacy finche'
non esistono risultati su almeno 10 scenari per capability e GM pilota, nessuna
violazione critica di accesso/canone, e miglioramento o parita' sui KPI concordati.

## Sequenza di rilascio

1. Integrare e applicare M0 migration; verificare RLS e guardia con Admin, GM
   autorizzato, GM non autorizzato e player.
2. Integrare M1-M2 dietro il pilot, senza esporre la UI a tutti i GM.
3. Integrare M3 e fare smoke test browser autenticato con una campagna test.
4. Integrare M4 per wiki/testo; abilitare un piccolo gruppo di GM pilota.
5. Integrare M5 e misurare A/B immagini legacy contro ibrido.
6. Integrare M6 soltanto dopo esito positivo di testo+immagini.
7. Eseguire M7 e decidere esplicitamente se: mantenere pilot, estendere ai GM,
   promuovere v2 a default, oppure ritirarlo. Il legacy non viene eliminato da
   questo piano.

## Matrice minima di test reali

| Scenario | Risultato atteso |
| --- | --- |
| GM pilota chiede fatto noto di Eldaria | risposta con fonti e citazioni valide |
| GM chiede informazione assente | dichiarazione esplicita, nessuna invenzione |
| GM chiede un NPC e tre revisioni | stessa bozza aggiornata, fatti preservati |
| GM chiede immagine e poi una modifica | nuova immagine con policy legacy + contesto v2 |
| GM salva una wiki con immagine | entita', URL e campagna corretti, audit e reindex coerente |
| GM annulla | nessuna scrittura di dominio |
| Doppia conferma/retry rete | nessun doppio salvataggio |
| GM non abilitato/player | route e azioni negate prima di AI/RAG/audit |
| Regola non trovata nel manuale | nessuna meccanica inventata |
| Conflitto manuale/canone | manuale dichiarato fonte primaria, conflitto esplicitato |

## Verifica obbligatoria per ogni worker

1. `npm ci` se le dipendenze non sono presenti; non aggirare `tsx` mancante.
2. Eseguire il test unitario della milestone, `npm run test:command-center` e
   `npm run test:ai-preview` quando si modifica codice condiviso `ai-core`.
3. Eseguire `npm run build` quando la milestone modifica route, Server Action,
   componenti o tipi DB.
4. Eseguire `git diff --check` e dichiarare esplicitamente eventuali failure
   preesistenti/non correlate.
5. Per migration e accesso, applicare solo dopo autorizzazione e verificare il
   progetto Supabase collegato; i test locali non provano RLS remoto.
6. Per UI, fare almeno un browser smoke test autenticato; non dichiarare il
   flusso end-to-end verificato con soli mock unitari.

## Fuori scope

- eliminazione o riscrittura globale del legacy;
- accesso player all'AI;
- scritture autonome o workflow a livello autonomia 3+;
- reindicizzazione massiva della memoria esistente;
- cambiare provider/modello globale senza valutazione comparativa;
- usare i thread conversazionali come fonte canonica: il canone resta nelle
  tabelle di dominio e nei chunk indicizzati dopo salvataggio approvato.
