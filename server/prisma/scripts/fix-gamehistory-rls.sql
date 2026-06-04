-- Supabase Advisors : public.GameHistory — coller dans SQL Editor puis Run.

ALTER TABLE public."GameHistory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."GameHistory" FROM anon, authenticated, PUBLIC;
DROP POLICY IF EXISTS qb_deny_api_access ON public."GameHistory";
CREATE POLICY qb_deny_api_access ON public."GameHistory"
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
