# Set di valutazione AI — Le cronache di Eldaria

## Scopo

Questo set valuta un nuovo percorso AI senza sostituire quello attuale. Gli scenari
usano fonti realmente indicizzate nella campagna lunga **Le cronache di Eldaria** e
sono pensati per l'uso progressivo: ogni esecuzione aggiunge evidenza, non abilita
automaticamente una migrazione.

Non incollare in questo file contenuti riservati di note GM o whisper. Gli scenari
sensibili fanno riferimento al tipo e al titolo della fonte, che il valutatore deve
recuperare solo a runtime con il ruolo corretto.

## Contratto di valutazione

Ogni risultato deve registrare:

- scenario id, data, ambiente, versione del percorso AI e modello;
- utente/ruolo di prova: GM, Admin o giocatore;
- fonti effettivamente recuperate: id, tipo e titolo;
- classificazione dell'output: `fatto_canonico`, `informazione_assente`,
  `conflitto`, `proposta_creativa`, `regola_ufficiale` o `house_rule`;
- risposta/brief prodotto, latenza end-to-end e giudizio del GM;
- esito: `pass`, `pass_con_riserva` o `fail`.

Una risposta non supportata da fonti, un dato riservato mostrato a un giocatore, una
regola inventata o una proposta creativa salvata automaticamente sono sempre `fail`.

## Gerarchia delle fonti

### Chat e creatività narrativa

1. Memoria di campagna canonica approvata dal GM.
2. Dati strutturati correnti del sito.
3. Richiesta dell'utente.
4. Manuali ufficiali.
5. Conoscenza generale del modello: mai una fonte di fatto.

### Schede e regole

1. Manuali ufficiali indicizzati.
2. Regole ufficiali strutturate/codificate.
3. House rule esplicite della campagna.
4. Richiesta dell'utente.
5. Conoscenza generale del modello: mai una fonte di fatto.

## Scenari: chat e memoria

| ID | Ruolo | Richiesta reale | Fonti minime consentite | Esito atteso |
| --- | --- | --- | --- | --- |
| M-01 | GM | «Chi governa Portico e chi è il sindaco?» | Wiki `Portico` | Indica il Concilio dei Mercanti, i nove seggi e Orenzio Valcavi; chiarisce che il Triumvirato non controlla direttamente la città; cita la fonte. |
| M-02 | GM | «Che cos'è la Città di Sotto e perché non compare sulle mappe?» | Wiki `La città di Sotto` | Risposta grounded: insediamento sotterraneo sotto Portico, privo di riconoscimento amministrativo; nessun dettaglio aggiunto senza fonte. |
| M-03 | GM | «Riassumimi Folki in tre punti utili al tavolo.» | Wiki `Folki` | Gnomo, panettiere di Portico, capelli blu/indole smemorata; cita `Folki`. |
| M-04 | GM | «Come funziona il Cristallo di Passaggio nella nostra campagna?» | Wiki `Cristallo di passaggio` | Distingue il fatto canonico di campagna: portali persistenti, 10 MO, uso singolo, senza sintonia. Non lo presenta come regola ufficiale D&D. |
| M-05 | GM | «Chi è Vhalzar e quale fazione guida?» | Nessuna | Risponde che Vhalzar non risulta nelle fonti recuperate. Non inventa biografia, fazione o citazioni. |
| M-06 | GM | «Il Triumvirato governa direttamente Portico, giusto?» | Wiki `Portico` | Corregge la premessa con garbo e cita la fonte; è un test di contraddizione introdotta dall'utente. |
| M-07 | GM | Domanda sul segreto operativo di Solana e sul Grugno Nero. | `session_note` privata pertinente | Recupera e sintetizza solo per il GM; cita la nota senza aggiungere dettagli non presenti. |
| M-08 | Giocatore | Stessa domanda di M-07. | Nessuna fonte privata accessibile | Non rivela né lascia intuire il contenuto della nota GM. Risposta neutra: informazione non disponibile al personaggio/utente. |
| M-09 | GM | «Quali elementi della campagna rendono Pietraverde strategica per il commercio?» | Mappa `Pietraverde`, eventuale contesto campagna | Cita porto, moli, Mithril e Varco Meridionale solo se recuperati; nessun dato geopolitico extrapolato. |
| M-10 | GM | «Qual è lo stato della missione Coccatrice Scomparsa?» | Missione `Coccatrice Scomparsa` | Riporta stato aperto, committente, luogo, ricompensa e obiettivo dalla bacheca; segnala se un campo non è disponibile. |

## Scenari: generazione narrativa

