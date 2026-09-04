-- Migration: Apply connection_status value updates
-- Run this after 20260831000002_fix_schema_mismatches.sql has been applied.
-- This must run in a separate transaction/session so the new enum values
-- are available for use.

-- Update existing rows to map old values to the new enum variants.
UPDATE public.connections SET status = 'declined' WHERE status = 'rejected';
UPDATE public.connections SET status = 'cancelled' WHERE status = 'blocked';
