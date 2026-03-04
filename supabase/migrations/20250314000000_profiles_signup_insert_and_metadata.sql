-- 1. Policy INSERT su profiles: consente la creazione del profilo in signup (trigger o contesto nuovo utente)
CREATE POLICY "Allow profile insert on signup"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Trigger handle_new_user: copia first_name, last_name, phone da raw_user_meta_data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, first_name, last_name, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'player'),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'first_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'last_name'), ''),
    NULLIF(TRIM(NEW.raw_user_meta_data->>'phone'), '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
