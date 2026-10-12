# Audit EXP — GM Screen e percorsi collegati

Data: 12 ottobre 2026. Checkout: `46f35d9a`. Audit in sola lettura del prodotto e del database; nessuna EXP, sessione o migrazione modificata. Questo documento è l'unico nuovo file nel repository.

## Conclusione

Le sovrapposizioni non sono solo terminologiche: ci sono difetti riproducibili nella bozza e nella chiusura del combattimento. L'accredito definitivo dispone già di una transazione e di un registro contro le ripetizioni. Conviene mantenere quel nucleo e unificare lo stato della sessione, il calcolo e i comandi che preparano l'accredito.

## Che cosa viene salvato oggi

| Percorso | Dati salvati | Accredito reale? | Limite |
| --- | --- | --- | --- |
| GM Screen Long, vecchio e v2 | `gm-screen-long-session-{campaignId}-{sessionId}`: presenze, combattimento, pool EXP, correzioni, ore, economia | No, solo localStorage | Nessuna bozza server automatica; difetto nel ripristino/cambio sessione |
| GM Screen Legacy, entrambe le griglie v2 | `gm-screen-session-xp-{campaignId}` e `gm-screen-initiative-{campaignId}` | No, solo localStorage | Stato per campagna, non per sessione; due pannelli EXP non controllati possono tenere copie divergenti |
| Plancia tattica Long: Chiudi Fight | Incrementa `bankedMonsterXp` e avvia il reset del tracker | No | Il reset del roster controllato non viene propagato correttamente |
| Griglia: Chiudi Fight nel tracker iniziativa | Avvia il reset, senza `onBankExp` | No | Stesso nome, comportamento diverso dalla tattica |
| Pannello PG/XP: Chiudi fight | Incrementa `bankedMonsterXp`; solo Long ha callback per svuotare il combattimento condiviso | No | Terza implementazione; Legacy mantiene i mostri nel salvataggio iniziativa |
| Wizard: Salva in bozza | `sessions.pre_closed_xp_gained`, `pre_closed_xp_awards`, `is_pre_closed`; registra anche presenze | No EXP | Non è una bozza priva di effetti: la RPC può incrementare il contatore presenze e il relativo trofeo |
| Web telefono `/gm-exp-mobile` | Cache `gm-mobile-xp-{campaignId}-{sessionId}` + autosalvataggio server dopo circa 1,2 secondi | No EXP | Importi finali individuali; locale prevale sul server senza revisione/confronto |
| Wizard: chiusura definitiva | RPC `close_session_with_xp_and_hours` → `close_session_with_xp_persisted` → `close_session_with_xp` | Sì | Totale canonico sulla scheda e registro `session_xp_awards`; fallback della bozza può ignorare zero/lista vuota espliciti |
| MCP: proposta e chiusura | Stessa bozza server e stessa RPC atomica; proposta firmata e verifica rilettura | Solo alla conferma | Percorso coerente con il nucleo database, distinto dalla logica di calcolo del GM Screen |
| Lista sessioni Quest/Torneo: chiusura semplice | RPC EXP con quota 0 e lista vuota | Chiude con EXP zero | Non recupera la bozza EXP precedentemente salvata |
| Scheda GM: Salva PE | RPC `set_character_xp_canonical` | Sì, imposta il totale assoluto | Rettifica distinta da un premio di sessione; non crea una voce nel registro sessioni |
| App nativa locale in `mobile/` | Scrive direttamente `campaign_characters.current_xp`, poi marca `is_pre_closed` e quota base | Sì, già prima del PC | Non passa dal registro; chiusura successiva dal PC può assegnare nuovamente la quota base |

`mobile/` è non tracciata da Git in questo checkout. Il codice nativo punta allo stesso progetto Supabase; non è stato verificato se la versione installata/usata dall'utente coincida con questi sorgenti. Va distinto dal telefono via pagina web, che salva solo la bozza.

## Regola di calcolo attuale

Pool gruppo = EXP mostri morti ancora nel tracker + EXP combattimenti accumulati + extra manuali.

Quota = floor(pool / numero personaggi presenti).

EXP del singolo = max(0, quota + 50 × (numero più − numero meno)), salvo valore finale manuale che sostituisce interamente questo risultato. Un assente riceve zero.

