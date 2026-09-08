-- BloodLink - Align app write policies with service behavior.
-- This migration is safe to apply after the existing migration chain.

-- Active community members can read the active roster. A user can still
-- read their own pending/left membership so join/leave state remains usable.
DROP POLICY IF EXISTS "Members can view memberships" ON public.community_members;
CREATE POLICY "Members can view memberships"
    ON public.community_members FOR SELECT
    USING (
        auth.uid() = user_id
        OR public.is_community_member(community_id, auth.uid())
    );

-- Members may leave their own community, while moderators retain member
-- management capabilities. The self policy prevents changing role/status to
-- anything other than leaving.
DROP POLICY IF EXISTS "Admins can manage members" ON public.community_members;
DROP POLICY IF EXISTS "Members can leave communities" ON public.community_members;
CREATE POLICY "Members can leave communities"
    ON public.community_members FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id AND status = 'left');

CREATE POLICY "Admins can manage members"
    ON public.community_members FOR UPDATE
    USING (public.is_community_moderator(community_id, auth.uid()))
    WITH CHECK (public.is_community_moderator(community_id, auth.uid()));

-- The message service updates this timestamp after every successful message.
DROP POLICY IF EXISTS "Users can update conversation timestamps" ON public.conversations;
CREATE POLICY "Users can update conversation timestamps"
    ON public.conversations FOR UPDATE
    USING (
        id IN (
            SELECT conversation_id
            FROM public.conversation_participants
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        id IN (
            SELECT conversation_id
            FROM public.conversation_participants
            WHERE user_id = auth.uid()
        )
    );

-- Announcements must be attributed to the authenticated moderator who creates
-- them; the client still supplies the field as part of its existing payload.
DROP POLICY IF EXISTS "Admins and mods can post announcements" ON public.community_announcements;
CREATE POLICY "Admins and mods can post announcements"
    ON public.community_announcements FOR INSERT
    WITH CHECK (
        author_id = auth.uid()
        AND public.is_community_moderator(community_id, auth.uid())
    );
