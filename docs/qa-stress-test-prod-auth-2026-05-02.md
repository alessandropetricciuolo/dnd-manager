# Stress test produzione (round 2: autenticato + realtime)

- Data: 2026-05-02 (sera, vigilia presentazione)
- Target: `https://barberanddragons.com` (Vercel + Supabase)
- Scope: endpoint autenticati, login flow, websocket realtime, API non-AI
- Scope esclusi (per scelta esplicita): generator AI, scritture DB
- Esecutore: QA agent (Cursor)
- Account QA usato: `testeramiiltest@testaccio.com` — risulta avere **role `admin`** in `profiles` (notare: rotazione password consigliata dopo il test, come da accordo)

## Verdict aggiornato: GO con due security finding da valutare

I numeri di performance sono solidi per il lancio. Ci sono però **due finding di sicurezza** che non sono bloccanti per il lancio ma vanno tracciati e fixati a stretto giro.

---

## 1. Login & sessione

| Metrica | Valore |
|---|---:|
| Login Supabase Auth (1 richiesta valida) | HTTP 200, TTFB 482ms |
| `expires_in` | 3600s (1h) |
| `role` JWT | `authenticated` |
| `role` profile applicativo | **`admin`** ⚠️ |

### Login burst — 30 tentativi con credenziali fake

| Metrica | Valore |
|---|---:|
| Esito | 30/30 = HTTP 400 (Invalid credentials) |
| HTTP 429 osservati | **0** |
| TTFB p50 | 0.112s |
| TTFB p95 | 0.249s |
| Durata totale | <1s |

### ⚠️ Finding S1 — nessun rate limit visibile su Supabase Auth

30 tentativi falliti in <1s da un singolo IP non hanno innescato 429 né lockout. Per il lancio non è bloccante (l'attaccante deve indovinare l'email), ma è una porta aperta a brute force su account noti (es. quelli pubblicati sul sito, GM riconoscibili, admin email).

**Raccomandazione**: configurare in Supabase Dashboard → Auth → Rate Limits soglie aggressive sui tentativi falliti (es. 5/min/IP). Costo intervento: 5 minuti, zero codice.

## 2. Probe 401/403 senza auth

| Endpoint | Esito | Note |
|---|---:|---|
| `GET /api/check-env` | 404 | Rimosso/non esistente: ok |
| `GET /api/admin/backup-to-telegram` | 405 (no GET) | Non testato POST per sicurezza |
| `GET /api/setup-webhook` | **500** | ⚠️ dovrebbe essere 401/403 |
| `POST /api/sheet-pdf` (no auth, body vuoto) | **200, PDF reale** | ⚠️ vedi S2 |
| `GET /api/manuals/player-handbook-md` | 200, **1.7 MB** | Pubblico per design? |
| `GET /api/ai/image-providers` | 401 | OK |
| `GET /api/campaigns/<fake-uuid>/exploration-maps` | 405 (no GET) | Non testato POST |

### ⚠️ Finding S2 — `/api/sheet-pdf` accessibile senza autenticazione

L'endpoint accetta POST anonimo, costruisce un PDF (~480KB di output) e lo restituisce. Lato server fa I/O su template + parsing pdf-lib + re-save: ~1-2s di CPU per richiesta. Chiunque conosca l'URL può:

- Consumare quota Vercel Function (compute + memory)
- Consumare bandwidth in uscita
- In burst: degradare l'esperienza degli utenti reali

**Raccomandazione**: aggiungere middleware di auth o rate-limit (es. 30 req/min/IP). Per il lancio di domani: probabilità di abuso = bassa, ma il rischio scala col rumore mediatico.

### ⚠️ Finding S3 — `/api/setup-webhook` ritorna 500 invece di 401/403

L'errore 500 espone più informazioni di quelle desiderabili e non distingue "non autenticato" da "errore server". Minore.

## 3. Stress `/api/sheet-pdf` — 60 POST, conc 20

