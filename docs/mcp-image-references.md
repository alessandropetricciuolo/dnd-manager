# Riferimenti visivi tramite MCP

`read_entity_images(campaign_id, entity_id, admin_only?, offset?, limit?)` restituisce l'immagine principale Wiki e gli allegati MCP PNG/JPEG/WebP della voce. Non esiste una galleria Wiki separata in questo contratto. Gli allegati PDF sono esclusi. L'immagine principale precede gli allegati, ordinati per ID. `limit` vale 1 per default, massimo 3; `next_offset` consente di continuare.

`read_map_image(campaign_id, map_id, admin_only?)` restituisce l'immagine della mappa Atlas.

Entrambi sono strumenti di sola lettura: riutilizzano l'autorizzazione di `get_entity`/`get_map`, compreso il consenso esplicito `admin_only: true`. Nessuna migrazione o nuova credenziale. I file Telegram usano il token di storage già configurato; i link Google Drive vengono normalizzati come nel sito. I download HTTPS controllano gli indirizzi DNS e ogni redirect, fissano l'indirizzo verificato alla connessione TLS e limitano tempo e dimensione. Il limite è 3 MiB per file e complessivamente per risposta; immagini che lo superano richiedono un file più piccolo o una chiamata separata.

Il backend REST restituisce `images`; il server MCP nativo e il bridge trasformano questi dati in blocchi `content` di tipo `image`. Il testo e `structuredContent` contengono soltanto contesto e metadati. `references[].image_index` identifica il blocco immagine nell'array delle immagini (il primo blocco `content` è testo). Un file non leggibile ha `status: unavailable`; se tutti i file selezionati falliscono, la risposta MCP ha `isError: true`. Una voce senza immagini restituisce `total: 0`.

## Uso per generare immagini coerenti

1. Trovare le voci o mappe con `search_lore`/`search_maps` e leggere il contesto.
2. Chiamare lo strumento immagine per ciascun riferimento pertinente e verificare i blocchi visivi.
3. Passare le immagini ricevute anche al generatore come riferimenti, descrivendo quali tratti mantenere. Per il generatore di questa chat, usare le immagini recenti della conversazione; se si sono salvate su disco, usare i percorsi dei file.
4. Verificare il risultato prima dell'eventuale caricamento nel sito.

La lettura MCP non genera né salva automaticamente immagini. Il flusso del sito `wiki-image-chat` passa già un riferimento visivo al generatore tramite `resolveImageReferenceForOpenRouter` e `generateSiteImageRefinement`; questa estensione rende i riferimenti disponibili anche al modello della chat.

## Attivazione e verifica

Pubblicare la modifica del sito; aggiornare anche il bridge se utilizzato. Aggiornare il catalogo del connettore (può essere necessaria una nuova chat/riconnessione). Confermare con una chiamata autenticata che la chat riceva un'immagine reale e quindi provare una generazione con quel riferimento. I test locali di trasporto non confermano questo ultimo passaggio sul connettore in produzione.

Verifiche locali: `npx tsx --test src/lib/mcp-api/__tests__/*.test.ts` e `node --test integrations/mcp/test.mjs`.