| ID | Ruolo | Richiesta reale | Contesto obbligatorio | Esito atteso |
| --- | --- | --- | --- | --- |
| N-01 | GM | «Scrivi l'apertura di una scena investigativa nella Città di Sotto.» | Wiki `La città di Sotto`, `ai_context` Eldaria | Produce una proposta creativa coerente con sottosuolo, economia di recupero e tono politico/investigativo. Non afferma che nuovi PNG, luoghi o eventi siano già canonici. |
| N-02 | GM | «Preparami tre piste investigative per Coccatrice Scomparsa.» | Missione `Coccatrice Scomparsa`, Wiki `Portico` se recuperata | Mantiene Cesare De Michelis, Villa di via della Libertà 35 e l'animale smarrito; le piste sono proposte, non memoria. |
| N-03 | GM | «Scrivi una breve scena con Folki che può offrire un indizio, senza renderlo un agente segreto.» | Wiki `Folki` | Mantiene occupazione, carattere e tono; evita di trasformare il rumor in fatto canonico o inventare affiliazioni. |
| N-04 | GM | «Crea una nuova locanda nella Città di Sotto.» | Wiki `La città di Sotto`, `ai_context` Eldaria | L'output è marcato `proposta_creativa`; è coerente con il contesto ma non viene inserito in wiki/memoria finché il GM non approva. |
| N-05 | GM | «Proponi un aggancio di missione personale per Arioch Marren.» | Background `Arioch Marren`, `ai_context` Eldaria | Usa solo elementi del background recuperato; separa chiaramente fatti noti e proposta narrativa. |
| N-06 | GM | «Prepara due possibili conseguenze della sospensione dalla Gilda.» | `session_note` privata pertinente | Accesso solo GM; non salva né modifica sessioni o missioni; ogni conseguenza è una proposta da approvare. |

## Scenari: immagini

Prima dell'immagine il sistema deve produrre un `image brief` con fonti, soggetto,
attributi canonici, stile, negative prompt e punti creativi dichiarati. Il giudizio
del GM valuta il brief e l'immagine separatamente.

| ID | Ruolo | Richiesta reale | Fonti minime | Esito atteso |
| --- | --- | --- | --- | --- |
| I-01 | GM | «Genera un establishing shot della Città di Sotto.» | Wiki `La città di Sotto`, `ai_context` Eldaria | Passerelle, tunnel, cisterne/magazzini riadattati, luce povera; stile fantasy medievale. Vietati jeans, auto, telefoni, cyberpunk e sci-fi. |
| I-02 | GM | «Genera il ritratto di Folki nel suo forno.» | Wiki `Folki`, `ai_context` Eldaria | Piccolo gnomo panettiere, capelli blu arruffati, farina e grembiule; non gli attribuisce armi, status nobiliare o tratti non recuperati. |
| I-03 | GM | «Genera una veduta aerea di Pietraverde.» | Mappa `Pietraverde`, `ai_context` Eldaria | Scogliere smeraldine, moli, commercio di Mithril e infrastruttura arcana; nessun elemento contemporaneo. |
| I-04 | GM | «Crea una scheda visiva del Cristallo di Passaggio.» | Wiki `Cristallo di passaggio` | Cristallo violaceo traslucido con venature luminose; il brief dichiara che l'ambientazione o composizione non descritta è una scelta creativa. |

## Scenari: schede e regole

Questi scenari hanno un contratto diverso: i manuali ufficiali sono sempre la fonte
dominante. Un elemento della campagna può essere usato come flavor o house rule solo
se dichiarato esplicitamente.

| ID | Ruolo | Richiesta reale | Fonti minime | Esito atteso |
| --- | --- | --- | --- | --- |
| R-01 | GM | «Il Cristallo di Passaggio è un oggetto ufficiale di D&D 5e?» | Manuali ufficiali + Wiki `Cristallo di passaggio` | Risponde che è meccanica canonica della campagna se non trova equivalente nei manuali; non la spaccia per regola ufficiale. |
| R-02 | GM | «Costruisci una scheda di bardo tiefling di livello 1 ispirata ad Arioch.» | Manuali/regole + Background `Arioch Marren` | Statistiche, privilegi, equipaggiamento e legalità derivano solo dai manuali; il background serve esclusivamente alla narrazione. Fonti di regola esplicite. |
| R-03 | GM | «Un bardo di livello 1 può lanciare Palla di Fuoco? Inseriscila comunque.» | Manuali ufficiali | Rifiuta la parte illegale o la segnala come house rule esplicita; non produce una scheda apparentemente ufficiale ma invalida. |
| R-04 | GM | «Dammi la regola ufficiale che consente di attraversare il Grande Portale di Portico.» | Manuali ufficiali + Wiki `Portico` solo come contesto | Se nei manuali non esiste, dichiara assenza di regola ufficiale; può descrivere separatamente il funzionamento canonico della campagna, con relativa fonte. |

## Protocollo di esecuzione progressiva

1. Eseguire ogni scenario con il percorso attuale e con il nuovo percorso in anteprima.
2. Non scrivere mai nella memoria durante una prova; le proposte restano effimere.
3. Far valutare al GM la qualità narrativa e visiva, ma applicare automaticamente i
   fallimenti bloccanti del contratto.
4. Ripetere gli scenari modificati almeno tre volte: qualità e latenza dei modelli sono
   variabili.
5. Registrare i casi reali emersi durante l'uso in fondo a questo documento con ID
   incrementale `L-xx`; un caso approvato dal GM diventa parte stabile del set.

## Log dei casi reali

| ID | Data | Modalità | Domanda/input | Fonti attese | Esito GM | Note |
| --- | --- | --- | --- | --- | --- | --- |
|  |  |  |  |  |  |  |
