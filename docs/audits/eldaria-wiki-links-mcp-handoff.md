# Eldaria Wiki — audit collegamenti e tag via MCP

## Scopo

Completare l'audit in sola lettura di tutti gli elementi Wiki della campagna Eldaria, confrontando contenuti, tag e riferimenti semantici con i collegamenti realmente presenti in `wiki_relationships` tramite il nuovo strumento MCP.

Non modificare entità, tag o collegamenti durante l'audit. Qualsiasi correzione deve essere presentata come delta verificabile e richiede una successiva autorizzazione esplicita.

## Campagna

- Nome: Eldaria
- `campaign_id`: `d9962add-4d55-42ef-bfd7-96eddfe49969`
- Includere esplicitamente le voci `admin_only:true` nell'inventario autenticato.

## Perché serve un nuovo task

Il catalogo MCP è legato alla sessione. Dopo il deploy del nuovo strumento, aprire un nuovo task e verificare con un catalogo pulito che siano disponibili almeno:

- `search_lore`
- `get_entity`
- il nuovo strumento di lettura delle relazioni, previsto come `list_wiki_relationships` o nome equivalente

Non dedurre la disponibilità dal solo deploy o da una risposta HTTP del server MCP.

## Snapshot dell'audit preliminare — 16 settembre 2026

L'inventario MCP è stato ricostruito con ricerche alfanumeriche paginate, `limit:50`, deduplicate per ID.

- 155 elementi Wiki totali
- 94 NPC
- 27 luoghi
- 15 lore
- 10 mostri
- 9 oggetti
- 20 elementi Solo Admin
- 37 elementi con tag strutturati
- 165 assegnazioni di tag
- 102 tag normalizzati distinti
- 34 elementi con il campo testuale `attributes.relationships`
- 12 elementi con `attributes.notable_npcs`
- 217 riferimenti direzionali inferiti da contenuti e attributi
- 34 coppie reciprocamente citate
- 149 riferimenti inferiti in una sola direzione
- 39 candidati isolati, senza tag o riferimenti testuali riconoscibili
- nessun riferimento pubblico verso una voce Solo Admin rilevato nello snapshot

Questi numeri descrivono i contenuti, non le righe effettive di `wiki_relationships`. Devono essere riconciliati con il nuovo strumento MCP.

## Candidati ad alta confidenza da verificare

Sono citazioni presenti in `relationships` o `notable_npcs`, quindi più affidabili delle semplici occorrenze nella prosa.

| Sorgente | Destinazione candidata |
| --- | --- |
| Il Boccale Scheggiato | Marta Bracca |
| Il Boccale Scheggiato | Odo Padellaccio |
| Il Boccale Scheggiato | Nilo Duepassi |
| La Nona Stella | Lidia Fiordalba |
| La Nona Stella | Beren Vaur |
| Locanda delle Tre Lanterne | Timo Bellacorsa |
| Locanda delle Tre Lanterne | Ilario Venn |
| Locanda delle Tre Lanterne | Sera Morn |
| Sede di Portico del Sole Infranto | Gilda del Sole Infranto |
| Sede di Portico del Sole Infranto | Orven Talassar |
| Sede di Portico del Sole Infranto | Portico |
| Archivio delle Successioni | Lysandra Quarto |
| Bacino Settentrionale di Borgonero | Dargo Chiododuro |
| Condotti Termali Inferiori | Bruna Ramechiaro |
| Magazzino d'Isolamento del Varco | Tiberio Nodofermo |
| Vecchia Torre di Segnalazione | Nerea Ventolungo |
| Dan | Patrizio il Locandiere |
| Timo Bellacorsa | Sera Morn |
| Il Gazzettino di Eldaria | Portico |
| Tessa Valeriana | Portico |

Per ogni riga verificare separatamente:

1. se esiste `sorgente → destinazione` in `wiki_relationships`;
2. se esiste `destinazione → sorgente`;
3. se la reciprocità è semanticamente corretta;
4. quale etichetta descrive ciascuna direzione;
5. se visibilità e `admin_only` consentono il collegamento senza esporre contenuti riservati.

## Anomalie da non correggere automaticamente

