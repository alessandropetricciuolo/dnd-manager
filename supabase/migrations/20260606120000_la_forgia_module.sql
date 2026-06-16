-- La Forgia: gestionale interno stampe 3D (inventario, vendite, conti).
-- Accesso: admin OR forge_access.enabled = true

-- ---------------------------------------------------------------------------
-- Helper admin (solo profiles, nessuna dipendenza da forge_access)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.forge_user_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- forge_access (tabella prima delle funzioni che la referenziano)
-- ---------------------------------------------------------------------------
CREATE TABLE public.forge_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  note text
);

-- ---------------------------------------------------------------------------
-- Helper accesso modulo (dopo forge_access)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.forge_user_has_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.forge_access fa
    WHERE fa.user_id = auth.uid()
      AND fa.enabled = true
  );
$$;

COMMENT ON FUNCTION public.forge_user_has_access() IS
  'True se l''utente corrente è admin o ha forge_access abilitato.';

ALTER TABLE public.forge_access ENABLE ROW LEVEL SECURITY;

-- Admin: lettura e scrittura completa
CREATE POLICY "forge_access_admin_all"
  ON public.forge_access
  FOR ALL
  USING (public.forge_user_is_admin())
  WITH CHECK (public.forge_user_is_admin());

-- GM abilitato: può leggere solo la propria riga (per UI stato)
CREATE POLICY "forge_access_self_select"
  ON public.forge_access
  FOR SELECT
  USING (user_id = auth.uid() AND public.forge_user_has_access());

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
CREATE TABLE public.forge_accounts (
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

CREATE INDEX forge_accounts_active_idx ON public.forge_accounts (active);

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
CREATE TABLE public.forge_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  description text,
  image_url text,
  cost_estimate numeric NOT NULL DEFAULT 0,
  sale_price numeric NOT NULL DEFAULT 0,
  min_stock integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX forge_products_active_idx ON public.forge_products (active);
CREATE INDEX forge_products_category_idx ON public.forge_products (category);

-- ---------------------------------------------------------------------------
-- sales
-- ---------------------------------------------------------------------------
CREATE TABLE public.forge_sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_date timestamptz NOT NULL DEFAULT now(),
  payment_status text NOT NULL DEFAULT 'pagato'
    CHECK (payment_status IN ('pagato', 'da_pagare', 'parziale')),
  customer_name text,
  event_name text,
  account_id uuid NOT NULL REFERENCES public.forge_accounts(id),
  total_amount numeric NOT NULL DEFAULT 0,
  note text,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX forge_sales_sale_date_idx ON public.forge_sales (sale_date DESC);
CREATE INDEX forge_sales_account_idx ON public.forge_sales (account_id);

-- ---------------------------------------------------------------------------
-- sale_items
-- ---------------------------------------------------------------------------
CREATE TABLE public.forge_sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid NOT NULL REFERENCES public.forge_sales(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.forge_products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL CHECK (unit_price >= 0),
  total_price numeric NOT NULL CHECK (total_price >= 0)
);

CREATE INDEX forge_sale_items_sale_idx ON public.forge_sale_items (sale_id);
CREATE INDEX forge_sale_items_product_idx ON public.forge_sale_items (product_id);

-- ---------------------------------------------------------------------------
-- inventory_movements
-- ---------------------------------------------------------------------------
CREATE TABLE public.forge_inventory_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.forge_products(id),
  type text NOT NULL
    CHECK (type IN ('produzione', 'vendita', 'scarto', 'reso', 'correzione')),
  quantity integer NOT NULL,
  note text,
  sale_id uuid REFERENCES public.forge_sales(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX forge_inventory_movements_product_idx ON public.forge_inventory_movements (product_id);
CREATE INDEX forge_inventory_movements_type_idx ON public.forge_inventory_movements (type);
CREATE INDEX forge_inventory_movements_sale_idx ON public.forge_inventory_movements (sale_id);

-- ---------------------------------------------------------------------------
-- account_movements
-- ---------------------------------------------------------------------------
CREATE TABLE public.forge_account_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.forge_accounts(id),
  type text NOT NULL CHECK (type IN ('entrata', 'uscita', 'correzione')),
  amount numeric NOT NULL CHECK (amount <> 0),
  reason text,
  category text,
  linked_sale_id uuid REFERENCES public.forge_sales(id) ON DELETE RESTRICT,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  movement_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX forge_account_movements_account_idx ON public.forge_account_movements (account_id);
CREATE INDEX forge_account_movements_date_idx ON public.forge_account_movements (movement_date DESC);
CREATE INDEX forge_account_movements_sale_idx ON public.forge_account_movements (linked_sale_id);

-- ---------------------------------------------------------------------------
-- RLS: dati operativi (admin + GM con accesso)
-- ---------------------------------------------------------------------------
ALTER TABLE public.forge_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forge_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forge_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forge_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forge_inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forge_account_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "forge_accounts_select" ON public.forge_accounts FOR SELECT USING (public.forge_user_has_access());
CREATE POLICY "forge_accounts_insert" ON public.forge_accounts FOR INSERT WITH CHECK (public.forge_user_has_access());
CREATE POLICY "forge_accounts_update" ON public.forge_accounts FOR UPDATE USING (public.forge_user_has_access()) WITH CHECK (public.forge_user_has_access());

CREATE POLICY "forge_products_select" ON public.forge_products FOR SELECT USING (public.forge_user_has_access());
CREATE POLICY "forge_products_insert" ON public.forge_products FOR INSERT WITH CHECK (public.forge_user_has_access());
CREATE POLICY "forge_products_update" ON public.forge_products FOR UPDATE USING (public.forge_user_has_access()) WITH CHECK (public.forge_user_has_access());

CREATE POLICY "forge_sales_select" ON public.forge_sales FOR SELECT USING (public.forge_user_has_access());
CREATE POLICY "forge_sales_insert" ON public.forge_sales FOR INSERT WITH CHECK (public.forge_user_has_access());

CREATE POLICY "forge_sale_items_select" ON public.forge_sale_items FOR SELECT USING (public.forge_user_has_access());
CREATE POLICY "forge_sale_items_insert" ON public.forge_sale_items FOR INSERT WITH CHECK (public.forge_user_has_access());

CREATE POLICY "forge_inventory_select" ON public.forge_inventory_movements FOR SELECT USING (public.forge_user_has_access());
CREATE POLICY "forge_inventory_insert" ON public.forge_inventory_movements FOR INSERT WITH CHECK (public.forge_user_has_access());
-- Delete movimenti: solo admin; GM non può cancellare movimenti vendita
CREATE POLICY "forge_inventory_delete_admin" ON public.forge_inventory_movements FOR DELETE
  USING (public.forge_user_is_admin());

CREATE POLICY "forge_account_mov_select" ON public.forge_account_movements FOR SELECT USING (public.forge_user_has_access());
CREATE POLICY "forge_account_mov_insert" ON public.forge_account_movements FOR INSERT WITH CHECK (public.forge_user_has_access());
CREATE POLICY "forge_account_mov_delete_admin" ON public.forge_account_movements FOR DELETE
  USING (public.forge_user_is_admin());

-- ---------------------------------------------------------------------------
-- Viste stock / saldi (security invoker = rispetta RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.forge_product_stock
WITH (security_invoker = true) AS
SELECT
  product_id,
  COALESCE(SUM(quantity), 0)::integer AS stock
FROM public.forge_inventory_movements
GROUP BY product_id;

CREATE OR REPLACE VIEW public.forge_account_balances
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
FROM public.forge_accounts a
LEFT JOIN public.forge_account_movements m ON m.account_id = a.id
GROUP BY a.id, a.opening_balance;

-- ---------------------------------------------------------------------------
-- RPC: crea vendita atomica (sales + items + inventario + entrata conto)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.forge_create_sale(
  p_sale_date timestamptz,
  p_payment_status text,
  p_customer_name text,
  p_event_name text,
  p_account_id uuid,
  p_note text,
  p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_user_id uuid;
  v_total numeric := 0;
  v_item jsonb;
  v_product_id uuid;
  v_qty integer;
  v_unit numeric;
  v_line_total numeric;
BEGIN
  IF NOT public.forge_user_has_access() THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  v_user_id := auth.uid();

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Almeno un prodotto è obbligatorio';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM forge_accounts WHERE id = p_account_id AND active = true) THEN
    RAISE EXCEPTION 'Conto non valido o disattivato';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::integer;
    v_unit := (v_item->>'unit_price')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Quantità non valida';
    END IF;
    v_total := v_total + (v_qty * v_unit);
  END LOOP;

  INSERT INTO forge_sales (
    sale_date, payment_status, customer_name, event_name,
    account_id, total_amount, note, created_by
  ) VALUES (
    COALESCE(p_sale_date, now()),
    COALESCE(p_payment_status, 'pagato'),
    NULLIF(trim(p_customer_name), ''),
    NULLIF(trim(p_event_name), ''),
    p_account_id,
    v_total,
    NULLIF(trim(p_note), ''),
    v_user_id
  )
  RETURNING id INTO v_sale_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::integer;
    v_unit := (v_item->>'unit_price')::numeric;
    v_line_total := v_qty * v_unit;

    IF NOT EXISTS (SELECT 1 FROM forge_products WHERE id = v_product_id AND active = true) THEN
      RAISE EXCEPTION 'Prodotto non valido: %', v_product_id;
    END IF;

    INSERT INTO forge_sale_items (sale_id, product_id, quantity, unit_price, total_price)
    VALUES (v_sale_id, v_product_id, v_qty, v_unit, v_line_total);

    INSERT INTO forge_inventory_movements (product_id, type, quantity, note, sale_id, created_by)
    VALUES (v_product_id, 'vendita', -v_qty, 'Vendita automatica', v_sale_id, v_user_id);
  END LOOP;

  INSERT INTO forge_account_movements (
    account_id, type, amount, reason, category, linked_sale_id, created_by, movement_date
  ) VALUES (
    p_account_id,
    'entrata',
    v_total,
    COALESCE(NULLIF(trim(p_note), ''), 'Incasso vendita'),
    'vendita',
    v_sale_id,
    v_user_id,
    COALESCE(p_sale_date, now())
  );

  RETURN v_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.forge_create_sale(timestamptz, text, text, text, uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forge_create_sale(timestamptz, text, text, text, uuid, text, jsonb) TO authenticated;

-- ---------------------------------------------------------------------------
-- Storage: immagini prodotto
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('forge_products', 'forge_products', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "forge_products_storage_select"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'forge_products' AND public.forge_user_has_access());

CREATE POLICY "forge_products_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'forge_products' AND public.forge_user_has_access());

CREATE POLICY "forge_products_storage_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'forge_products' AND public.forge_user_has_access())
  WITH CHECK (bucket_id = 'forge_products' AND public.forge_user_has_access());

CREATE POLICY "forge_products_storage_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'forge_products' AND public.forge_user_has_access());
