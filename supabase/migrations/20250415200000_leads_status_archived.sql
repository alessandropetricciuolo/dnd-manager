-- Aggiunge stato 'archived' per reclute scartate / non interessate.
ALTER TABLE public.leads
  DROP CONSTRAINT IF EXISTS leads_status_check;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('new', 'contacted', 'converted', 'archived'));

COMMENT ON COLUMN public.leads.status IS 'new | contacted | converted | archived.';
