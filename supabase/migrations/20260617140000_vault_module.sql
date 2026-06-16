-- Il Vault: contabilità Barber And Dragons (entrate/uscite per conto).
-- Accesso: admin OR vault_access.enabled = true

CREATE OR REPLACE FUNCTION public.vault_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$;

CREATE TABLE public.vault_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  note text
);

CREATE OR REPLACE FUNCTION public.vault_user_has_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.vault_access va
    WHERE va.user_id = auth.uid() AND va.enabled = true
  );
$$;

ALTER TABLE public.vault_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_access_admin_all"
  ON public.vault_access FOR ALL
  USING (public.vault_user_is_admin())
  WITH CHECK (public.vault_user_is_admin());

CREATE POLICY "vault_access_self_select"
  ON public.vault_access FOR SELECT
  USING (user_id = auth.uid() AND public.vault_user_has_access());

CREATE TABLE public.vault_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL DEFAULT 'altro'
    CHECK (type IN ('contanti', 'banca', 'paypal', 'satispay', 'altro')),
  opening_balance numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vault_accounts_active_idx ON public.vault_accounts (active);

CREATE TABLE public.vault_account_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.vault_accounts(id),
  type text NOT NULL CHECK (type IN ('entrata', 'uscita', 'correzione')),
  amount numeric NOT NULL CHECK (amount <> 0),
  reason text,
  category text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  movement_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX vault_account_movements_account_idx ON public.vault_account_movements (account_id);
CREATE INDEX vault_account_movements_date_idx ON public.vault_account_movements (movement_date DESC);

ALTER TABLE public.vault_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_account_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "vault_accounts_select" ON public.vault_accounts FOR SELECT USING (public.vault_user_has_access());
CREATE POLICY "vault_accounts_insert" ON public.vault_accounts FOR INSERT WITH CHECK (public.vault_user_has_access());
CREATE POLICY "vault_accounts_update" ON public.vault_accounts FOR UPDATE USING (public.vault_user_has_access()) WITH CHECK (public.vault_user_has_access());

CREATE POLICY "vault_account_mov_select" ON public.vault_account_movements FOR SELECT USING (public.vault_user_has_access());
CREATE POLICY "vault_account_mov_insert" ON public.vault_account_movements FOR INSERT WITH CHECK (public.vault_user_has_access());
CREATE POLICY "vault_account_mov_delete_admin" ON public.vault_account_movements FOR DELETE
  USING (public.vault_user_is_admin());

CREATE OR REPLACE VIEW public.vault_account_balances
WITH (security_invoker = true) AS
SELECT
  a.id AS account_id,
  a.opening_balance
    + COALESCE(SUM(
      CASE
        WHEN m.type = 'entrata' THEN m.amount
        WHEN m.type = 'uscita' THEN -ABS(m.amount)
        WHEN m.type = 'correzione' THEN m.amount
        ELSE 0
      END
    ), 0) AS balance
FROM public.vault_accounts a
LEFT JOIN public.vault_account_movements m ON m.account_id = a.id
GROUP BY a.id, a.opening_balance;
