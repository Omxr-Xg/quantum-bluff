-- Idempotent: Supabase Advisors — RLS on public."UserStats" and every public table.

ALTER TABLE public."UserStats" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public."UserStats" FROM anon, authenticated, PUBLIC;
DROP POLICY IF EXISTS qb_deny_api_access ON public."UserStats";
CREATE POLICY qb_deny_api_access ON public."UserStats"
  FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname AS tablename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    EXECUTE format(
      'REVOKE ALL ON TABLE public.%I FROM anon, authenticated, PUBLIC',
      r.tablename
    );
    EXECUTE format(
      'DROP POLICY IF EXISTS qb_deny_api_access ON public.%I',
      r.tablename
    );
    EXECUTE format(
      'CREATE POLICY qb_deny_api_access ON public.%I FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)',
      r.tablename
    );
  END LOOP;
END $$;