Conseguenze: gli extra manuali sono un totale di gruppo, non un premio per ciascuno; il valore finale blocca i successivi ricalcoli per quel PG; cambiare presenze redistribuisce l'intero pool, inclusi i fight precedenti. Le presenze dei singoli combattimenti non vengono registrate. I resti della divisione non vengono assegnati.

## Difetti verificati

### 1. Ripristino e cambio sessione Long possono perdere o contaminare la bozza — alta priorità

`gm-screen-long-state.tsx:380–425` legge localStorage solo dopo aver atteso gli iscritti; l'effetto di persistenza a `459–475` scrive subito anche se il ripristino non è finito. Mancano un'identità della sessione effettivamente caricata e una barriera di ripristino.

Riproduzione browser con il provider reale, richieste server sostituite da risposte ritardate e dati artificiali: sessione A salvata con 500 EXP → dopo caricamento 0. Con A a 500 e B precedentemente a 900 → selezione B porta B a 500. Nessuna sessione reale toccata.

### 2. Chiudi Fight Long può raddoppiare la bozza — alta priorità

`initiative-tracker.tsx:508` evita di notificare al parent un roster vuoto quando il parent ne contiene ancora uno. Questo protegge il caricamento iniziale, ma blocca anche il reset intenzionale. Nella tattica `onBankExp` aggiunge l'EXP al pool; la UI sparisce, mentre il roster del parent conserva i morti. `computeSessionXpAwards` somma quindi banca e mostri già bancati.

Riproduzione con `InitiativeTracker` e calcolatore reali in modalità controllata Long: un mostro da 500 EXP → Chiudi Fight → banca 500, UI senza mostri, roster parent ancora con un morto, totale bozza 1000. Il valore non è stato accreditato nel database durante la prova.

`Annulla Reset` ripristina il roster senza stornare la banca. Anche correggendo il primo difetto, questa azione deve essere coordinata con il trasferimento EXP o separata dal reset manuale.

### 3. Tre Chiudi fight con semantiche differenti — alta priorità

- Tattica Long: banca + reset del tracker, con il difetto sopra.
- Griglia Long: il pannello Initiative non passa `onBankExp`; il tracker sparisce ma, per il difetto del reset controllato, il parent mantiene il combattimento. Nella prova banca 0, totale ancora 500: non è stato riprodotto un azzeramento del pool Long in questo preciso stato.
- Tracker Legacy: non banca; reset rimuove il roster dal salvataggio. Prova browser: 500 → 0.
- PG/XP Long: banca e svuota il parent con callback propria, senza usare il comando del tracker/timer.
- PG/XP Legacy: banca ma non svuota il salvataggio iniziativa. Il wizard può sommare gli stessi morti alla banca nel recupero locale.

La prima lettura del codice suggeriva perdita EXP anche nella griglia Long; la riproduzione ha chiarito che oggi il difetto del reset lascia invece il roster nel parent. La perdita è stata riprodotta nel tracker Legacy.

### 4. Zero individuale non arriva alla chiusura — alta priorità

`computeSessionXpAwards` elimina gli award con `xp <= 0` a `player-session-tracker.tsx:169`. La RPC live cerca un award individuale; se non lo trova usa `p_xp_gained`.

Riproduzione del calcolo reale: pool 1000, due presenti, quota 500; finale manuale del primo a 0. La UI calcola correttamente 0, ma l'array contiene solo il secondo a 500. Con questo payload la RPC applica al primo la quota comune di 500. Va sempre inviato anche lo zero esplicito dei presenti.

### 5. Wizard: due autorità per lo stesso premio — priorità media

L'input «XP guadagnati (assegnati a tutti i presenti)» modifica solo `xpGained`. Non aggiorna `resolvedPerPlayerXpAwards`. Se c'è un award individuale, la RPC usa quello prima della quota comune. Il riepilogo indica solo il numero di assegnazioni personalizzate, senza una tabella dei valori effettivi.

Inoltre il wrapper server in `src/app/campaigns/actions.ts:2133–2141` considera quota 0/lista vuota come richiesta di recuperare i valori server precedenti. Azzerare esplicitamente una bozza può quindi non azzerare il premio applicato.

### 6. Bozze PC/server/telefono possono prevalere senza che sia visibile — priorità media

Il provider PC non legge la bozza server. Il wizard parte dalle props, può sostituirle con la bozza server e può poi recuperare localStorage se le props sono vuote/zero. La pagina web telefono sovrappone i valori locali a quelli server e li autosalva. Non c'è confronto di revisione né indicazione univoca della fonte effettiva.

