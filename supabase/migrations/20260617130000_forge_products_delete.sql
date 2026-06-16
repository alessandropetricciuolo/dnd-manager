-- Consente eliminazione prodotti senza storico vendite/magazzino
CREATE POLICY "forge_products_delete"
  ON public.forge_products
  FOR DELETE
  USING (public.forge_user_has_access());
