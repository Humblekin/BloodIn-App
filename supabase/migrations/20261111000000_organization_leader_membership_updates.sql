-- Allow organization leaders to manage other members from the app and staff
-- portal. The existing update trigger remains authoritative for role/status
-- transitions and prevents admins from managing owners.

DROP POLICY IF EXISTS "Organization leaders can manage memberships"
  ON public.organization_members;

CREATE POLICY "Organization leaders can manage memberships"
  ON public.organization_members FOR UPDATE
  USING (
    public.is_organization_leader(organization_id, auth.uid())
    AND user_id <> auth.uid()
  )
  WITH CHECK (
    public.is_organization_leader(organization_id, auth.uid())
  );
