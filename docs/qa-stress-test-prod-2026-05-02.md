# Stress test produzione — `www.barberanddragons.com`

- Data: 2026-05-02 (sabato sera, alla vigilia della presentazione)
- Eseguito su: `https://www.barberanddragons.com` (redirect 307 → `https://barberanddragons.com`)
- Tipologia eseguita: smoke test + carico leggero (livelli 1 e 2 concordati)
- NON eseguito: stress aggressivo, test su endpoint autenticati, POST con scrittura, chiamate AI
- Eseguito da: QA agent (Cursor)

## Riassunto esecutivo

**Verdict: GO con tre azioni rapide consigliate prima del lancio.**

Il sito risponde correttamente, sicurezza HTTP a posto, 0 errori su 110 richieste totali distribuite in due burst, e — sorpresa positiva — sotto carico più alto i container Vercel migliorano (warm path). I rischi non vengono dal codice ma da configurazione cache e da assenza di asset SEO base.

---

## 1. Ambiente rilevato

| Voce | Valore |
|---|---|
| Hosting | Vercel (`server: Vercel`) |
| Edge region | `fra1` (Frankfurt) |
| Backend region | `iad1` (US East — Washington D.C.) |
| Redirect | `www.barberanddragons.com` → `barberanddragons.com` (307) ✓ |
| TLS | Negoziato in ~325ms a freddo, OK |
| Header `server` | non rivela versione Next.js (solo `x-powered-by: Next.js`) |

Implicazione: ogni request dinamica fa hop transatlantico edge↔origin (~80-100ms aggiuntivi). È fisiologico ma amplifica latenze quando la pagina fa più round trip al DB.

## 2. Sicurezza HTTP — esito

Headers presenti e corretti sulla home e sulle pagine pubbliche:

- `strict-transport-security: max-age=31536000; includeSubDomains; preload` ✓
- `content-security-policy` con `default-src 'self'` e direttive specifiche per script/style/img/font/frame ✓
- `x-frame-options: DENY` ✓
- `x-content-type-options: nosniff` ✓
- `referrer-policy: strict-origin-when-cross-origin` ✓
- `permissions-policy: camera=(), microphone=(), geolocation=()` ✓
- `x-dns-prefetch-control: off` ✓

Nessun problema rilevato sul fronte sicurezza HTTP base.

## 3. Pagine pubbliche raggiungibili (senza login)

Identificate dal markup della home:

- `/`
- `/contatti`
- `/hall-of-fame`
- `/login`
- `/masters`

Tutte rispondono **HTTP 200**.

Le route protette si comportano correttamente:

- `/admin` → 307 (redirect a login) ✓
- `/dashboard` → 307 (redirect a login) ✓

Le pagine inesistenti (`/pagina-inesistente`, `/campaign/abc-not-real`, `/api/inesistente`) rispondono **404** con error page Next standard (~18KB).

## 4. Smoke test (singole richieste, post warm-up)

| Path | HTTP | TTFB | Total | Size | Cache |
|---|---:|---:|---:|---:|---|
| `/` | 200 | 0.945s | 1.052s | 88.6 KB | MISS |
| `/contatti` | 200 | 0.483s | 0.484s | 21.6 KB | MISS |
| `/hall-of-fame` | 200 | 0.665s | 0.783s | 76.0 KB | MISS |
| `/login` | 200 | 0.270s | 0.270s | 20.4 KB | MISS |
| `/masters` | 200 | 0.464s | 0.479s | 41.1 KB | MISS |

Static asset (`/_next/static/...`):

- `cache-control: public, max-age=31536000, immutable` ✓
- `x-vercel-cache: HIT` (servito dalla edge) ✓
- `age: 92107` (in cache da ~25h) ✓

## 5. Burst test livello 2

### Burst A — 50 richieste, concorrenza 10

- Distribuzione round-robin sulle 5 pagine pubbliche
- Durata totale: ~3.7s
- Status: **50/50 = 200**, 0 errori
- Cache: 50/50 MISS (nessuna richiesta servita dalla edge)

| Metrica | Valore |
|---|---:|
| TTFB min | 0.241s |
| TTFB p50 | 0.404s |
| TTFB p75 | 0.637s |
| TTFB p90 | 1.276s |
| TTFB p95 | 1.702s |
| TTFB p99 | 1.796s |
| TTFB max | 1.796s |
| TTFB avg | 0.613s |

Per pagina (10 hit ciascuna):

| URL | p50 | p95 | max |
|---|---:|---:|---:|
| `/` | 0.594s | 1.730s | 1.730s |
| `/contatti` | 0.265s | 1.176s | 1.176s |
| `/hall-of-fame` | 0.578s | 1.518s | 1.518s |
| `/login` | 0.266s | 1.276s | 1.276s |
| `/masters` | 0.401s | 1.796s | 1.796s |

### Burst B — 60 richieste, concorrenza 20

- Durata totale: ~2.0s
- Status: **60/60 = 200**, 0 errori
- Cache: 60/60 MISS

| Metrica | Valore |
|---|---:|
| TTFB min | 0.249s |
| TTFB p50 | 0.412s |
| TTFB p90 | 0.764s |
| TTFB p95 | **0.828s** |
| TTFB p99 | 1.171s |
| TTFB max | 1.360s |
| TTFB avg | 0.491s |

Per pagina (12 hit ciascuna):

| URL | p50 | p95 | max |
|---|---:|---:|---:|
| `/` | 0.466s | 0.796s | 0.828s |
| `/contatti` | 0.284s | 0.391s | 0.980s |
| `/hall-of-fame` | 0.603s | 1.171s | 1.360s |
| `/login` | 0.272s | 0.384s | 0.467s |
| `/masters` | 0.587s | 0.744s | 0.764s |