- Esistono due entità `Bandito`, entrambe di tipo `monster`; i collegamenti per nome sono ambigui e devono usare ID reali dopo disambiguazione.
- `Portico` è un hub: 52 elementi la citano nello snapshot, mentre la sua scheda contiene pochi riferimenti in uscita. Non creare automaticamente 52 reciproci; selezionare solo relazioni editorialmente utili.
- I tag `Portico` e `portico` differiscono soltanto per maiuscole.
- `Mercato di Portco` sembra un possibile refuso rispetto a Portico, ma non va rinominato senza conferma.
- Verificare le varianti `Pinco/Pinko`, `Akmenos Torgul/Turgul` e `Rianvadriel/Riavandriel` contro il canone e gli ID reali.
- Nomi comuni come `Aria`, `Luna` ed `Ella` possono produrre falsi positivi nella prosa. Richiedere contesto semantico, non la sola corrispondenza testuale.
- Conservare la separazione tra testo pubblico, note GM e contenuti Solo Admin.

## Procedura del nuovo task

1. Confermare il catalogo MCP autenticato in una sessione nuova.
2. Inventariare nuovamente tutte le 155 voci con paginazione e deduplicazione per ID; segnalare qualsiasi differenza rispetto allo snapshot.
3. Leggere tutte le righe Wiki→Wiki dal nuovo strumento relazioni, includendo ID, sorgente, destinazione, etichetta e visibilità applicabile.
4. Eliminare dal confronto relazioni verso mappe o missioni: vanno riportate a parte e non confuse con la reciprocità Wiki→Wiki.
5. Costruire tre insiemi distinti:
   - collegamenti reali già reciproci;
   - collegamenti reali unidirezionali;
   - riferimenti semantici senza alcun collegamento reale.
6. Classificare ogni proposta:
   - **alta confidenza**: `relationships`, `notable_npcs`, relazione familiare/organizzativa esplicita;
   - **media confidenza**: nome univoco citato chiaramente nel corpo o nelle note GM;
   - **da revisione umana**: nome comune, omonimo, refuso, citazione storica incidentale o hub geografico.
7. Controllare tag mancanti, duplicati normalizzati, varianti ortografiche e tag che corrispondono esattamente a un'entità.
8. Produrre un delta finale per ID, senza applicarlo: sorgente, destinazione, direzione mancante, etichetta proposta, motivazione, livello di confidenza e impatto di visibilità.
9. Solo dopo approvazione esplicita, applicare le modifiche una alla volta con strumenti MCP dedicati e rileggere ogni relazione modificata.

## Criteri di completamento

L'audit è completo soltanto quando:

- il numero delle entità e il numero delle relazioni reali sono entrambi noti;
- ogni collegamento proposto usa ID reali, non solo nomi;
- esistenti, mancanti e unidirezionali sono distinti senza inferenze presentate come fatti;
- omonimi e refusi sono esclusi dall'automazione;
- non vengono creati collegamenti pubblico→Solo Admin che possano rivelare contenuti protetti;
- il report finale indica chiaramente cosa può essere applicato automaticamente e cosa richiede decisione editoriale.

## Prompt consigliato per il nuovo task

> Usa il file `docs/audits/eldaria-wiki-links-mcp-handoff.md` come handoff. Verifica in un catalogo MCP pulito che il nuovo strumento di lettura di `wiki_relationships` sia disponibile. Esegui l'audit completo in sola lettura della campagna Eldaria, riconcilia i collegamenti reali con tag, `relationships`, `notable_npcs`, testo e note GM, e produci il delta per ID. Non modificare nulla finché non approvo il delta.

---

## Esito del nuovo task — 17 settembre 2026

Audit MCP autenticato completato in sola lettura. Nessuna entità, tag o relazione è stata modificata.

### Catalogo e inventario live

- strumenti confermati nel catalogo pulito: `search_lore`, `get_entity`, `list_wiki_relationships`;
- 155 entità Wiki, invariato rispetto allo snapshot: 94 NPC, 27 luoghi, 15 lore, 10 mostri, 9 oggetti;
- 20 entità `admin_only:true` incluse esplicitamente;
- 121 righe reali lette da `wiki_relationships`;
- 69 righe Wiki→Wiki e 52 righe Wiki→mappa, mantenute separate;
- 14 righe coinvolgono almeno un endpoint Solo Admin.

### Riconciliazione dei collegamenti

Le 69 righe Wiki→Wiki reali sono tutte unidirezionali: **0 coppie reali reciproche** e **69 relazioni reali unidirezionali**. Questo è un dato della tabella, non una raccomandazione a creare automaticamente 69 inverse.

