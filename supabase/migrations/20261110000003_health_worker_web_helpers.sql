-- BloodIn — Health worker web helpers
--
-- Read helpers used by the health worker web app: look up a donor card before
-- recording, and list today's records for the selected facility.

CREATE OR REPLACE FUNCTION public.lookup_donor_for_recording(
  p_donor_code TEXT,
  p_organization_id UUID
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  blood_group TEXT,
  member_code TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_record_for_organization(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only verified health workers can look up donor cards';
  END IF;

  RETURN QUERY
  SELECT m.user_id, p.display_name, p.blood_group::TEXT, m.member_code, m.is_active
  FROM public.donation_program_members m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.member_code = upper(btrim(p_donor_code))
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.organization_donations_today(p_organization_id UUID)
RETURNS TABLE (
  id UUID,
  donor_id UUID,
  donor_name TEXT,
  blood_group TEXT,
  donation_date DATE,
  created_at TIMESTAMPTZ,
  source TEXT,
  method TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_record_for_organization(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only verified health workers can view donation records';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.donor_id,
    p.display_name,
    p.blood_group::TEXT,
    r.donation_date,
    r.created_at,
    r.source,
    r.method
  FROM public.donation_recognitions r
  JOIN public.profiles p ON p.id = r.donor_id
  WHERE r.organization_id = p_organization_id
    AND r.donation_date = CURRENT_DATE
  ORDER BY r.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_donor_for_recording(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_donor_for_recording(TEXT, UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.organization_donations_today(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.organization_donations_today(UUID) TO authenticated;