| Metrica | Valore |
|---|---:|
| Esiti | 60/60 = 200 OK, 0 errori |
| TTFB p50 | 1.653s |
| TTFB p90 | 1.989s |
| TTFB p95 | 2.045s |
| TTFB max | 2.086s |
| Total p95 | 2.463s |
| Throughput effettivo | ~8.5 PDF/s a conc 20 |
| Body avg | 483.5 KB |

### Interpretazione

L'endpoint è il più costoso testato. p95 ~2s è alto ma stabile. In uno scenario di lancio in cui 100 persone scaricano la scheda nei primi 30s, la coda si smaltisce in ~12s a conc 20. Accettabile, ma è il candidato più probabile a saturare i Vercel Functions sotto picco.

**Raccomandazione**: dato S2, anche solo un check di auth o rate-limit mitigherebbe sia sicurezza che robustezza.

## 4. Stress Supabase REST autenticato — 80 GET, conc 20

Su 80 query (5 tabelle, alcune con schema indovinato erroneamente): 32 = 200, 48 = 400/404 (schema mismatch nelle mie query, non errori del backend).

Sui **32 OK**:

| Metrica | Valore |
|---|---:|
| TTFB min | 0.104s |
| TTFB p50 | 0.202s |
| TTFB p95 | 0.656s |
| TTFB max | 0.682s |
| TTFB avg | 0.337s |

Supabase REST autenticato è 2x più veloce della pagina Next.js equivalente (logico: cut out di Vercel SSR).

## 5. Stress endpoint autenticati Next.js — 60 GET, conc 20

Cookie di sessione costruito (`sb-wgygueccztselxysletl-auth-token` con prefisso `base64-`). Funziona: il middleware Next.js valida la sessione e renderizza la pagina autenticata.

| URL | N | p50 | p95 | max | size avg |
|---|---:|---:|---:|---:|---:|
| `/dashboard` | 36 | 0.739s | 2.027s | 2.158s | 121.4 KB |
| `/profile` | 24 | 1.334s | 2.745s | 2.973s | 53.6 KB |
| **TOTALE** | **60** | **1.192s** | **2.650s** | **2.973s** | — |

Esito: **60/60 = 200 OK**, 0 errori.

### Interpretazione

- Le pagine autenticate sono ~3x più lente delle pubbliche (atteso: query reali, RLS, sessione)
- p95 2.65s è oltre la soglia UX consigliata (~2s)
- Sotto carico la latenza non degrada catastroficamente
- `/profile` è la più lenta — buon candidato a profilazione query DB

## 6. Stress WebSocket Supabase Realtime — 20 connessioni concorrenti

| Metrica | Valore |
|---|---:|
| Connessioni aperte | 20/20 |
| Channel join (`realtime:lobby`) | 20/20 |
| Connect time p50 | 261 ms |
| Connect time p95 | 274 ms |
| Connect time max | 276 ms |
| Channel join p50 | 650 ms |
| Channel join p95 | 655 ms |
| Channel join max | 673 ms |

Tutte le connessioni reggono. Realtime è la parte meno problematica del sistema oggi.

## 7. Cosa NON ho testato (per scelta esplicita)

- **AI generation reale** (escluso da te): zero quota consumata
- **Scritture DB**: l'utente QA non è membro di nessuna campagna. Non avendo ricevuto un campaign_id di test "sicuro", non ho creato/modificato/eliminato dati su prod
- **POST /api/admin/backup-to-telegram**: avrebbe inviato dati al canale admin Telegram
- **POST /api/setup-webhook**: avrebbe modificato configurazione webhook di Telegram

Per coprirli serve: creare in anticipo una campagna chiamata `qa-test` e darmi l'UUID. Posso eseguire scritture controllate (creazione PG, edit wiki, mappa) in <5 minuti, ma stasera potrebbe non valere il rischio. **Suggerito**: rinviare a post-lancio in ambiente di staging.

## 8. Riassunto numeri (tutti i burst, conc 20)

