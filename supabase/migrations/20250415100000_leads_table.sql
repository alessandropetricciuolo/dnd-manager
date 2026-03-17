-- Lead da eventi fisici (NFC, landing /scopri): nome, email, esperienza, consenso marketing, stato.
CREATE TABLE IF NOT EXISTS public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  experience_level text,
  source text,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted')),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.leads IS 'Contatti da landing /scopri e NFC eventi: lead per tesseramenti e sessioni dal vivo.';
COMMENT ON COLUMN public.leads.source IS 'Fonte acquisizione, es. NFC_Landing_Page, NFC_Evento.';
COMMENT ON COLUMN public.leads.status IS 'new | contacted | converted.';

-- Inserimento consentito in anonimo (form pubblico); lettura/update solo per ruoli elevati (opzionale, RLS).
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous insert for leads"
  ON public.leads FOR INSERT
  TO anon
  WITH CHECK (true);

-- Solo service role / admin per lettura e aggiornamento (nessuna policy SELECT/UPDATE per anon).
-- Per permettere lettura a utenti autenticati admin, aggiungere policy separata se necessario.
