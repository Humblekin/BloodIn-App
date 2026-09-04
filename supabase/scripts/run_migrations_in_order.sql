-- One-click migration runner for BloodIn
-- IMPORTANT: Run this script with `psql` from the project root so paths resolve.
-- Do NOT paste the whole file into the Supabase SQL editor; run with psql so each step commits.
-- Usage:
--   psql "<CONNECTION_STRING>" -f supabase/scripts/run_migrations_in_order.sql
-- Example (local):
--   psql "postgresql://postgres:password@db.example.com:5432/postgres" -f supabase/scripts/run_migrations_in_order.sql

\echo '1) Applying schema fixes (adds columns and enum values)'
BEGIN;
\i 'supabase/migrations/20260831000002_fix_schema_mismatches.sql'
COMMIT;

\echo '2) Applying connection_status updates (run after enum changes are committed)'
BEGIN;
\i 'supabase/migrations/20260902000005_connection_status_updates.sql'
COMMIT;

\echo '3) Applying security hardening (triggers, RLS adjustments)'
BEGIN;
\i 'supabase/migrations/20260901000003_security_hardening.sql'
COMMIT;

\echo '4) Applying premium RPC migration (upgrade_to_premium and find_nearby_users)'
BEGIN;
\i 'supabase/migrations/20260902000001_premium_upgrade.sql'
COMMIT;

\echo 'Verification checks (should report rows / function present)'
\echo 'Checking is_premium column in profiles:'
SELECT count(*) AS is_premium_columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_premium';

\echo 'Checking upgrade_to_premium function existence:'
SELECT proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'upgrade_to_premium' AND n.nspname = 'public';

\echo 'Done.'