### 7. Percorsi esterni al wizard da ricondurre allo stesso contratto

La chiusura semplice Quest/Torneo passa zero senza recuperare la bozza. L'app nativa locale eroga direttamente e poi lascia la sessione in prechiusura, con rischio di un secondo premio al PC e di divergenza dal totale membro. Le rettifiche assolute sulla scheda sono legittime ma vanno presentate come rettifiche, separate dalle EXP guadagnate nella sessione.

Esiste anche `ensureCampaignMemberWithAdmin(...xpToAdd)` con scritture dirette in `actions.ts`; la ricerca non trova chiamanti nel checkout attuale. Non è stato contato come percorso operativo attivo. `CloseSessionDialog`/`closeSession` restano presenti ma non è stato trovato un import della UI; distinta dalla chiusura semplice effettivamente richiamata dalla lista sessioni.

## Database live: cosa funziona e cosa è stato verificato

Progetto Supabase verificato: `dnd-campaign-manager`. Lettura delle definizioni effettive delle cinque RPC, degli indici e dei trigger; nessuna RPC di scrittura eseguita.

- La scheda `campaign_characters.current_xp` è canonica. `campaign_members.xp_earned` è un totale compatibile aggiornato dalla stessa transazione.
- `session_xp_awards` ha vincoli unici per sessione/giocatore e per sessione/personaggio. Una sessione già completata non riceve un secondo accredito tramite lo stesso nucleo.
- Chiusura, EXP e ore sono nella stessa transazione; la RPC controlla anche il piano ore.
- 29 award nel registro, tutti con totale finale `xp_after`; uno senza personaggio assegnato. Nessun registro EXP collegato a sessioni ancora aperte.
- Nessuna divergenza tra totali scheda/membro per i personaggi assegnati confrontabili. Nessun giocatore con due personaggi assegnati nella stessa campagna.
- 4 sessioni scheduled, nessuna attualmente in prechiusura; 50 completed. Una completed conserva il flag prechiusura: riscontro storico da non correggere automaticamente.
- Nessun trigger attribuisce EXP al posto del flusso descritto. I trigger letti aggiornano soltanto `updated_at` su personaggi/sessioni.

Questi controlli non provano che le EXP storiche siano tutte corrette: un pool duplicato nella UI può produrre una singola scrittura perfettamente valida nel registro.

## Quadra raccomandata

Un solo stato della sessione e un solo calcolatore condiviso da tattica, entrambe le griglie, telefono e wizard. Mantenere la formula attuale per evitare una modifica involontaria alle regole di premio.

1. «Concludi scontro»: trasferisce una sola volta i mostri nel pool e svuota il combattimento nella stessa operazione di stato. Non accredita le schede. Tutte le viste usano lo stesso comando. Reset/annullamento devono avere effetti espliciti e coerenti sul pool.
2. «EXP sessione»: unico pannello con combattimenti conclusi, combattimento corrente, extra di gruppo, quota, bonus/malus, override e totale di ogni presente. Distinguere visivamente correzione e valore finale bloccato.
3. «Salva bozza»: unica bozza per sessione condivisa tra PC e telefono, con breakdown e risultati. LocalStorage serve a recuperare modifiche non ancora salvate; non deve prevalere silenziosamente sul server. Usare identità della sessione caricata e confronto revisione; non introdurre un secondo motore di accredito.
4. «Chiudi sessione e accredita EXP»: wizard mostra gli stessi importi effettivi e la conferma prima/dopo per PG. Invia lista completa, inclusi zero espliciti, al nucleo RPC esistente. Il campo comune non deve competere con un elenco individuale nascosto.
5. «Rettifica EXP totali»: comando separato sulla scheda, mantenendo la RPC canonica. App nativa e chiusura semplice devono seguire lo stesso contratto di bozza/chiusura.

Ordine: prima proteggere ripristino/reset/zero, poi unificare le viste e rendere leggibile il riepilogo, infine convergere telefono e percorsi secondari. Non basta rinominare i pulsanti e non serve riscrivere il backend atomico.

## Limiti della verifica

Riproduzioni in Chromium con componenti e funzioni reali del checkout; azioni server sostituite nel solo banco di prova, risposte ritardate e dati sintetici. Database live letto in sola lettura. Non sono state chiuse sessioni vere né eseguite prove dell'app nativa installata. I banchi di prova sono temporanei fuori dal repository; il codice prodotto non è stato modificato.

