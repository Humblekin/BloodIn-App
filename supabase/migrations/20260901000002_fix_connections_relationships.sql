-- Migration: Align connections schema to the app + earlier migrations.
--
-- Fixes two relationship bugs surfaced on the Connections screen:
--   1. `connection_requests.sender_id / receiver_id` were FK'd to auth.users,
--      so PostgREST could not join them to profiles (the app selects
--      sender_profile / receiver_profile). Profiles.id == auth.users.id, so
--      repointing the FKs to public.profiles is safe.
--   2. `connections` columns were renamed (requester_id -> user_a_id,
--      recipient_id -> user_b_id) by an earlier migration, but every query and
--      view depends on the original names. We restore them.
--
-- All steps are guarded so the migration is idempotent.

-- ── 1. Restore `connections` column names ─────────────────
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'connections' AND column_name = 'user_a_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'connections' AND column_name = 'requester_id'
  ) THEN
    ALTER TABLE public.connections RENAME COLUMN user_a_id TO requester_id;
    ALTER TABLE public.connections RENAME COLUMN user_b_id TO recipient_id;
  END IF;
END $$;

-- ── 2. Repoint connection_requests FKs from auth.users to public.profiles ──
DO $$
BEGIN
  ALTER TABLE public.connection_requests DROP CONSTRAINT IF EXISTS connection_requests_sender_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.connection_requests DROP CONSTRAINT IF EXISTS connection_requests_receiver_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.connection_requests
    ADD CONSTRAINT connection_requests_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.connection_requests
    ADD CONSTRAINT connection_requests_receiver_id_fkey
    FOREIGN KEY (receiver_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
