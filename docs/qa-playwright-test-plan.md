# Piano test E2E Playwright — Barber and Dragons

- **Data**: 2026-06-09
- **Obiettivo**: copertura browser dell’intera app (non solo torneo), con tre persona: **Admin**, **GM**, **Player**
- **Tool**: Playwright (`@playwright/test`)
- **Stato attuale**: Playwright installato dall’utente; **non ancora** configurato nel repo (`package.json` non ha script né `playwright.config.ts`)

---

## 1. Verdetto analisi

L’app è organizzata attorno a **3 ruoli globali** (`profiles.role`: `admin` | `gm` | `player`) e **4 tipi campagna** (`oneshot`, `quest`, `long`, `torneo`). I permessi non sono uniformi: molte funzioni dipendono sia dal ruolo globale sia dal legame con la campagna (membro Long, `has_played_campaign`, iscrizione sessione).

Per i test E2E servono:

| Persona | Ruolo DB | Cosa deve poter fare |
|---------|----------|----------------------|
| **Admin** | `admin` | Tutto GM + pannello `/admin/*` |
| **GM** | `gm` (non admin) | Campagne, GM Screen, torneo, export immagini — **no** `/admin` |
| **Player** | `player` | Dashboard, profilo, campagne giocate, prenotazioni, PG propri |

**Account QA noti**: `testolone@gmail.com` (admin). Servono account dedicati **GM puro** e **Player** (vedi §8).

---

## 2. Mappa funzionale dell’app

### 2.1 Aree trasversali

| Area | Route principali | Auth | Note permessi |
|------|------------------|------|---------------|
| **Home / marketing** | `/`, `/scopri`, `/contatti`, `/privacy`, `/masters`, `/master/[username]`, `/hall-of-fame` | Pubblico (home personalizzata se loggato) | Smoke: caricamento, link CTA login/dashboard |
| **Auth** | `/login`, `/forgot-password`, `/update-password`, `/auth/callback` | Misto | Login, logout, reset password, redirect post-auth |
| **Dashboard** | `/dashboard` | Login | Player: mie sessioni + campagne; GM/Admin: calendario, crea evento, storico sessioni |
| **Profilo** | `/profile`, `/dashboard/settings/profile` | Login | Profilo personale; profilo pubblico GM solo GM/Admin |
| **Generator schede** | `/generator` | Implicito (actions server) | Generazione PG, preview build, salvataggio su campagna, download PDF |
| **Compendio** | `/compendium` | Login + GM/Admin | Bestiario/manuali interni |
| **Portali pubblici** | `/player/[nickname]` | Pubblico | Profilo player pubblico |
| **Spotify OAuth** | `/spotify/callback` | Login GM | Callback integrazione playlist |

### 2.2 Campagna — workspace (`/campaigns/[id]`)

Tab disponibili: `sessioni` | `wiki` | `mappe` | `missioni` | `pg` | `gm`

| Tab | Admin/GM | Player | Regole accesso |
|-----|----------|--------|----------------|
| **Sessioni** | Crea/gestisci sessioni, iscritti, chiusura | Prenota / vede sessioni (se campagna pubblica o Long iscritto) | Long: player non iscritto vede blocco iscrizione |
| **Wiki** | CRUD entità, import bulk, grafo relazioni | Lettura se `hasPlayedCampaign` o membro Long | Player senza sessione: tab bloccata → redirect sessioni |
| **Mappe** | Upload, edit, overlay, vista proiezione | Lettura (stesse regole wiki) | **Nascosta per torneo** |
| **Missioni** | Board missioni, encounter | Solo campagne **Long** + membro/GM | Assente su oneshot/quest/torneo |
| **PG** | CRUD tutti i PG campagna, assegnazioni | Solo i propri PG | GM/Admin gestiscono pool PG |
| **Strumenti GM** | Homepage GM, AI, primer, calendario, email | — | Solo GM/Admin |

**Sotto-route campagna (GM/Admin)**:

| Route | Tipo campagna | Funzione |
|-------|---------------|----------|
| `/campaigns/[id]/gm-screen` | Tutti (layout diverso) | GM Screen live: initiative, note, whisper, gallery, audio, remote, chiusura sessione |
| `/campaigns/[id]/primer` | Tutti | Player primer markdown |
| `/campaigns/[id]/wiki/[entityId]` | Tutti | Dettaglio entità wiki |
| `/campaigns/[id]/maps/[mapId]` | Non-torneo | Editor mappa |
| `/campaigns/[id]/maps/[mapId]/view` | Non-torneo | Vista mappa player |
| `/campaigns/[id]/maps/[mapId]/overlay-edit` | Non-torneo | Overlay token |
| `/campaigns/[id]/gm-only/vista-dall-alto` | Long | Mappa operativa mondo |
| `/campaigns/[id]/gm-only/vista-dall-alto/proiezione` | Long | Proiezione schermo |
| `/campaigns/[id]/gm-only/missioni/proiezione` | Long | Proiezione mission board |
| `/campaigns/[id]/gm-only/concept-map` | Long | Concept map entità |
| `/campaigns/[id]/settings/ai-style` | Tutti | Stile immagini AI campagna |
| `/campaigns/[id]/torneo-tabellone` | Torneo | Tabellone pubblico v1 |
| `/campaigns/[id]/torneo2` | Torneo | Console Torneo 2.0 |
| `/campaigns/[id]/iscrizione-confermata` | Long | Conferma iscrizione |

### 2.3 GM Screen — varianti per tipo

| Tipo | Componente | Funzioni chiave da testare |
|------|------------|----------------------------|
| **Oneshot / Quest** | `GmScreenLegacyLayout` | Selezione sessione, initiative tracker, note GM, whisper segreti, galleria, audio forge, Spotify dock, telecomando GM, wizard chiusura sessione |
| **Long** | `GmScreenLongLayout` | Tutto legacy + economia, tempo in-game, calendario in-game, mission encounter loader, modalità Durante/Chiusura |
| **Torneo** | `GmScreenTorneoLayout` | Live session, 2 station parallele, timer match, bracket live, telecomando torneo, kill switch emergenza |

### 2.4 Torneo v1 (live pubblico)

| Route | Auth | Funzione |
|-------|------|----------|
| `/torneo-live/[livePublicId]/bracket` | Pubblico | Tabellone live |
| `/torneo-live/[livePublicId]/timer/[matchId]` | Pubblico | Megatimer |
| `/torneo-live/[livePublicId]/table/[matchId]` | Pubblico | Operatore tavolo |
| `/gm-remote/j/[publicId]` | Token/sessione | Join telecomando GM |

### 2.5 Torneo 2.0

| Route | Auth | Funzione |
|-------|------|----------|
| `/campaigns/[id]/torneo2` | GM/Admin + tipo torneo | Setup squadre, live 2 station, bracket, classifica, kill switch |
| `/torneo2-live/[publicId]/board` | Pubblico | Board live |
| `/torneo2-live/[publicId]/timer/[matchId]` | Pubblico | Timer |
| `/torneo2-live/[publicId]/table/[matchId]` | Pubblico | Operatore tavolo |
| `/torneo2/remote/[publicId]` | Remote | Telecomando torneo2 |

API remote: `/api/torneo2-remote/[publicId]/{state,combat,timer}`, `/api/gm-remote/[publicId]/*`

### 2.6 Admin (`/admin/*` — solo `role=admin`)

| Sezione | Route | Funzioni |
|---------|-------|----------|
| Utenti | `/admin`, `/admin/users/[id]` | Lista, crea utente, cambia ruolo, modifica, elimina |
| Audio Gilda | `/admin/audio-library` | Libreria audio globale, playlist Spotify |
| Reclute CRM | `/admin/crm` | Lead, export CSV |
| Campagne giocate | `/admin/player-campaigns` | Vista admin su campagne player |
| Statistiche feedback | `/admin/feedback-statistics` | Aggregati feedback sessioni |
| Comunicazioni | `/admin/communications` | Email di massa, template |
| Gamification | `/admin/gamification` | Achievement, avatar, profilo player |
| Import campagna | `/admin/import` | Import JSON campagna completa |
| Catalogo PG | `/admin/character-catalog-import` | Import catalogo personaggi |
| Manuali RAG | `/admin/knowledge` | Ingest manuali, ricerca semantica |
| Stili AI | `/admin/ai-image-styles` | Gestione stili generazione immagini |
| Export immagini | `/admin/media-export` | Anche accessibile a GM (`/admin/media-export` con check ruolo) |

### 2.7 API rilevanti per smoke/security (non full UI)