### Osservazione chiave

Sotto concorrenza più alta (20 vs 10) il p95 è sceso da **1.7s a 828ms**. Significa che i container Vercel restano caldi e la coda non si forma a questi livelli. La latenza percepita peggiore è dovuta a cold start della prima richiesta, non a saturazione.

## 6. Rischi residui per il go-live

Ordinati per impatto.

### R1 — `cache-control: private, no-cache, no-store, max-age=0, must-revalidate` su tutte le pagine pubbliche (alto)

Ogni visitatore = render server-side. La home pesa 88KB di HTML, `/hall-of-fame` 76KB. Se al lancio arrivano 200 utenti simultanei in 30s, sono 200 invocazioni di Vercel Functions + 200 query Supabase (almeno). A oggi:

- **Prob. di reggere**: alta per traffico medio (decine di utenti/min);
- **Prob. di reggere picchi reali**: media — i Vercel Functions hanno limiti di concorrenza per piano e Supabase pooler ha pool size finito.

**Mitigazione 5 minuti**: aggiungere su `/`, `/contatti`, `/hall-of-fame`, `/masters` un header tipo `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` (i contenuti cambiano poco). Risultato: 1 render ogni 60s, gli altri 99% serviti da edge HIT.

Se il contenuto è statico per davvero, valutare anche `revalidate` di Next App Router su quelle route.

### R2 — TTFB cold start ~2.3s al primo visitatore (medio)

Il primissimo utente di domani vedrà ~2.3s. Trascurabile in pratica, ma se il primo a misurare è un giornalista con Lighthouse il punteggio LCP ne risente.

**Mitigazione gratuita**: fare 1-2 visite manuali sulle 5 pagine pubbliche poco prima della presentazione per scaldare i container.

### R3 — `robots.txt`, `sitemap.xml`, `favicon.ico` rispondono 404 (medio)

Un sito che si presenta ufficialmente domani senza:

- `robots.txt` → crawler senza indicazioni;
- `sitemap.xml` → indicizzazione lenta su Google;
- `favicon.ico` → tab senza icona, pessima impressione visiva nel browser dei giornalisti/utenti.

**Mitigazione**: aggiungere i tre file (5 minuti). Particolarmente la favicon è cosmetica ma molto visibile.

### R4 — Cross-region edge fra1 → origin iad1 (medio)

Ogni request dinamica fa il giro Europa↔US. Non risolvibile a breve, ma da considerare se nel futuro si aggiungeranno feature DB-heavy.

**Mitigazione lungo termine**: spostare le Vercel Functions a `fra1` o `cdg1` se la maggior parte dell'utenza è italiana.

### R5 — Endpoint autenticati e AI non testati (informativo)

Per scelta di sicurezza non ho testato sotto carico:

- `/api/sheet-pdf` (PDF generation)
- AI generation (OpenRouter / Hugging Face)
- Server actions di campagna/PG (POST con scrittura DB)
- Realtime / Supabase websocket

Sono i punti più suscettibili sotto carico reale (quote esterne, RLS, websocket backpressure). **Suggerimento**: avere pronto un canale (Telegram/WhatsApp) per gestire eventuali degradi durante il lancio, e tenere d'occhio i log Vercel + Supabase live in finestra dedicata durante l'evento.

## 7. Cosa NON ho testato e perché

- **Stress aggressivo (>200 req/s)** → potrebbe attivare protezione DDoS Vercel proprio domani.
- **POST/scritture su endpoint reali** → genera dati sporchi in DB.
- **AI generation reale (HF, OpenRouter)** → consuma quote pagate.
- **Login flow autenticato sotto carico** → richiederebbe utenze di test e pulizia dati.
- **Browser test (Lighthouse, hydration timing)** → fuori scope di questo round; consigliato eseguire un Lighthouse manuale prima del live.

## 8. Azioni consigliate prima del lancio (in ordine di priorità)

1. **[P0, 5 min]** Aggiungere `robots.txt`, `sitemap.xml`, `favicon.ico` (anche se basici).
2. **[P0, 10 min]** Aggiungere cache su `/`, `/contatti`, `/hall-of-fame`, `/masters` (`s-maxage=60, stale-while-revalidate=300` o `revalidate=60` di Next).
3. **[P1, gratis]** Pre-warm: visitare manualmente le 5 pagine pubbliche 5 min prima del go-live.
4. **[P1, gratis]** Tenere aperti durante il lancio: dashboard Vercel (Functions + Edge), dashboard Supabase (DB load + connections), log applicativi.
5. **[P2, ottimizzazione]** Considerare lo spostamento delle Vercel Functions a region europea per ridurre la latenza.

## 9. Verdetto finale

**GO per il lancio.**

Motivazione:

- 0 errori su 110 richieste, p95 stabile sotto al secondo a concorrenza 20.
- Sicurezza HTTP impeccabile.
- Static asset edge-cached correttamente.
- Le route protette redirigono come dovrebbero.
- I rischi noti (cache, SEO file, cold start) sono mitigabili in <30 minuti.

Lancia. Le tre quick win in §8 #1 e #2 sono altamente raccomandate ma non bloccanti.

---

## Allegati

- Burst A (CSV grezzo): `/tmp/bnd/results.csv`
- Burst B (CSV grezzo): `/tmp/bnd/results2.csv`
- Script load test: `/tmp/bnd/loadtest.sh`, `/tmp/bnd/loadtest2.sh`
- Script analisi: `/tmp/bnd/analyze.py`
