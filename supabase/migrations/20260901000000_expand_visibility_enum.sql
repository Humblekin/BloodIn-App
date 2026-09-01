-- Migration: Expand visibility_level enum to match the app's privacy options.
--
-- The original enum only allowed ('public','connections','private','city'), but
-- the three privacy columns use distinct, richer semantics:
--   blood_group_visibility: public | connections | matching_only | private
--   location_visibility:    country | region | city | approximate | private
--   messaging_permission:   everyone | connections | requests_only | nobody
--
-- We add the union of all these values to the single shared enum. Idempotent
-- and safe to re-run on PostgreSQL 16+.

DO $$ BEGIN
  ALTER TYPE visibility_level ADD VALUE IF NOT EXISTS 'matching_only';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE visibility_level ADD VALUE IF NOT EXISTS 'country';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE visibility_level ADD VALUE IF NOT EXISTS 'region';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE visibility_level ADD VALUE IF NOT EXISTS 'approximate';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE visibility_level ADD VALUE IF NOT EXISTS 'everyone';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE visibility_level ADD VALUE IF NOT EXISTS 'requests_only';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE visibility_level ADD VALUE IF NOT EXISTS 'nobody';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
