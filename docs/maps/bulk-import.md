# Importazione massiva mappe

Nella scheda Mappe, GM e Admin trovano **Importa mappe** accanto a **Carica mappa**.
Caricare un file JSON o incollare un array (1–100 mappe, massimo 1 MB nel pannello).
L'anteprima verifica il formato e i riferimenti prima del salvataggio.

```json
[
  { "key": "mondo", "name": "Eldaria", "map_type": "world", "image_url": "https://example.com/eldaria.jpg" },
  { "key": "almaria", "name": "Almaria", "map_type": "continent", "parent_key": "mondo", "image_url": "https://example.com/almaria.jpg", "description": "Il continente occidentale", "visibility": "secret" }
]
```

Sostituire gli URL con immagini HTTPS accessibili. I file immagine locali non sono caricati da questo importatore.
`key`, `name`, `map_type` e `image_url` sono obbligatori. La visibilità predefinita è `secret`; è ammesso anche `public`.
Tipi: `world`, `continent`, `city`, `dungeon`, `district`, `building`.

Per collegarsi a una mappa esistente usare `parent_map_id` al posto di `parent_key`;
gli ID sono elencati nel pannello Formato ed esempio. Non usare entrambi.
Nelle campagne lunghe è ammesso un solo Mondo, i Continenti richiedono un Mondo e le Città un Continente.
Le altre campagne non ammettono genitori. L'ordine nel file è libero.

Il server ricontrolla autenticazione, autorizzazione sulla campagna, formato e gerarchia.
Le righe vengono inserite con una sola operazione: un errore del database annulla l'intero lotto.
L'import crea nuove mappe e non aggiorna quelle esistenti. Non reinviare lo stesso file dopo un successo.
In caso di perdita della risposta, controllare l'Atlante prima di un nuovo tentativo.

Verifica locale: `npx tsx --test src/lib/maps/__tests__/bulk-import.test.ts`.
