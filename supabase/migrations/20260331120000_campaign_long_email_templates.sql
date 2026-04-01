-- Template email campagne Long:
-- 1) auto-invio quando un player si iscrive
-- 2) template invii massivi ai membri della campagna

CREATE TABLE public.campaign_email_settings (
  campaign_id uuid PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  join_enabled boolean NOT NULL DEFAULT true,
  join_subject text NOT NULL DEFAULT 'Benvenuto nella campagna!',
  join_body_html text NOT NULL DEFAULT '<h2>Benvenuto, avventuriero!</h2><p>La tua iscrizione alla campagna è stata completata con successo.</p><p>Prepara equipaggiamento, spirito e dadi: il viaggio sta per iniziare.</p>',
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.campaign_bulk_email_templates (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body_html text NOT NULL,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX campaign_bulk_email_templates_campaign_id_idx
  ON public.campaign_bulk_email_templates (campaign_id, created_at DESC);

ALTER TABLE public.campaign_email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_bulk_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "GM and Admin can read campaign email settings"
  ON public.campaign_email_settings FOR SELECT
  USING (public.is_gm_or_admin());

CREATE POLICY "GM and Admin can manage campaign email settings"
  ON public.campaign_email_settings FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin());

CREATE POLICY "GM and Admin can read campaign bulk email templates"
  ON public.campaign_bulk_email_templates FOR SELECT
  USING (public.is_gm_or_admin());

CREATE POLICY "GM and Admin can manage campaign bulk email templates"
  ON public.campaign_bulk_email_templates FOR ALL
  USING (public.is_gm_or_admin())
  WITH CHECK (public.is_gm_or_admin());

