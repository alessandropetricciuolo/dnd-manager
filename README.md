# Barber & Dragons — D&D Campaign Manager

Piattaforma web per la gestione di campagne D&D 5e: Wiki per i giocatori, strumento di gestione per i Master.

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Lucide React
- **UI:** Shadcn/UI
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage)

## Setup (Fase 1)

### 1. Dipendenze

```bash
npm install
```

### 2. Supabase

1. Crea un progetto su [Supabase](https://supabase.com)
2. Copia `.env.example` in `.env.local` (se presente) oppure crea `.env.local`
3. Inserisci `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **AI (opzionale):** per le Server Action che usano Hugging Face Inference usa **`HUGGINGFACE_API_KEY`** oppure **`HF_TOKEN`** (stesso token; vedi [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)). **Su Vercel:** stesso nome in *Settings → Environment Variables*, spunta *Production* (e *Preview* se ti serve), poi **Redeploy** — senza redeploy le variabili nuove non arrivano al runtime. Applica anche la migrazione `supabase/migrations/20260301130000_campaigns_ai_context.sql` (colonna `campaigns.ai_context`).
4. Esegui le migrazioni in **SQL Editor** di Supabase:
   - Copia il contenuto di `supabase/migrations/20250301000000_initial_schema.sql`
   - Incolla ed esegui
5. Crea il bucket Storage `campaign-assets` (pubblico) per mappe e immagini

### 3. Dev Server

```bash
npm run dev
```

## Struttura

- `src/app/` — App Router (pagine, layout)
- `src/components/` — Componenti UI (incl. Shadcn)
- `src/lib/` — Utilità, client Supabase, `src/lib/ai/` — client Hugging Face (`generateAiText`)
- `supabase/migrations/` — Schema DB e migrazioni SQL
