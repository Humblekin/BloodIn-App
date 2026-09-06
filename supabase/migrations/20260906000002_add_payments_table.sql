-- Migration: Add payments table for recording Paystack transactions
-- Idempotent and safe to run multiple times.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    CREATE TABLE public.payments (
      id bigserial PRIMARY KEY,
      user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      reference text UNIQUE NOT NULL,
      amount integer NOT NULL,
      currency text NOT NULL DEFAULT 'NGN',
      status text NOT NULL DEFAULT 'pending',
      raw_response jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  END IF;
END $$;