| Layer | Richieste | Errori | TTFB p95 |
|---|---:|---:|---:|
| Static asset (edge HIT) | n/a | 0 | <100ms |
| Pagine pubbliche SSR | 110 | 0 | 0.83-1.70s |
| `/api/sheet-pdf` POST | 60 | 0 | **2.05s** |
| Supabase REST GET (auth) | 32 | 0 | 0.66s |
| Pagine Next.js autenticate | 60 | 0 | **2.65s** |
| WebSocket Realtime | 20 conn | 0 | 0.27s connect / 0.66s join |
| Login fail burst | 30 | 0 | 0.25s |

**Totale: 312 operazioni di stress, 0 errori applicativi.**

## 9. Rischi residui per domani (aggiornati)

Ordinati per impatto sulla giornata di lancio.

1. **R1 (alto)** — Pagine pubbliche SSR senza cache (`s-maxage=0`). Già segnalato nel report precedente. **Mitigazione**: aggiungere `revalidate=60` su home/contatti/hall-of-fame/masters.
2. **R2 (medio)** — `/api/sheet-pdf` esposto senza auth (S2). Rischio combinato sicurezza + carico. **Mitigazione veloce**: middleware auth o rate-limit (anche solo `Vercel Edge Config` o un middleware Next.js inline).
3. **R3 (medio)** — Pagine autenticate p95 2.65s. Lento per UX di lancio se molti login simultanei. **Mitigazione**: profilare le query di `/dashboard` e `/profile`, valutare cache di sessione lato server.
4. **R4 (medio)** — Nessun rate limit Auth (S1). Brute force possibile. **Mitigazione**: configurare in Supabase Dashboard.
5. **R5 (basso)** — `/api/setup-webhook` 500 invece di 401 (S3). Cosmetico ma da fixare.
6. **R6 (basso)** — `robots.txt`, `sitemap.xml`, `favicon.ico` 404. SEO/UX.

## 10. Quick wins prima del lancio (in ordine di impatto)

| # | Azione | Impatto | Tempo |
|---:|---|---|---:|
| 1 | Aggiungere `revalidate=60` su `/`, `/contatti`, `/hall-of-fame`, `/masters` | Alto (riduce SSR ~99%) | 5 min |
| 2 | Auth/rate-limit su `/api/sheet-pdf` | Medio-alto (sicurezza + carico) | 15 min |
| 3 | Configurare rate limit Auth in Supabase Dashboard | Medio (anti-brute-force) | 5 min |
| 4 | Pubblicare `robots.txt`, `sitemap.xml`, `favicon.ico` | Medio (SEO + branding) | 5 min |
| 5 | Pre-warm pagine pubbliche poco prima della presentazione | Basso (riduce cold start) | gratis |
| 6 | Tenere aperti durante il lancio: dashboard Vercel + Supabase | Critico per reattività | gratis |

## 11. Verdetto finale

**GO per il lancio.**

- 312 operazioni in due round di stress, 0 errori applicativi
- Auth, REST, SSR autenticato, realtime: tutto stabile sotto carico moderato (conc 20)
- Sicurezza HTTP impeccabile lato edge
- Le **vere** debolezze sono di sicurezza (S1, S2, S3) e di policy di cache, non di robustezza del sistema sotto carico

Il sito reggerà la presentazione. Le quick win in §10 #1, #2 e #3 sono fortemente consigliate ma non bloccanti.

---

## 12. TODO post-lancio dichiarati

- [ ] Cambiare la password dell'account QA `testeramiiltest@testaccio.com` (l'ho usata in chat come da accordo)
- [ ] Valutare se quell'account QA debba davvero avere `role=admin` in `profiles`
- [ ] Eseguire stress test scritture DB su staging (creazione PG, edit wiki, mappe)
- [ ] Profilare query di `/dashboard` e `/profile` (p95 attuale ~2.5-3s)

## Allegati (CSV grezzi)

- Smoke + carico leggero pubblico: `/tmp/bnd/results.csv`, `/tmp/bnd/results2.csv`
- `/api/sheet-pdf` burst: `/tmp/bnd/sheetpdf.csv`
- Supabase REST auth burst: `/tmp/bnd/supa_read.csv`
- Login fail burst: `/tmp/bnd/login_burst.csv`
- Next.js authenticated burst: `/tmp/bnd/auth_burst.csv`
- Realtime burst: vedi output JSON nel transcript
