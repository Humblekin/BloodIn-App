-- Migration: Fix schema-to-code mismatches
-- All idempotent — safe to re-run.

-- ═══════════════════════════════════════════════════════════
-- 1. PROFILES — add missing columns
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN account_type TEXT NOT NULL DEFAULT 'individual';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN is_available BOOLEAN DEFAULT true;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN is_premium BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN human_verified BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN identity_verified BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- 2. CONNECTIONS — rename columns, fix status enum
-- ═══════════════════════════════════════════════════════════

-- Add new enum values (must come before UPDATE)
DO $$ BEGIN
  ALTER TYPE connection_status ADD VALUE IF NOT EXISTS 'declined';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE connection_status ADD VALUE IF NOT EXISTS 'cancelled';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Update existing rows
UPDATE public.connections SET status = 'declined' WHERE status = 'rejected';
UPDATE public.connections SET status = 'cancelled' WHERE status = 'blocked';

-- Rename columns
DO $$ BEGIN
  ALTER TABLE public.connections RENAME COLUMN requester_id TO user_a_id;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.connections RENAME COLUMN recipient_id TO user_b_id;
EXCEPTION WHEN undefined_column THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════
-- 3. BLOOD_REQUESTS — add missing columns
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE public.blood_requests ADD COLUMN title TEXT NOT NULL DEFAULT '';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blood_requests ADD COLUMN description TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blood_requests ADD COLUMN request_type TEXT NOT NULL DEFAULT 'standard';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blood_requests ADD COLUMN urgency TEXT NOT NULL DEFAULT 'normal';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blood_requests ADD COLUMN facility_name TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blood_requests ADD COLUMN facility_address TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blood_requests ADD COLUMN community_id UUID REFERENCES communities(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blood_requests ADD COLUMN organization_id UUID REFERENCES organizations(id);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blood_requests ADD COLUMN safety_acknowledged BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blood_requests ADD COLUMN is_verified BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