| Endpoint | Ruolo atteso | Rischio noto |
|----------|--------------|--------------|
| `POST /api/sheet-pdf` | Dovrebbe essere autenticato | **S2**: attualmente anonimo |
| `GET /api/manuals/player-handbook-md` | Auth | Manuale player |
| `GET /api/ai/image-providers` | GM/Admin | Provider AI |
| `POST /api/campaigns/[id]/character-sheets-zip` | GM/Admin | Export ZIP schede |
| `POST /api/admin/backup-to-telegram` | Admin | Backup |
| `POST /api/setup-webhook` | Admin/secret | **S3**: 500 senza auth |

---

## 3. Matrice permessi (sintesi)

Legenda: ✅ pieno | 👁 read | 🔒 bloccato | ➖ N/A | 🟡 parziale

| Funzione | Admin | GM | Player |
|----------|-------|-----|--------|
| Dashboard + profilo | ✅ | ✅ | ✅ |
| Crea campagna | ✅ | ✅ | 🔒 |
| GM Screen | ✅ | ✅ | 🔒 |
| Tab GM campagna | ✅ | ✅ | 🔒 |
| Wiki/Mappe campagna | ✅ | ✅ | 👁 se giocato / Long member |
| Missioni (Long) | ✅ | ✅ | 👁 se membro Long |
| PG campagna (tutti) | ✅ | ✅ | 🟡 solo propri |
| Prenota sessione | ✅ | ✅ | ✅ (se pubblica / Long iscritto) |
| Generator + salva PG | ✅ | ✅ | 🟡 su campagne accessibili |
| Compendium | ✅ | ✅ | 🔒 |
| Export immagini | ✅ | ✅ | 🔒 |
| Profilo pubblico GM | ✅ | ✅ | 🔒 |
| Pannello `/admin` | ✅ | 🔒 redirect dashboard | 🔒 |
| Torneo 2.0 console | ✅ | ✅ | 🔒 |
| Pagine live torneo | ✅ | ✅ | 👁 pubbliche (no edit) |
| Telecomando GM | ✅ | ✅ | 🔒 |

---

## 4. Strategia Playwright

### 4.1 Progetti (3 persona + 1 pubblico)

```
tests/e2e/
  fixtures/
    auth.ts              # login per ruolo, storageState
    campaigns.ts         # ID campagne seed per tipo
  public/
    marketing.spec.ts
    torneo-live-pages.spec.ts
  player/
    auth.spec.ts
    dashboard.spec.ts
    campaign-oneshot.spec.ts
    campaign-long.spec.ts
    profile.spec.ts
  gm/
    auth.spec.ts
    campaign-crud.spec.ts
    gm-screen-legacy.spec.ts
    gm-screen-long.spec.ts
    wiki-maps.spec.ts
    characters-generator.spec.ts
    torneo-v1.spec.ts
    torneo2.spec.ts
  admin/
    auth-guard.spec.ts
    users.spec.ts
    communications.spec.ts
    knowledge-rag.spec.ts
    gamification.spec.ts
    import.spec.ts
  security/
    api-auth.spec.ts     # sheet-pdf, setup-webhook, ecc.
```

**Config suggerita** (`playwright.config.ts`):

- `projects`: `chromium` (base), opzionale `mobile` per smoke responsive
- `storageState` per admin/gm/player (login una volta in `globalSetup`)
- `baseURL`: `process.env.PLAYWRIGHT_BASE_URL` (default `http://localhost:3000`; suite `prod-smoke` su `https://barberanddragons.com`)
- `testIdAttribute`: preferire `data-testid` su componenti critici (da aggiungere progressivamente)
- `retries`: 1 in CI, 0 in locale
- `trace`: `on-first-retry`

### 4.2 Variabili ambiente (`.env.test` o CI secrets)

```env
PLAYWRIGHT_BASE_URL=http://localhost:3000
E2E_ADMIN_EMAIL=
E2E_ADMIN_PASSWORD=
E2E_GM_EMAIL=
E2E_GM_PASSWORD=
E2E_PLAYER_EMAIL=
E2E_PLAYER_PASSWORD=
E2E_CAMPAIGN_ONESHOT_ID=
E2E_CAMPAIGN_QUEST_ID=
E2E_CAMPAIGN_LONG_ID=
E2E_CAMPAIGN_TORNEO_ID=0d696961-fe0a-4b66-9f1a-856821396c29
```

### 4.3 Principi test