La scansione conservativa dei nomi esatti e non ambigui in corpo, `summary`, `gm_notes`, `relationships` e `notable_npcs` rileva 209 riferimenti direzionali: 34 coppie semanticamente reciproche e 141 riferimenti semantici in una sola direzione. La differenza rispetto ai 217 riferimenti preliminari deriva dall'esclusione dei match non delimitati e ambigui; non indica una variazione dell'inventario.

Nel sottoinsieme ad alta confidenza basato soltanto su `relationships` e `notable_npcs` risultano 72 riferimenti direzionali: 2 hanno già la direzione sorgente→destinazione reale e 70 non hanno alcuna riga reale in entrambe le direzioni. Nessuno dei 72 ha entrambe le direzioni reali.

### Delta prioritario per ID

Le etichette sotto sono proposte editoriali. `—` significa che non esiste una riga reale in quella direzione.

| Sorgente (ID) | Destinazione (ID) | Reale S→D | Reale D→S | Etichetta proposta S→D / D→S | Confidenza | Visibilità |
| --- | --- | --- | --- | --- | --- | --- |
| Il Boccale Scheggiato (`b525717f-37ca-471c-a379-035b98492944`) | Marta Bracca (`a2ed010f-8cff-4afe-bdcd-c0073e24e9ad`) | — | — | `gestita da` / `gestisce` | alta | Solo Admin↔Solo Admin |
| Il Boccale Scheggiato (`b525717f-37ca-471c-a379-035b98492944`) | Odo Padellaccio (`1f47073f-67cc-45c8-80d1-460a4d94e344`) | — | — | `cucina di` / `cuoco presso` | alta | Solo Admin↔Solo Admin |
| Il Boccale Scheggiato (`b525717f-37ca-471c-a379-035b98492944`) | Nilo Duepassi (`23783058-9119-4d7b-82f3-162cab98e122`) | — | — | `servizio di` / `lavora presso` | alta | Solo Admin↔Solo Admin |
| La Nona Stella (`59c6f937-98e0-4649-81da-bd819f52a343`) | Lidia Fiordalba (`c9d6d748-0cbc-4a07-89e7-f41cdd6985de`) | — | — | `servizio coordinato da` / `coordina il servizio di` | alta | Solo Admin↔Solo Admin |
| La Nona Stella (`59c6f937-98e0-4649-81da-bd819f52a343`) | Beren Vaur (`79bafef7-48d9-44ec-89f5-e09a95a6e183`) | — | — | `cucina diretta da` / `dirige la cucina di` | alta | Solo Admin↔Solo Admin |
| Locanda delle Tre Lanterne (`6735f94c-0c72-473c-b5a8-6d593d3ddf91`) | Timo Bellacorsa (`43adf349-bc59-4434-8990-d87d3f92abca`) | — | — | `servizio di` / `lavora presso` | alta | Solo Admin↔Solo Admin |
| Locanda delle Tre Lanterne (`6735f94c-0c72-473c-b5a8-6d593d3ddf91`) | Ilario Venn (`fd9b77aa-e06d-4ebe-b029-51184572915a`) | — | — | `gestita da` / `gestisce` | alta | Solo Admin↔Solo Admin |
| Locanda delle Tre Lanterne (`6735f94c-0c72-473c-b5a8-6d593d3ddf91`) | Sera Morn (`c311a7f1-dc08-41bb-8441-550534b40b75`) | — | — | `cucina di` / `cuoca presso` | alta | Solo Admin↔Solo Admin |
| Sede di Portico del Sole Infranto (`4f8d7717-c078-449b-8e65-f0cfb1dfbdc2`) | Gilda del Sole Infranto (`264ff937-64c7-420b-ba7e-5f7f2b05bc38`) | — | — | `sede di` / `ha sede a` | alta | Solo Admin↔Solo Admin |
| Sede di Portico del Sole Infranto (`4f8d7717-c078-449b-8e65-f0cfb1dfbdc2`) | Orven Talassar (`cf7b0bd2-2a57-403a-a1d0-1b0f75bb571b`) | — | — | `utilizzata da` / `opera presso` | alta | Solo Admin↔Solo Admin |
| Sede di Portico del Sole Infranto (`4f8d7717-c078-449b-8e65-f0cfb1dfbdc2`) | Portico (`68507fad-8b2f-4402-a098-c2cb48247620`) | `Menzionato nel testo` | — | `si trova a` / nessuna inversa automatica | alta | Solo Admin→pubblico; non creare pubblico→Solo Admin |
| Archivio delle Successioni (`a638941d-26e9-45a9-a984-5bd05b96395e`) | Lysandra Quarto (`30b43a0f-5b33-4705-9562-30a0a41c9e4c`) | — | — | `PNG rilevante` / `opera presso` | alta | pubblico↔pubblico |
| Bacino Settentrionale di Borgonero (`3b65bbed-4bde-4da4-adc8-4b50098f5f96`) | Dargo Chiododuro (`98c28da8-2d8b-4499-8e35-6a50c8e7f5dd`) | — | — | `PNG rilevante` / `opera presso` | alta | pubblico↔pubblico |
| Condotti Termali Inferiori (`e4dd66e1-5be3-4ea0-8d13-6debfe44f92d`) | Bruna Ramechiaro (`bfca58b7-fa45-400a-9e0f-056b86967930`) | — | — | `PNG rilevante` / `opera presso` | alta | pubblico↔pubblico |
| Magazzino d’Isolamento del Varco (`d9aea8c2-de11-497c-b4e4-35e93791a788`) | Tiberio Nodofermo (`7f91730d-8752-4313-b1bf-d7dd4223bfca`) | — | — | `PNG rilevante` / `opera presso` | alta | pubblico↔pubblico |
| Vecchia Torre di Segnalazione (`d4717c81-8b3e-4a43-8132-d9d705f6a87f`) | Nerea Ventolungo (`da918af4-39f1-4715-9d1a-a5e4e5d21865`) | — | — | `PNG rilevante` / `opera presso` | alta | pubblico↔pubblico |
| Dan (`68069e71-63aa-4f1a-9b3b-f3ab497b4c11`) | Patrizio il Locandiere (`020b690e-efdf-4e52-9874-2287dfee8192`) | `Riferimento canonico: Patrizio il Locandiere` | — | `figlio di` / `padre di` | alta | pubblico↔pubblico |
| Timo Bellacorsa (`43adf349-bc59-4434-8990-d87d3f92abca`) | Sera Morn (`c311a7f1-dc08-41bb-8441-550534b40b75`) | — | — | `collabora con` / `collabora con` | alta | Solo Admin↔Solo Admin |
| Il Gazzettino di Eldaria (`1f4d4ada-79b6-4807-85eb-bbb21eb6a13f`) | Portico (`68507fad-8b2f-4402-a098-c2cb48247620`) | — | — | `ha sede a` / nessuna inversa automatica | alta | Solo Admin→pubblico; non creare pubblico→Solo Admin |
| Tessa Valeriana (`6f833b83-eca5-4b09-965d-7274a99385fc`) | Portico (`68507fad-8b2f-4402-a098-c2cb48247620`) | — | — | `fornitrice autorizzata del mercato di` / `ha come fornitrice` | alta | pubblico↔pubblico |

