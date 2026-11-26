# Sessione live tra GM Screen e scheda PG

La prima versione copre **campagne lunghe, Quest, One Shot e Torneo**. Il GM avvia la condivisione dal GM Screen nella sessione o nella partita che sta conducendo. Durante il live, il GM che conduce la sessione è l’unico a modificare le risorse condivise, dal GM Screen. Ogni giocatore vede in tempo reale i dati del proprio PG nella scheda su iOS e Android.

## Flusso al tavolo

1. **Avvio.** Il GM attiva la modalità live per i PG partecipanti, collegati per ID. Il GM Screen carica PF correnti e temporanei, tiri salvezza contro morte e slot spesi secondo il flusso del formato. La bozza conserva iniziativa, turni e stato di regia. Quando il GM riapre la schermata, rilegge i valori condivisi confermati per la sessione o la partita.
2. **Durante la sessione.** Dal GM Screen si aggiornano PF correnti e temporanei, tiri salvezza contro morte, slot spesi e condizioni. Il GM decide quali condizioni rendere visibili. Sull’app la scheda mostra «Sessione live · Gestita dal GM» e presenta queste risorse in sola lettura. Inventario e appunti restano utilizzabili con i normali permessi. Mostri, promemoria e informazioni riservate restano nella regia.
3. **Riconnessione.** Il telefono conserva l’ultimo stato ricevuto, segnala che potrebbe essere superato e rilegge i dati salvati quando torna online o in primo piano. Il GM Screen recupera anche l’eventuale comando in attesa di conferma.
4. **Fine.** Il GM termina la condivisione e la scheda torna a seguire i permessi e le assegnazioni del formato. I valori confermati sono già salvati nel loro contesto. Le condizioni attive seguono le regole di durata del tracker e il GM decide quali mantenere alla ripresa.

## Avvio e chiusura per formato

- **Campagne lunghe.** Il GM Screen parte dalle risorse correnti della scheda. I valori confermati vengono salvati sulla scheda e restano disponibili alla ripresa.
- **Quest e One Shot.** Il live usa il PG assegnato nella sessione. La scheda mantiene il modello generato e i permessi previsti dal formato. Quando la chiusura di una One Shot rimuove le assegnazioni, termina anche l’accesso del giocatore allo stato live del PG. Un nuovo tavolo segue le regole di inizializzazione già previste dal suo flusso.
- **Torneo.** Il live segue la partita e il suo roster. Lo stato condiviso è quello del combattimento della partita, con le sue regole di inizializzazione e ripristino. Partite contemporanee hanno aggiornamenti e permessi distinti.

## Salvataggio e aggiornamento

- **Stato salvato.** Si riusano campi e regole esistenti per rappresentare PF, tiri salvezza contro morte e slot. Durante il live, GM Screen e scheda mostrano gli stessi valori confermati per la sessione o partita del PG. Dal tracker si condividono soltanto le condizioni rese visibili dal GM. Supabase Realtime avvisa i client autorizzati dopo il salvataggio e ciascun client rilegge i dati a cui ha accesso.
- **Permessi verificati al salvataggio.** Durante il live, il server riserva al GM che conduce la sessione le scritture sulle risorse condivise attraverso il percorso di salvataggio del GM Screen. Il controllo copre gli editor web e le versioni precedenti dell’app. Vale anche per le operazioni indirette come il riposo lungo e il riposo breve quando recupera slot del Patto del Warlock o, con un Dado Vita, modifica i PF.
- **Un effetto per comando.** Il GM Screen conserva nel browser il comando in attesa con un ID univoco. Il server salva ID ed effetto nella stessa transazione, con un vincolo di unicità sull’ID. Se la risposta si perde dopo il salvataggio, «Riprova» invia lo stesso ID e il server conferma l’esito già registrato. Un nuovo comando intenzionale riceve un nuovo ID.

## Prima prova e criteri di accettazione

Ripetere la prova di combattimento nei quattro formati con il GM sul sito e due giocatori, uno su iOS e uno su Android. Verificare anche il comportamento alla chiusura previsto dal formato.

- Prima dell’avvio, verificare che lo stesso PG mostri gli stessi PF correnti e temporanei, tiri salvezza contro morte e slot spesi sul sito e sulle app.
- Durante il live, verificare che danni, cure, tiri salvezza contro morte, slot e condizioni visibili si aggiornino senza ricarica manuale. Ogni giocatore vede soltanto i dati autorizzati del proprio PG.
- Tentare scritture da una scheda web già aperta e da un client precedente, inclusi i riposi che cambiano risorse condivise. Dopo la fine del live, verificare il ripristino dei permessi ordinari.
- Interrompere la connessione dopo il salvataggio di un danno ma prima della risposta. Riaprire il GM Screen e ritentare. I PF scendono una sola volta e la bozza non ripristina valori precedenti. Verificare anche che il telefono recuperi lo stato aggiornato dopo la riconnessione.
- In One Shot, verificare che la chiusura rimuova l’accesso dopo la revoca dell’assegnazione. In Torneo, provare due partite contemporanee e verificare che ogni scheda mostri gli aggiornamenti della propria partita e che l’avvio di una nuova partita rispetti le sue regole di ripristino.
- Verificare quanto lavoro aggiunge al GM registrare il consumo degli slot e i tiri salvezza contro morte durante il combattimento.

La prima versione include il consumo degli slot. Il lancio completo degli incantesimi e gli automatismi di concentrazione restano sviluppi successivi.

Base di implementazione: `b49ffe19`. Il commit mantiene il contratto di salvataggio delle risorse usato da sito e app. La prova con i dispositivi è il criterio di accettazione della nuova modalità.
