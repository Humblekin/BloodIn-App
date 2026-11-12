-- Authenticated users may create their own membership row when joining.
-- The BEFORE INSERT trigger enforces the organization join policy and downgrades
-- self-submitted memberships to staff with the appropriate pending/active status.
DROP POLICY IF EXISTS "Users can join organizations" ON public.organization_members;
CREATE POLICY "Users can join organizations"
  ON public.organization_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
