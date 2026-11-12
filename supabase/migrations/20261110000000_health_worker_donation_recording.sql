-- BloodIn — Restrict donation recording to named, verified health workers
--
-- A donation may only be recorded by an active staff member of an active,
-- verified hospital, blood bank, or NGO who has been granted the
-- can_record_donations permission. Records are tied to the organization and
-- the staff member, and may only be created for today.

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS can_record_donations BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.donation_recognitions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source TEXT CHECK (source IN ('facility', 'drive')),
  ADD COLUMN IF NOT EXISTS method TEXT CHECK (method IN ('qr', 'code'));

CREATE INDEX IF NOT EXISTS donation_recognitions_organization_id_idx
  ON public.donation_recognitions (organization_id);

CREATE OR REPLACE FUNCTION public.can_record_for_organization(
  p_organization_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    JOIN public.organizations o ON o.id = m.organization_id
    WHERE m.organization_id = p_organization_id
      AND m.user_id = p_user_id
      AND m.status = 'active'
      AND m.can_record_donations = true
      AND o.is_active = true
      AND o.org_type IN ('hospital', 'blood_bank', 'ngo')
      AND o.verification_level IN ('verified', 'premium')
  );
$$;

CREATE OR REPLACE FUNCTION public.my_recording_organizations()
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  org_type TEXT,
  verification_level TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id, o.name, o.org_type, o.verification_level
  FROM public.organization_members m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.user_id = auth.uid()
    AND m.status = 'active'
    AND m.can_record_donations = true
    AND o.is_active = true
    AND o.org_type IN ('hospital', 'blood_bank', 'ngo')
    AND o.verification_level IN ('verified', 'premium')
  ORDER BY o.name;
$$;

CREATE OR REPLACE FUNCTION public.set_organization_recorder(
  p_organization_id UUID,
  p_user_id UUID,
  p_can_record BOOLEAN
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_organization_leader(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only organization leaders can manage donation recorders';
  END IF;

  UPDATE public.organization_members
  SET can_record_donations = p_can_record
  WHERE organization_id = p_organization_id
    AND user_id = p_user_id
    AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'That person is not an active member of this organization';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.recognize_donation(TEXT, DATE, TEXT, TEXT);

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

REVOKE ALL ON FUNCTION public.my_recording_organizations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_recording_organizations() TO authenticated;

REVOKE ALL ON FUNCTION public.set_organization_recorder(UUID, UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_organization_recorder(UUID, UUID, BOOLEAN) TO authenticated;

REVOKE ALL ON FUNCTION public.can_record_for_organization(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_record_for_organization(UUID, UUID) TO authenticated;