## Implementazione autorizzata il 12 ottobre 2026

Il GM Screen V2 usa lo stesso provider per Long e Quest/Oneshot/Torneo. Il provider attende il recupero della sessione e dei personaggi prima di persistere, separa le sessioni e conserva una copia locale con revisione. Una bozza remota più recente prevale sulla vecchia copia locale. I salvataggi sono serializzati per dispositivo; una revisione remota diversa blocca la sovrascrittura. Durante il wizard l'autosalvataggio del pannello viene sospeso.

«Concludi scontro» trasferisce i mostri morti nel pool e svuota il roster nel provider condiviso. Il reset controllato comunica esplicitamente il roster vuoto. L'annullamento del reset non è disponibile dopo il trasferimento EXP, per evitare un secondo conteggio. Le viste storiche senza provider conservano il pool nello storage precedente e notificano il pannello EXP.

Il calcolatore è in `src/lib/gm/session-xp.ts`. Gli importi individuali a zero rimangono nel payload. Il wizard mostra importi modificabili e, quando la scheda è leggibile, il totale prima/dopo; modificare la quota comune aggiorna davvero le assegnazioni di tutti i presenti. La bozza resta modificabile anche se già prechiusa; il suo salvataggio non richiama la pulizia del provider riservata alla chiusura definitiva.

La bozza condivisa è in `sessions.xp_draft_state`, con revisione `xp_draft_revision`. Le azioni PC/telefono e l'endpoint autenticato `/api/sessions/[id]/xp-draft` usano `save_session_xp_draft`. Le modifiche da telefono conservano il breakdown del PC e aggiornano gli importi finali. La RPC storica `save_session_preclose`, usata anche da MCP, ora prepara soltanto la bozza: non modifica contatori di presenze, trofei o schede. La chiusura standard del wizard verifica la revisione sotto lo stesso lock della transazione esistente. Anche le chiusure semplici recuperano gli importi della bozza.

Nel sorgente nativo locale `mobile/src/screens/gm/GmXpAttendanceScreen.tsx` sono state eliminate erogazione diretta e scritture anticipate delle presenze: legge/salva la stessa bozza via API autenticata. L'app installata richiederà una nuova build dopo la pubblicazione dell'endpoint web. La funzione assoluta `updateCharacterXp` nel context nativo non ha chiamanti nel checkout: rimane una rettifica distinta, non un percorso di premio sessione.

### Verifica dell'implementazione

- Cinque test del calcolatore/contratto: zero esplicito, assenza e redistribuzione, conservazione del pool, zero/lista vuota contro bozza precedente, validazione del payload.
- Chromium, provider e tracker reali con azioni server simulate: 500 EXP a fine scontro restano 500, roster vuoto e nessun undo del trasferimento; reload mantiene 500; cambio sessione recupera 900; fallback storico conserva 500 nello storage.
- Chromium, wizard reale con azioni simulate: bozza prechiusa resta modificabile; `[500, 0, 500]` non viene sovrascritta dai vecchi metadati; quota zero aggiorna entrambi gli importi a zero; override individuale 75 resta visibile.
- PostgreSQL locale isolato: migrazione eseguita, autorizzazione, conflitto di revisione, bozza malformata, compatibilità preclose, rifiuto di sessioni chiuse e verifica revisione prima della chiusura. Nessuna sessione reale usata nei test.
- Migrazione applicata al progetto Supabase corrente. Lettura successiva conferma le due colonne e le tre funzioni, invocabili soltanto da service_role; zero nuove bozze, registro EXP invariato a 29 righe.
- Build Next.js e lint dei file modificati superati. Il controllo TypeScript generale conserva gli errori preesistenti nei fixture sheet-generator/Command Center e la dipendenza PGlite mancante dei vecchi test; nessun nuovo errore nei file dell'intervento.

Restano fuori dalla verifica: browser autenticato end-to-end su campagna reale e app nativa installata. Le prove con azioni simulate non attestano questi percorsi. Il codice web deve ancora essere pubblicato; l'app nativa deve essere ricompilata. Nessuna rettifica storica e nessuna chiusura reale eseguite.

Verifica aggiuntiva: controllo TypeScript dell’app nativa superato. La bozza storica per campagna viene importata una sola volta nella prima sessione selezionata, conservando i vecchi dati per recupero. Le chiusure semplici verificano anch’esse la revisione della bozza.
