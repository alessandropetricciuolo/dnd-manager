-- Giroconto Vault atomico (uscita + entrata in un'unica transazione)

CREATE OR REPLACE FUNCTION public.vault_create_transfer(
  p_from_account_id uuid,
  p_to_account_id uuid,
  p_amount numeric,
  p_note text DEFAULT NULL,
  p_movement_date timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_user_id uuid;
  v_from_name text;
  v_to_name text;
  v_movement_date timestamptz;
  v_note text;
BEGIN
  IF NOT public.vault_user_has_access() THEN
    RAISE EXCEPTION 'Non autorizzato';
  END IF;

  v_user_id := auth.uid();
  v_amount := ABS(p_amount);
  IF v_amount = 0 THEN
    RAISE EXCEPTION 'Importo obbligatorio';
  END IF;

  IF p_from_account_id = p_to_account_id THEN
    RAISE EXCEPTION 'Seleziona due conti diversi';
  END IF;

  SELECT name INTO v_from_name
  FROM public.vault_accounts
  WHERE id = p_from_account_id AND active = true;

  SELECT name INTO v_to_name
  FROM public.vault_accounts
  WHERE id = p_to_account_id AND active = true;

  IF v_from_name IS NULL OR v_to_name IS NULL THEN
    RAISE EXCEPTION 'Conti non validi o disattivati';
  END IF;

  v_movement_date := COALESCE(p_movement_date, now());
  v_note := NULLIF(trim(p_note), '');

  INSERT INTO public.vault_account_movements (
    account_id, type, amount, reason, category, movement_date, created_by
  ) VALUES (
    p_from_account_id,
    'uscita',
    -v_amount,
    CASE
      WHEN v_note IS NOT NULL THEN format('Giroconto verso %s — %s', v_to_name, v_note)
      ELSE format('Giroconto verso %s', v_to_name)
    END,
    'giroconto',
    v_movement_date,
    v_user_id
  );

  INSERT INTO public.vault_account_movements (
    account_id, type, amount, reason, category, movement_date, created_by
  ) VALUES (
    p_to_account_id,
    'entrata',
    v_amount,
    CASE
      WHEN v_note IS NOT NULL THEN format('Giroconto da %s — %s', v_from_name, v_note)
      ELSE format('Giroconto da %s', v_from_name)
    END,
    'giroconto',
    v_movement_date,
    v_user_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.vault_create_transfer(uuid, uuid, numeric, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vault_create_transfer(uuid, uuid, numeric, text, timestamptz) TO authenticated;
