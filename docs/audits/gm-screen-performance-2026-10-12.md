# GM Screen 2.0 — audit prestazioni del 12 ottobre 2026

## Conclusione

Il codice contiene lavoro duplicato eliminabile senza togliere funzioni. Questa patch alleggerisce avvio e attività dei tracker in background. Non dimostra ancora che ogni blocco segnalato su un PC reale sia risolto: manca una misurazione della pagina autenticata completa con dati rappresentativi.

## Evidenze e correzioni

| Riscontro nel codice | Effetto | Correzione locale |
| --- | --- | --- |
| I layout Long e Legacy montano plancia tattica, Griglia 1 e Griglia 2 contemporaneamente; `hidden` modifica solo la visualizzazione. I preset delle griglie includono il tracker. | Fino a tre tracker, timer, salvataggi e pubblicazioni verso la proiezione, oltre alle richieste iniziali dei pannelli nascosti. | Importazione separata e primo montaggio alla visita. Le viste visitate restano montate per conservare ricerche e bozze. |
| Ogni tracker usa un countdown e pubblica verso lo stesso canale della campagna. | I tracker nascosti continuano a lavorare e possono sovrascrivere la proiezione con copie non aggiornate. | Solo il tracker della vista attiva segue i tick, sincronizza il roster e salva/pubblica. Al ritorno, le copie Legacy rileggono il salvataggio condiviso, comprese le cancellazioni. |
| `applyGridLayout` ricrea array e tutti gli elementi anche se la geometria ricevuta è identica. | Rendering e salvataggi evitabili; rischio di ricircolo dei callback della griglia. Non è stata dimostrata una sequenza infinita sulla pagina reale. | Restituisce lo stesso array quando nulla cambia; conserva i pannelli non spostati. |
| La scheda del combattente dipende dall'intero oggetto e da una callback ricreata dal genitore; modifica direttamente `entry.contentBody`. Le risposte asincrone non sono legate al combattente ancora visibile. | Riesecuzioni inutili e possibilità che una risposta tardiva mostri dati del mostro precedente. | Callback stabile, dipendenze specifiche, aggiornamenti immutabili e risposta ignorata dopo cambio combattente. |
| La proiezione mostra i secondi pubblicati dai tracker; il timer mantiene una cache non invalidata dagli eventi storage. | Sospendendo i tracker nascosti il display della proiezione si fermerebbe; senza BroadcastChannel le finestre possono restare fuori sincronia. | La proiezione legge il countdown basato sulla scadenza. Invalidazione della cache su storage e al ritorno nella vista; conservazione dello zero dopo una pausa. |

## Funzioni conservate

Plancia tattica, due griglie indipendenti, configurazione/preset, combattimento, schede mostri, regia, chiusura sessione e strumenti restano presenti. Non si smontano le viste già visitate. Audio, Spotify e telecomando mantengono il ciclo di vita esistente: non è stato rimosso il player persistente.

## Verifiche

- Browser Chromium con componenti React reali `GmScreenView` e `useTurnTimer`, build di produzione del banco di prova e rallentamento CPU 6×: avvio con 1 vista montata invece di 3. Dopo aver visitato tutte le viste, i due pannelli nascosti non registrano rendering durante il countdown. Conservazione della bozza e countdown al ritorno verificati.
- Confronto del banco di prova su 3,5 secondi: configurazione precedente 6 rendering per ciascuno dei tre pannelli; configurazione corretta 8 sul solo pannello attivo, zero sugli altri. È un riscontro sull'eliminazione del lavoro nascosto, non una percentuale di velocizzazione dell'intero prodotto.
- Due finestre del browser: sincronizzazione via storage senza BroadcastChannel e pausa a zero verificate.
- Tracker `InitiativeTracker` reale in browser, azioni server sostituite nel solo banco di prova: sei cambi di vista con variazioni PF conservate, sia con stato controllato (Long) sia locale (Legacy). Reset del roster condiviso non fa riapparire combattenti nelle viste già visitate. Nessun errore JavaScript rilevato.
- Quattro regressioni automatiche: geometria stabile, drag/resize con dati conservati, countdown senza vista montata, rilettura della pausa a zero.
- Build di produzione Next.js completata (`next build --no-lint`); ESLint sui file modificati e controllo whitespace superati.
- Il controllo TypeScript globale segnala errori nelle fixture sheet-generator/Command Center e una dipendenza PGlite mancante; nessun errore nei file modificati. I tre test preesistenti del tracker/torneo tentati si fermano all'importazione per `React.cache is not a function`, prima degli assert.

## Limiti e verifica conclusiva

`tests/e2e/.auth` è vuota. Non sono stati eseguiti login né mutazioni di campagne reali. I banchi di prova non misurano richieste server, immagini, memoria complessiva, FOW o riproduzione audio della pagina completa. Prima di dichiarare risolto il blocco, verificare una campagna autenticata con combattimento numeroso, tre viste visitate, audio/telecomando e proiezione aperti, sul PC lento o con CPU rallentata. Le modifiche sono locali e non pubblicate.