1. **Isolamento dati**: test di scrittura usano prefisso `E2E-` + timestamp; cleanup in `afterEach` o campagne dedicate sandbox.
2. **No AI in CI default**: generazione AI/OpenRouter esclusa o mockata (costo + flakiness). Suite separata `e2e-ai` manuale/notturna.
3. **Realtime**: torneo/GM remote testati con `expect.poll` o attesa eventi UI (max 10s).
4. **PDF**: verificare response `application/pdf` e status 200, non confronto binario.
5. **Prod vs local**: P0 su local/staging; smoke read-only su prod; mutazioni solo su campagne QA.

---

## 5. Piano test per area e priorità

### P0 — Bloccanti release (ogni ruolo)

#### Auth (tutti)
- [ ] Login credenziali valide → redirect `/dashboard`
- [ ] Login credenziali invalide → messaggio errore, resta su `/login`
- [ ] Logout → redirect home/login, route protette inaccessibili
- [ ] `/admin` come Player/GM → redirect `/dashboard`
- [ ] `/compendium` come Player → redirect `/dashboard`

#### Dashboard
- [ ] **Player**: vede “Le mie sessioni”, nessun “Crea campagna”
- [ ] **GM**: vede calendario GM, dialog crea evento calendario
- [ ] **Admin**: come GM + link Admin Panel in sidebar

#### Campagna — permessi base
- [ ] **Player** su oneshot senza aver giocato: tab Wiki/Mappe bloccate, messaggio unlock
- [ ] **Player** dopo `attended` su sessione: Wiki accessibile
- [ ] **Player** Long non iscritto: messaggio iscrizione, no prenotazione
- [ ] **Player** Long iscritto: prenotazione sessione, tab Missioni visibile
- [ ] **GM**: tutte le tab incluso Strumenti GM; crea sessione

#### GM Screen (smoke per tipo)
- [ ] **GM** apre gm-screen oneshot: initiative visibile, selezione sessione
- [ ] **GM** apre gm-screen long: pannelli economia/calendario presenti
- [ ] **GM** apre gm-screen torneo: tab Gestione + Tabellone, barra live

#### Admin (smoke)
- [ ] **Admin** `/admin`: lista utenti caricata
- [ ] **Admin** crea utente test (role player) e lo elimina / ripristina
- [ ] **GM** `/admin` → 302 dashboard

#### Torneo (smoke UI — estende QA REST già fatto)
- [ ] **GM** campagna torneo: link Torneo 2.0, console setup caricata
- [ ] Pagine pubbliche bracket/timer/table: HTTP 200 + titolo/contenuto atteso (con `livePublicId` da fixture)

---

### P1 — Regressioni funzionali importanti

#### Sessioni
- [ ] **GM** crea sessione oneshot, la rende pubblica, **Player** si iscrive
- [ ] **GM** segna presenze, avvia GM Screen, chiude sessione (wizard debrief)
- [ ] **GM** campagna privata: **Player** non vede sessioni in calendario
- [ ] Banner “sessione in sospeso” → link Riprendi chiusura funziona

#### Personaggi & Generator
- [ ] **GM** crea PG manuale in campagna, assegna a player
- [ ] **Player** vede solo propri PG, può aprire scheda
- [ ] **GM** `/generator?campaignId=…`: generazione **senza AI** (build manuale) + salva
- [ ] Download PDF scheda (autenticato) — status e content-type

#### Wiki
- [ ] **GM** crea entità, modifica markdown, salva
- [ ] **GM** grafo relazioni: nodo visibile dopo sync
- [ ] **Player** (post-sessione): legge entità, no pulsante crea

#### Mappe
- [ ] **GM** upload mappa, apre editor, salva
- [ ] **GM** vista proiezione carica senza errori
- [ ] **Player** (post-sessione): apre `/maps/[id]/view`, pan/zoom base

#### Missioni (Long)
- [ ] **GM** crea missione, cambia stato
- [ ] **Player** membro: vede board, dettaglio missione

#### Profilo
- [ ] **Player** aggiorna nickname, avatar, preferenze notifiche
- [ ] **GM** profilo pubblico: username, bio, toggle `is_gm_public`
- [ ] `/player/[nickname]` pubblico se `is_player_public`

#### Admin — flussi operativi
- [ ] Comunicazioni: compone bozza (no invio massivo in prod)
- [ ] Knowledge: ricerca semantica ritorna risultati (se indice popolato)
- [ ] Gamification: tab achievement/avatar caricano
- [ ] Import campagna: validazione JSON malformato → errore UI
- [ ] CRM: tabella lead, export CSV scaricabile

