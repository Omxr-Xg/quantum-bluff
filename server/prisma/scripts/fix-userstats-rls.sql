-- Coller dans Supabase → SQL Editor si l'alerte public.UserStats persiste.

ALTER TABLE public."UserStats" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."UserStats" FROM anon, authenticated, PUBLIC;
DROP POLICY IF EXISTS qb_deny_api_access ON public."UserStats";
CREATE POLICY qb_deny_api_access ON public."UserStats"
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);
