-- Prevent recursive RLS evaluation on community_members.
-- The original policies queried community_members from inside community_members
-- policies, which causes PostgreSQL error 42P17.

CREATE OR REPLACE FUNCTION public.is_community_member(
  target_community_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE community_id = target_community_id
      AND user_id = target_user_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_community_moderator(
  target_community_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE community_id = target_community_id
      AND user_id = target_user_id
      AND role IN ('admin', 'moderator')
      AND status = 'active'
  );
$$;

DROP POLICY IF EXISTS "Members can view memberships" ON public.community_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.community_members;
DROP POLICY IF EXISTS "Members can view announcements" ON public.community_announcements;
DROP POLICY IF EXISTS "Admins and mods can post announcements" ON public.community_announcements;

CREATE POLICY "Members can view memberships"
  ON public.community_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_community_moderator(community_id)
  );

CREATE POLICY "Admins can manage members"
  ON public.community_members FOR UPDATE
  USING (public.is_community_moderator(community_id, auth.uid()));

CREATE POLICY "Members can view announcements"
  ON public.community_announcements FOR SELECT
  USING (public.is_community_member(community_id));

CREATE POLICY "Admins and mods can post announcements"
  ON public.community_announcements FOR INSERT
  WITH CHECK (public.is_community_moderator(community_id));