#### Torneo v1 + v2 (UI completa)
- [ ] **GM** v1: 8 squadre → bracket → live → assegna station → completa 1 match → timer pause/resume
- [ ] **GM** telecomando: join `/gm-remote/j/[id]`, comando focus match
- [ ] **GM** torneo2: setup → live → timer → classifica aggiornata
- [ ] Megatimer / board pubblici si aggiornano dopo azione GM (poll UI)

#### GM Screen — strumenti avanzati
- [ ] Note GM: crea, modifica, elimina
- [ ] Whisper segreto a singolo player
- [ ] Galleria immagini: upload + proiezione
- [ ] Audio forge / SFX pad (smoke apertura pannello)
- [ ] Spotify dock (se account collegato; altrimenti skip)

---

### P2 — Copertura estesa / edge case

#### Campagne
- [ ] Edit campagna (nome, tipo, immagine)
- [ ] Toggle pubblica/privata
- [ ] Long: toggle iscrizioni aperte/chiuse
- [ ] Delete campagna (solo sandbox)
- [ ] Primer player: rendering markdown + typography

#### Long — GM Screen avanzato
- [ ] Pannello economia: aggiungi voce, stato salvataggio
- [ ] Calendario in-game: modifica data, refresh persistenza
- [ ] Vista dall’alto + concept map

#### Esplorazione / portali
- [ ] Mappa operativa mondo, pin personaggi
- [ ] Overlay edit token

#### Integrazioni
- [ ] `POST /api/sheet-pdf` senza cookie → **deve** essere 401 (test regressione S2)
- [ ] `POST /api/setup-webhook` senza secret → 401/403 (S3)
- [ ] Rate limit login (osservazionale)

#### Public / SEO
- [ ] Home, scopri, contatti, privacy caricano
- [ ] Hall of fame, masters listing
- [ ] `robots.txt`, `sitemap.xml` (se presenti — oggi assenti in prod)

#### Responsive
- [ ] Campaign workspace tab bar mobile
- [ ] GM Screen torneo: station stack su viewport stretto
- [ ] Dashboard calendar day drawer (`NEXT_PUBLIC_DASHBOARD_CALENDAR_DAY_DRAWER`)

#### AI campagna long — produzione (P2 nightly, **non** CI per-PR)

Suite serial: `tests/e2e/ai/long-campaign-ai.prod.spec.ts` — `npm run test:e2e:ai-prod`.

| # | Scenario | Assert chiave |
|---|----------|---------------|
| 1 | Architetto AI — paletti + negative prompt | DB `campaigns.ai_context` (6 campi) |
| 2 | Wiki canonica + memoria IA | chunk `wiki` con token `E2E-AI-*` |
| 3 | Assistente IA — genera testo NPC (create) | toast + contenuto > 80 char |
| 4 | Sessione live — chiusura con riassunto | chunk `session_summary` |
| 5 | Query memoria campagna | risposta cita sigillo sessione |
| 6 | Bacchetta IA (tipo lore) | bozza testo + voce creata |
| 7 | Generazione immagine wiki (edit) | successo + `visual_negative` in DB |

**Handoff dettagliato:** [`docs/qa-ai-developer-handoff.md`](./qa-ai-developer-handoff.md) — architettura, attriti QA, fix implementati (§12).

**Prerequisiti:** URL Vercel (`https://dnd-manager-j8h5.vercel.app`), campagna `E2E-QA Long`, `SUPABASE_SERVICE_ROLE_KEY`, timeout 600s. Teardown: privatizza campagne + `e2e:cleanup-artifacts`.

**Fix prodotto post-QA (2026-06-13):** «Genera testo» anche in modifica wiki, Bacchetta auto-close, toast chunk memoria, cleanup artifact sandbox.

---

## 6. Dati di test richiesti

### 6.1 Account (da creare o fornire)

| Variabile | Ruolo | Requisiti |
|-----------|-------|-----------|
| `E2E_ADMIN_*` | admin | Esiste: `testolone@gmail.com` |
| `E2E_GM_*` | gm | **Serve account GM puro** (non admin), con almeno 1 campagna owned |
| `E2E_PLAYER_*` | player | Iscritto a: oneshot (giocata), oneshot (mai giocata), long (membro), long (non membro) |

### 6.2 Campagne seed (idealmente 4 fisse ambiente QA)

| Tipo | Scopo test |
|------|------------|
| **Oneshot** pubblica | Prenotazione player, unlock wiki post-sessione |
| **Quest** privata | Player non vede calendario |
| **Long** | Iscrizioni, missioni, party members |
| **Torneo** | `La Fossa dei draghi` — torneo v1/v2, 24+ PG pool |

