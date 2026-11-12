-- BloodIn — Enforce the minimum interval between donations
--
-- Ghana's National Blood Service uses a 3-month minimum. The interval is
-- stored in donation_programme_settings so it can be changed without a
-- redeploy, and recording is blocked until the interval has passed.

ALTER TABLE public.donation_programme_settings
  ADD COLUMN IF NOT EXISTS min_interval_months INTEGER NOT NULL DEFAULT 3
    CHECK (min_interval_months BETWEEN 0 AND 24);

CREATE OR REPLACE FUNCTION public.recognize_donation(
  p_donor_code TEXT,
  p_organization_id UUID,
  p_method TEXT DEFAULT 'code',
  p_notes TEXT DEFAULT NULL
)
RETURNS SETOF public.donation_recognitions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_donor UUID;
  v_org_type TEXT;
  v_source TEXT;
  v_method TEXT;
  v_location TEXT;
  v_id UUID;
  v_min_interval INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_record_for_organization(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only verified health workers can record donations';
  END IF;

  IF p_donor_code IS NULL OR length(btrim(p_donor_code)) < 6 THEN
    RAISE EXCEPTION 'Enter the card code shown on the donor''s card';
  END IF;

  v_method := lower(btrim(COALESCE(p_method, 'code')));
  IF v_method NOT IN ('qr', 'code') THEN
    RAISE EXCEPTION 'Recording method must be qr or code';
  END IF;

  SELECT o.org_type, o.name
  INTO v_org_type, v_location
  FROM public.organizations o
  WHERE o.id = p_organization_id;

  v_source := CASE WHEN v_org_type = 'ngo' THEN 'drive' ELSE 'facility' END;

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
      AND r.donation_date = CURRENT_DATE
  ) THEN
    RAISE EXCEPTION 'A donation was already recognised for this donor today';
  END IF;

  SELECT COALESCE(s.min_interval_months, 3)
  INTO v_min_interval
  FROM public.donation_programme_settings s
  WHERE s.id = true;

  v_min_interval := COALESCE(v_min_interval, 3);

  IF v_min_interval > 0 AND EXISTS (
    SELECT 1
    FROM public.donation_recognitions r
    WHERE r.donor_id = v_donor
      AND r.donation_date > CURRENT_DATE - make_interval(months => v_min_interval)
  ) THEN
    RAISE EXCEPTION
      'This donor donated less than % months ago. The minimum interval is % months.',
      v_min_interval, v_min_interval;
  END IF;

  v_id := gen_random_uuid();
  INSERT INTO public.donation_recognitions (
    id,
    donor_id,
    recognised_by,
    donation_date,
    location_label,
    notes,
    organization_id,
    source,
    method
  )
  VALUES (
    v_id,
    v_donor,
    auth.uid(),
    CURRENT_DATE,
    v_location,
    NULLIF(btrim(COALESCE(p_notes, '')), ''),
    p_organization_id,
    v_source,
    v_method
  );

  RETURN QUERY
  SELECT *
  FROM public.donation_recognitions r
  WHERE r.id = v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.recognize_donation(TEXT, UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recognize_donation(TEXT, UUID, TEXT, TEXT) TO authenticated;
