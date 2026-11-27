-- Review accounts keep role = player. Their administrator-set Auth metadata
-- limits the records available to their mobile Regia and web GM Screen.
CREATE POLICY "Review GM reads only the private demo campaign"
ON public.campaigns AS RESTRICTIVE FOR SELECT TO authenticated
USING (
  (SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id') IS NULL
  OR (
    id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id')
    AND gm_id = (SELECT auth.uid())
    AND NOT is_public
  )
);

CREATE POLICY "Review GM cannot create campaigns"
ON public.campaigns AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id') IS NULL);

CREATE POLICY "Review GM cannot change campaign settings"
ON public.campaigns AS RESTRICTIVE FOR UPDATE TO authenticated
USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id') IS NULL)
WITH CHECK ((SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id') IS NULL);

CREATE POLICY "Review GM cannot delete campaigns"
ON public.campaigns AS RESTRICTIVE FOR DELETE TO authenticated
USING ((SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id') IS NULL);

CREATE POLICY "Review GM accesses only demo sessions"
ON public.sessions AS RESTRICTIVE FOR ALL TO authenticated
USING (
  (SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id') IS NULL
  OR campaign_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id')
);

CREATE POLICY "Review GM accesses only demo characters"
ON public.campaign_characters AS RESTRICTIVE FOR ALL TO authenticated
USING (
  (SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id') IS NULL
  OR campaign_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id')
);

CREATE POLICY "Review GM accesses only demo members"
ON public.campaign_members AS RESTRICTIVE FOR ALL TO authenticated
USING (
  (SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id') IS NULL
  OR campaign_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id')
);

CREATE POLICY "Review GM accesses only demo signups"
ON public.session_signups AS RESTRICTIVE FOR ALL TO authenticated
USING (
  (SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id') IS NULL
  OR EXISTS (
    SELECT 1 FROM public.sessions AS s
    WHERE s.id = session_id
      AND s.campaign_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id')
  )
);

-- Existing GM and admin pairing policies still apply to their accounts.
-- Review users can only pair their verified, private campaign as its owner.
CREATE POLICY "Review GM manages own demo pairing"
ON public.gm_remote_sessions FOR ALL TO authenticated
USING (
  created_by = (SELECT auth.uid())
  AND campaign_id::text = (SELECT auth.jwt() -> 'app_metadata' ->> 'review_gm_campaign_id')
  AND EXISTS (
    SELECT 1 FROM public.campaigns AS c
    WHERE c.id = campaign_id AND c.gm_id = (SELECT auth.uid()) AND NOT c.is_public
  )
);
