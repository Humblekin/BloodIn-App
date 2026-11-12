-- BloodIn — Card approval helpers for the staff web app
--
-- Hospital and blood bank leaders approve a donor's special card. These
-- helpers list the facilities they can approve for and look up a donor by
-- card code, including their verified donation count.

CREATE OR REPLACE FUNCTION public.my_approval_organizations()
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
    AND m.role IN ('owner', 'admin')
    AND m.status = 'active'
    AND o.is_active = true
    AND o.org_type IN ('hospital', 'blood_bank')
    AND o.verification_level IN ('verified', 'premium')
  ORDER BY o.name;
$$;

CREATE OR REPLACE FUNCTION public.lookup_donor_for_card(
  p_donor_code TEXT,
  p_organization_id UUID
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  blood_group TEXT,
  member_code TEXT,
  is_active BOOLEAN,
  donation_count INTEGER
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

  IF NOT public.is_organization_leader(p_organization_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only hospital or blood bank leaders can approve donor cards';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE o.id = p_organization_id
      AND o.is_active = true
      AND o.org_type IN ('hospital', 'blood_bank')
      AND o.verification_level IN ('verified', 'premium')
  ) THEN
    RAISE EXCEPTION 'This facility cannot approve donor cards';
  END IF;

  RETURN QUERY
  SELECT
    m.user_id,
    p.display_name,
    p.blood_group::TEXT,
    m.member_code,
    m.is_active,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.donation_recognitions r
      WHERE r.donor_id = m.user_id
    )
  FROM public.donation_program_members m
  JOIN public.profiles p ON p.id = m.user_id
  WHERE m.member_code = upper(btrim(p_donor_code))
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.my_approval_organizations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_approval_organizations() TO authenticated;

REVOKE ALL ON FUNCTION public.lookup_donor_for_card(TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lookup_donor_for_card(TEXT, UUID) TO authenticated;
