-- =============================================================================
-- À exécuter UNE FOIS dans Supabase → SQL Editor (connexion directe, pas pooler).
-- Corrige TOUTES les alertes "RLS Disabled in Public" (User, UserStats, GameHistory, …).
-- =============================================================================

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

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;

-- Vérification : doit retourner 0 ligne
SELECT c.relname AS table_sans_rls
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND NOT c.relrowsecurity
ORDER BY 1;
