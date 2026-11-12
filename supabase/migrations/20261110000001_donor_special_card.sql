-- BloodIn — Special donor card, programme settings, and facility benefits
--
-- The donor keeps a single card code (donation_program_members). A hospital or
-- blood bank leader approves the donor once the global donation threshold is
-- met, and BloodIn issues the special card with the approving facility stored.

CREATE TABLE IF NOT EXISTS public.donation_programme_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  levels JSONB NOT NULL DEFAULT '[
    {"level": 1, "min_donations": 3, "label": "Level 1"},
    {"level": 2, "min_donations": 6, "label": "Level 2"},
    {"level": 3, "min_donations": 10, "label": "Level 3"},
    {"level": 4, "min_donations": 20, "label": "Level 4"}
  ]'::jsonb,
  card_expires BOOLEAN NOT NULL DEFAULT false,
  review_interval_months INTEGER NOT NULL DEFAULT 12,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.donation_programme_settings (id)
VALUES (true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.facility_donor_benefits (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  free_blood_enabled BOOLEAN NOT NULL DEFAULT false,
  terms TEXT,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.donor_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active', 'suspended', 'revoked', 'expired'
  )),
  approved_by_organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  terms_version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS donor_cards_approved_org_idx
  ON public.donor_cards (approved_by_organization_id);

ALTER TABLE public.donation_programme_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_donor_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.donor_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read programme settings" ON public.donation_programme_settings;
CREATE POLICY "Authenticated can read programme settings"
  ON public.donation_programme_settings FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated can read facility benefits" ON public.facility_donor_benefits;
CREATE POLICY "Authenticated can read facility benefits"
  ON public.facility_donor_benefits FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Organization leaders manage facility benefits" ON public.facility_donor_benefits;
CREATE POLICY "Organization leaders manage facility benefits"
  ON public.facility_donor_benefits FOR ALL
  TO authenticated
  USING (public.is_organization_leader(organization_id, auth.uid()))
  WITH CHECK (public.is_organization_leader(organization_id, auth.uid()));

DROP POLICY IF EXISTS "Users read own donor card" ON public.donor_cards;
CREATE POLICY "Users read own donor card"
  ON public.donor_cards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Organization leaders read approved donor cards" ON public.donor_cards;
CREATE POLICY "Organization leaders read approved donor cards"
  ON public.donor_cards FOR SELECT
  TO authenticated
  USING (
    approved_by_organization_id IS NOT NULL
    AND public.is_organization_leader(approved_by_organization_id, auth.uid())
  );

CREATE OR REPLACE FUNCTION public.issue_donor_card(
  p_donor_code TEXT,
  p_organization_id UUID
)
RETURNS SETOF public.donor_cards
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_donor UUID;
  v_org_type TEXT;
  v_verification TEXT;
  v_count INTEGER;
  v_level INTEGER;
  v_levels JSONB;
  v_expires_enabled BOOLEAN;
  v_review_months INTEGER;
  v_expires TIMESTAMPTZ;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_organization_leader(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only hospital or blood bank leaders can approve donor cards';
  END IF;

  SELECT o.org_type, o.verification_level
  INTO v_org_type, v_verification
  FROM public.organizations o
  WHERE o.id = p_organization_id
    AND o.is_active = true;

  IF v_org_type IS NULL THEN
    RAISE EXCEPTION 'Facility not found';
  END IF;

  IF v_org_type NOT IN ('hospital', 'blood_bank') THEN
    RAISE EXCEPTION 'Only hospitals and blood banks can approve donor cards';
  END IF;

  IF v_verification NOT IN ('verified', 'premium') THEN
    RAISE EXCEPTION 'The facility must be verified before approving donor cards';
  END IF;

  SELECT m.user_id INTO v_donor
  FROM public.donation_program_members m
  WHERE m.member_code = upper(btrim(p_donor_code))
    AND m.is_active;

  IF v_donor IS NULL THEN
    RAISE EXCEPTION 'Donor card not found or no longer active';
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.donation_recognitions r
  WHERE r.donor_id = v_donor;

  SELECT levels, card_expires, review_interval_months
  INTO v_levels, v_expires_enabled, v_review_months
  FROM public.donation_programme_settings
  WHERE id = true;

  v_levels := COALESCE(v_levels, '[]'::jsonb);

  SELECT (lvl->>'level')::INTEGER INTO v_level
  FROM jsonb_array_elements(v_levels) AS lvl
  WHERE v_count >= COALESCE((lvl->>'min_donations')::INTEGER, 0)
  ORDER BY COALESCE((lvl->>'min_donations')::INTEGER, 0) DESC
  LIMIT 1;

  IF v_level IS NULL THEN
    RAISE EXCEPTION 'This donor has not reached the first card level yet';
  END IF;

  v_expires := CASE
    WHEN v_expires_enabled THEN now() + make_interval(months => v_review_months)
    ELSE NULL
  END;

  INSERT INTO public.donor_cards (
    user_id,
    level,
    status,
    approved_by_organization_id,
    approved_by_user_id,
    issued_at,
    expires_at
  )
  VALUES (
    v_donor,
    v_level,
    'active',
    p_organization_id,
    auth.uid(),
    now(),
    v_expires
  )
  ON CONFLICT (user_id) DO UPDATE SET
    level = EXCLUDED.level,
    status = 'active',
    approved_by_organization_id = EXCLUDED.approved_by_organization_id,
    approved_by_user_id = EXCLUDED.approved_by_user_id,
    expires_at = EXCLUDED.expires_at,
    updated_at = now();

  RETURN QUERY
  SELECT *
  FROM public.donor_cards c
  WHERE c.user_id = v_donor;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_donor_card(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_donor_card(TEXT, UUID) TO authenticated;
