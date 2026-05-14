# Telecomando GM (browser mobile → GM screen PC)

## Architettura (v1)

```text
┌─────────────┐    HTTPS POST      ┌──────────────────────┐
│  Telefono   │ ─────────────────► │  /api/gm-remote/...  │
│  /gm-remote │   token+comando    │  (valida sessione,   │
└─────────────┘                    │   rate limit, insert) │
                                   └──────────┬───────────┘
                                              │ service role
                                              ▼
                                   ┌──────────────────────┐
                                   │ Supabase Postgres    │
                                   │ gm_remote_commands   │
                                   └──────────┬───────────┘
                                              │ Realtime INSERT
                                              ▼
┌─────────────┐    subscribe        ┌──────────────────────┐
│  GM screen  │ ◄───────────────────│  Browser GM (auth)   │
│  (use audio │   postgres_changes  │  GmRemoteCommandBridge│
│   hook)     │                     └──────────────────────┘
└─────────────┘
```

- **Pairing**: il GM autenticato crea una riga `gm_remote_sessions` (hash del token, `public_id`, scadenza). Il token in chiaro è mostrato **una volta** nel QR / link con **`#t=…`** (fragment non inviato al server sul GET).
- **Comandi**: envelope JSON (`type`, `payload`, `command_id`, `issued_at`, `seq?`, `source`) + `token` nel body POST. Dedup DB: `UNIQUE(session_public_id, command_id)`.
- **Estensibilità**: `type` stringa liberamente estendibile; il GM applica solo i tipi noti (`applyRemoteAudioCommand`); altri tipi restano in coda per evoluzioni (timer, FoW, …).
- **Sicurezza**: niente insert anonimo sui comandi; solo API con service role dopo verifica token (confronto **timing-safe**). RLS: SELECT per utenti `is_gm_or_admin()` sulla campagna (allineato alla visibilità campagne in app).

## Variabili ambiente

| Variabile | Ruolo |
|-----------|--------|
| `GM_REMOTE_TOKEN_PEPPER` | (Opzionale) Pepper dedicato per SHA-256 del token. Se assente: primi 48 caratteri di `SUPABASE_SERVICE_ROLE_KEY`. In dev senza SRK: fallback locale (cambiare in prod). |

## Comandi audio MVP

| `type` | `payload` |
|--------|-----------|
| `audio.music_play_pause` | — |
| `audio.music_next` / `audio.music_prev` | — |
| `audio.music_select_track` | `{ "category_id", "track_id" }` |
| `audio.music_master_volume` | `{ "value": 0..1 }` |
| `audio.music_mute` | `{ "muted": boolean }` |
| `audio.atmos_master_volume` / `audio.sfx_master_volume` | `{ "value": 0..1 }` |
| `audio.sfx_pad_slot` | `{ "slot_index": 0..11 }` |
| `audio.sfx_category_random` | `{ "category_id" }` |
| `audio.stop_all` | — |

## Migrazione

Eseguire `supabase db push` / pipeline CI sulla migration `20260515090000_gm_remote_control.sql`.

## Test manuali (checklist)

1. **Migrazione**: tabella visibile in Studio; Realtime attivo su `gm_remote_commands`.
2. **GM screen** (PC, utente GM): Apri **Telecomando** → Genera sessione → QR e link copiabili; stato Realtime passa a **connesso** quando la subscription è attiva.
3. **Telefono** (stesso host o deploy): Apri link con `#t=…` → UI telecomando; nessun login richiesto.
4. **Musica**: sul PC avvia musica dall’Audio Forge; dal telefono **Play/Pause**, **Next/Prev**, **Invia volume**, **Mute** → verifica effetto sul PC.
5. **Pad SFX**: assegna suoni a slot sul PC; dal telefono tasti 1–12 → audio sul PC.
6. **Stop tutto**: verifica stop musica/atmosfere/SFX background.
7. **Revoca**: dal PC revoca sessione → comandi dal telefono ricevono errore (401 / messaggio toast).
8. **Rate limit**: spam rapido di comandi → 429.
9. **Dedup**: stesso `command_id` ripetuto → risposta ok idempotente senza doppio effetto (se supportato dal client).

## Rischi / limiti

- **Rate limit in-memory**: su più istanze serverless non è globale; in produzione si può spostare su Redis/Upstash.
- **Retention comandi**: nessun cleanup automatico in MVP; aggiungere job (es. cancellare > 24h) se volume alto.
- **RLS SELECT comandi**: visibile a tutti i profili GM/Admin che possono vedere la campagna (modello guild); mitigazione: `session_public_id` non indovinabile; payload senza segreti.
- **HTML5 drag pad** e **telefono**: pairing URL con fragment non compare nei log server del GET; resta in history/storia browser sul telefono.
- **Realtime**: dipendenza da connessione WebSocket Supabase; reconnect gestito dal client Supabase; dedup lato GM su `command_id`.

## Estensioni future (non implementate)

- Comandi dominio `timer.*`, `fow.*`, `projection.*`, `note.*`.
- JWT firmato al posto del token opaco + rotazione breve.
- Cleanup comandi + indice temporale per partizioni.
- Coda “desired state” invece di eventi per ridurre righe DB.
- Broadcast channel Supabase se il volume comandi cresce molto.