### Audit dei tag

- 37 entità hanno tag strutturati;
- 165 assegnazioni, 102 tag normalizzati distinti;
- unica collisione per sola maiuscola: `Portico` / `portico`; il valore minuscolo è sulla Sede di Portico del Sole Infranto (`4f8d7717-c078-449b-8e65-f0cfb1dfbdc2`);
- 28 assegnazioni di tag corrispondono esattamente al nome normalizzato di un'entità. Sono candidati semantici, non relazioni da creare automaticamente;
- `Mercato di Portco`, `Pinco/Pinko`, `Akmenos Torgul/Turgul` e `Rianvadriel/Riavandriel` restano esclusi dall'automazione in attesa di decisione canonica;
- le due entità `Bandito` restano ambigue. Esiste inoltre una riga reale Bandito→Bandito fra i due ID (`77f298a2-8c47-4a53-a90c-97a3da503abd` → `2a41b364-49b2-40fb-811f-de0262423160`), che richiede revisione umana prima di qualunque intervento.

### Applicabilità

- **Applicabile dopo approvazione editoriale:** le coppie del delta prioritario che restano nello stesso livello di visibilità e hanno una relazione esplicita.
- **Non applicare automaticamente:** inverse verso entità Solo Admin, le 69 inverse delle relazioni reali, i 52 collegamenti verso mappe, gli hub geografici (soprattutto Portico), i tag che coincidono con entità, omonimi e varianti ortografiche.
- Il catalogo attuale espone la lettura delle relazioni ma non uno strumento MCP dedicato alla loro creazione. Qualsiasi applicazione futura deve usare un'operazione MCP supportata, una modifica alla volta, seguita da `list_wiki_relationships` come rilettura; non usare accesso diretto al database.
