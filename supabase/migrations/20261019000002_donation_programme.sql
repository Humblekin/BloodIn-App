-- BloodIn — Donate programme: opt-in donor card + recognition ledger
--
-- Design:
--   * donation_program_members — a user opts in and receives a unique,
--     shareable card code (rendered as a QR on the in-app donor card).
--   * donation_recognitions   — append-only ledger; a verifier at a drive
--     records a donation for a donor by entering the donor's card code.
--   * All writes go through SECURITY DEFINER RPCs. RLS allows members to
--     read their own card and donors/verifiers to read their ledger rows,
--     and nothing else — clients cannot forge recognitions directly.

CREATE TABLE IF NOT EXISTS public.donation_program_members (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    member_code TEXT NOT NULL UNIQUE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.donation_recognitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recognised_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    donation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    location_label TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT donation_recognitions_donor_date_unique UNIQUE (donor_id, donation_date)
);

CREATE INDEX IF NOT EXISTS donation_recognitions_donor_id_idx
    ON public.donation_recognitions (donor_id);
CREATE INDEX IF NOT EXISTS donation_recognitions_recognised_by_idx
    ON public.donation_recognitions (recognised_by);

-- ──────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE public.donation_program_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donation_recognitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS members_select_own ON public.donation_program_members;
CREATE POLICY members_select_own ON public.donation_program_members
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS recognitions_select_own ON public.donation_recognitions;
CREATE POLICY recognitions_select_own ON public.donation_recognitions
    FOR SELECT TO authenticated
    USING (donor_id = auth.uid() OR recognised_by = auth.uid());

-- No INSERT/UPDATE/DELETE policies on either table: writes only happen
-- through the SECURITY DEFINER functions below.

-- ──────────────────────────────────────────────────────────────────────────
-- join_donation_programme — opt in, receive (or reuse) a card code
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.join_donation_programme()
RETURNS TABLE (
    user_id UUID,
    member_code TEXT,
    joined_at TIMESTAMPTZ,
    is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user UUID;
    v_code TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    v_user := auth.uid();
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text || v_user::text), 1, 12));

    INSERT INTO public.donation_program_members (user_id, member_code)
    VALUES (v_user, v_code)
    ON CONFLICT (user_id) DO UPDATE SET
        is_active = true,
        updated_at = now();

    RETURN QUERY
    SELECT m.user_id, m.member_code, m.joined_at, m.is_active
    FROM public.donation_program_members m
    WHERE m.user_id = v_user;
END;
$$;

REVOKE ALL ON FUNCTION public.join_donation_programme() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_donation_programme() TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- leave_donation_programme — deactivate the card (history is retained)
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.leave_donation_programme()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE public.donation_program_members
    SET is_active = false,
        updated_at = now()
    WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.leave_donation_programme() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.leave_donation_programme() TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- recognize_donation — verifier records a donation for a donor card code
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.recognize_donation(
    p_donor_code TEXT,
    p_donation_date DATE DEFAULT CURRENT_DATE,
    p_location_label TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    donor_id UUID,
    donation_date DATE,
    recognised_by UUID,
    location_label TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_donor UUID;
    v_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_donor_code IS NULL OR length(btrim(p_donor_code)) < 6 THEN
        RAISE EXCEPTION 'Enter the card code shown on the donor''s card';
    END IF;

    IF p_donation_date IS NULL OR p_donation_date > CURRENT_DATE THEN
        RAISE EXCEPTION 'Donation date cannot be in the future';
    END IF;

    IF p_donation_date < (CURRENT_DATE - INTERVAL '5 years') THEN
        RAISE EXCEPTION 'Donation date is too far in the past';
    END IF;

    SELECT m.user_id INTO v_donor
    FROM public.donation_program_members m
    WHERE m.member_code = upper(btrim(p_donor_code))
      AND m.is_active;

    IF v_donor IS NULL THEN
        RAISE EXCEPTION 'Donor card not found or no longer active';
    END IF;

    IF v_donor = auth.uid() THEN
        RAISE EXCEPTION 'You cannot recognise your own donation';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM public.donation_recognitions r
        WHERE r.donor_id = v_donor
          AND r.donation_date = p_donation_date
    ) THEN
        RAISE EXCEPTION 'A donation was already recognised for this donor on %',
            to_char(p_donation_date, 'YYYY-MM-DD');
    END IF;

    v_id := gen_random_uuid();
    INSERT INTO public.donation_recognitions (id, donor_id, recognised_by, donation_date, location_label, notes)
    VALUES (
        v_id,
        v_donor,
        auth.uid(),
        p_donation_date,
        NULLIF(btrim(COALESCE(p_location_label, '')), ''),
        NULLIF(btrim(COALESCE(p_notes, '')), '')
    );

    RETURN QUERY
    SELECT r.id, r.donor_id, r.donation_date, r.recognised_by, r.location_label, r.created_at
    FROM public.donation_recognitions r
    WHERE r.id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recognize_donation(TEXT, DATE, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recognize_donation(TEXT, DATE, TEXT, TEXT) TO authenticated;