### 6.3 Setup consigliato

1. Admin crea utenti GM e Player da `/admin` (dialog Crea utente).
2. GM crea le 4 campagne seed (o import da `/admin/import`).
3. Script `scripts/e2e-seed.ts` (futuro): iscrizioni, 1 sessione `attended` per unlock, PG assegnati.

---

## 7. Fasi di implementazione

| Fase | Deliverable | Stima |
|------|-------------|-------|
| **0 — Setup** | `@playwright/test`, `playwright.config.ts`, script `test:e2e`, `globalSetup` auth, `.env.test.example` | 0.5 giorno |
| **1 — P0** | Auth, dashboard per ruolo, guard admin, smoke campagna + gm-screen | 1 giorno |
| **2 — P1 core** | Sessioni, PG, wiki, mappe, profilo | 2 giorni |
| **3 — P1 torneo** | v1 UI + v2 UI + pagine live (riuso logica QA REST) | 1.5 giorni |
| **4 — P1 admin** | Utenti, comunicazioni, knowledge smoke | 1 giorno |
| **5 — P2 + CI** | Edge case, security API, GitHub Actions su PR | 1 giorno |

**Totale stimato**: ~7 giorni dev+QA per suite completa P0+P1; P2 incrementale.

---

## 8. Cosa è già coperto (non duplicare in Playwright)

| Area | Copertura esistente | Gap Playwright |
|------|---------------------|----------------|
| Torneo v1 logica bracket/live | `docs/qa-torneo-10cicli-2026-06-03.md` (REST, 400 check) | UI realtime, timer visuale, telecomando browser |
| Sheet PDF compilation | `scripts/qa-test-sheet-pdf.ts` | Click download da UI generator/PG |
| Manual search / security unit | `npm run test:manual-search`, `test:security` | — |
| Torneo2 logica | `npm run test:torneo2` (unit) | Console UI, board live |
| Stress prod | `docs/qa-stress-test-prod*.md` | — |

Playwright deve colmare il gap **interazione browser**, **permessi per ruolo**, **hydration/React**, **WebSocket/realtime**.

---

## 9. Rischi e mitigazioni

| Rischio | Mitigazione |
|---------|-------------|
| Flakiness realtime torneo | `expect.poll`, timeout 10–15s, test seriali per live session |
| Costo AI | Suite `test:e2e:ai-prod` solo nightly/manuale; escludere da CI PR |
| Dati prod sporchi | Campagne `E2E-QA*`; cleanup `e2e:cleanup-artifacts` in teardown |
| Account unico admin per tutto | Separare GM/Player per test negativi (403/redirect) |
| Playwright non in `package.json` | Aggiungere dipendenza e `npx playwright install` in CI |
| Assenza `data-testid` | Aggiungere su dialog critici (login, create session, create PG) |

---

## 10. Prossimi passi

1. **Conferma account** `E2E_GM_*` e `E2E_PLAYER_*` (o autorizzazione a crearli da admin).
2. **Implementare Fase 0** (config Playwright + fixture auth).
3. **Eseguire Fase 1 P0** contro locale con `npm run dev`.
4. Estendere incrementalmente P1 → P2.

---

## Appendice A — Elenco route (54 page.tsx)

```
/  /login  /forgot-password  /update-password  /auth/callback
/dashboard  /profile  /dashboard/settings/profile
/generator  /compendium
/scopri  /contatti  /privacy  /hall-of-fame  /masters  /master/[username]  /player/[nickname]
/campaigns/[id]  + gm-screen, primer, wiki/[entityId], maps/*, gm-only/*, torneo2, torneo-tabellone, settings/ai-style, iscrizione-confermata
/torneo-live/[livePublicId]/{bracket,timer/[matchId],table/[matchId]}
/torneo2-live/[publicId]/{board,timer/[matchId],table/[matchId]}
/torneo2/remote/[publicId]
/gm-remote/j/[publicId]
/admin  /admin/users/[id]  /admin/audio-library  /admin/crm  /admin/player-campaigns
/admin/feedback-statistics  /admin/communications  /admin/gamification
/admin/import  /admin/character-catalog-import  /admin/knowledge  /admin/ai-image-styles  /admin/media-export
/spotify/callback
```

## Appendice B — Checklist UX esistente

Integrare i punti di `docs/ux-regression-qa-checklist.md` nella suite GM/Long (initiative, economia, calendario, mission board, map cards mobile).
