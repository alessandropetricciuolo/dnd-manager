-- Modifica ed eliminazione vendite (incassi) atomica con movimenti collegati

CREATE OR REPLACE FUNCTION public.forge_delete_sale(p_sale_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.forge_user_has_access() THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.forge_sales WHERE id = p_sale_id) THEN
    RAISE EXCEPTION 'Vendita non trovata';
  END IF;

  DELETE FROM public.forge_inventory_movements WHERE sale_id = p_sale_id;
  DELETE FROM public.forge_account_movements WHERE linked_sale_id = p_sale_id;
  DELETE FROM public.forge_sales WHERE id = p_sale_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.forge_update_sale(
  p_sale_id uuid,
  p_sale_date timestamptz,
  p_payment_status text,
  p_customer_name text,
  p_event_name text,
  p_account_id uuid,
  p_note text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total numeric;
BEGIN
  IF NOT public.forge_user_has_access() THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.forge_sales WHERE id = p_sale_id) THEN
    RAISE EXCEPTION 'Vendita non trovata';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.forge_accounts WHERE id = p_account_id AND active = true) THEN
    RAISE EXCEPTION 'Conto non valido o disattivato';
  END IF;

  IF p_payment_status NOT IN ('pagato', 'da_pagare', 'parziale') THEN
    RAISE EXCEPTION 'Stato pagamento non valido';
  END IF;

  SELECT total_amount INTO v_total FROM public.forge_sales WHERE id = p_sale_id;

  UPDATE public.forge_sales
  SET
    sale_date = COALESCE(p_sale_date, sale_date),
    payment_status = p_payment_status,
    customer_name = NULLIF(trim(p_customer_name), ''),
    event_name = NULLIF(trim(p_event_name), ''),
    account_id = p_account_id,
    note = NULLIF(trim(p_note), '')
  WHERE id = p_sale_id;

  UPDATE public.forge_account_movements
  SET
    account_id = p_account_id,
    amount = v_total,
    movement_date = COALESCE(p_sale_date, movement_date),
    reason = COALESCE(NULLIF(trim(p_note), ''), 'Incasso vendita')
  WHERE linked_sale_id = p_sale_id;
END;
$$;

REVOKE ALL ON FUNCTION public.forge_delete_sale(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forge_delete_sale(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.forge_update_sale(uuid, timestamptz, text, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.forge_update_sale(uuid, timestamptz, text, text, text, uuid, text) TO authenticated;
