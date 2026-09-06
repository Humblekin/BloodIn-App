-- ================================================================
-- BloodLink — Consolidated Runtime Repair Migration
-- Fixes the runtime bugs found during the EAS rebuild audit:
--   1. RLS infinite recursion (42P17) on community_members,
--      community_announcements and organization_members.
--   2. PostgREST profile embeds broken because FKs pointed at
--      auth.users(id) instead of public.profiles(id).
--   3. connections INSERT policy blocked the receiver from accepting
--      a connection request.
--   4. find_nearby_users lost its auth guard (security regression).
--   5. payments table (committed migration was never applied).
--
-- Idempotent: DROP..IF EXISTS / CREATE OR REPLACE everywhere so this
-- can be run at any point, even if the earlier 20260904000000 /
-- 20260904000001 fixes were already applied.
-- ================================================================

-- ═══════════════════════════════════════════════════════════
-- 1. SECURITY DEFINER HELPERS
-- Bypass RLS so policies can check membership without recursion.
-- ═══════════════════════════════════════════════════════════

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

CREATE OR REPLACE FUNCTION public.is_organization_member(
  target_organization_id UUID,
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
    FROM public.organization_members
    WHERE organization_id = target_organization_id
      AND user_id = target_user_id
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_organization_leader(
  target_organization_id UUID,
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
    FROM public.organization_members
    WHERE organization_id = target_organization_id
      AND user_id = target_user_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  );
$$;

-- ═══════════════════════════════════════════════════════════
-- 2. REPOINT FOREIGN KEYS TO public.profiles
-- profiles.id is 1:1 with auth.users.id, so existing rows stay valid.
-- PostgREST can then embed profiles for the *!<table>_<col>_fkey joins
-- used by the client services.
-- ═══════════════════════════════════════════════════════════

-- messages.sender_id
ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id);

-- request_responses.responder_id
ALTER TABLE public.request_responses
  DROP CONSTRAINT IF EXISTS request_responses_responder_id_fkey;
ALTER TABLE public.request_responses
  ADD CONSTRAINT request_responses_responder_id_fkey
  FOREIGN KEY (responder_id) REFERENCES public.profiles(id);

-- conversation_participants.user_id
ALTER TABLE public.conversation_participants
  DROP CONSTRAINT IF EXISTS conversation_participants_user_id_fkey;
ALTER TABLE public.conversation_participants
  ADD CONSTRAINT conversation_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- community_members.user_id
ALTER TABLE public.community_members
  DROP CONSTRAINT IF EXISTS community_members_user_id_fkey;
ALTER TABLE public.community_members
  ADD CONSTRAINT community_members_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- campaign_participants.user_id
ALTER TABLE public.campaign_participants
  DROP CONSTRAINT IF EXISTS campaign_participants_user_id_fkey;
ALTER TABLE public.campaign_participants
  ADD CONSTRAINT campaign_participants_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- community_announcements.author_id
DO $$
BEGIN
  ALTER TABLE public.community_announcements
    DROP CONSTRAINT IF EXISTS community_announcements_author_id_fkey;

  ALTER TABLE public.community_announcements
    ADD CONSTRAINT community_announcements_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 3. COMMUNITIES: replace recursive RLS policies
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Members can view memberships" ON public.community_members;
DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
DROP POLICY IF EXISTS "Admins can manage members" ON public.community_members;

CREATE POLICY "Members can view memberships"
  ON public.community_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_community_moderator(community_id)
  );

CREATE POLICY "Users can join communities"
  ON public.community_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage members"
  ON public.community_members FOR UPDATE
  USING (public.is_community_moderator(community_id, auth.uid()));

DROP POLICY IF EXISTS "Members can view announcements" ON public.community_announcements;
DROP POLICY IF EXISTS "Admins and mods can post announcements" ON public.community_announcements;

CREATE POLICY "Members can view announcements"
  ON public.community_announcements FOR SELECT
  USING (public.is_community_member(community_id));

CREATE POLICY "Admins and mods can post announcements"
  ON public.community_announcements FOR INSERT
  WITH CHECK (public.is_community_moderator(community_id));

-- ═══════════════════════════════════════════════════════════
-- 4. ORGANIZATIONS: replace recursive RLS policies
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Members can view org memberships" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage org members" ON public.organization_members;

CREATE POLICY "Members can view org memberships"
  ON public.organization_members FOR SELECT
  USING (
    auth.uid() = user_id
    OR public.is_organization_leader(organization_id)
  );

CREATE POLICY "Owners can manage org members"
  ON public.organization_members FOR ALL
  USING (public.is_organization_leader(organization_id, auth.uid()));

-- ═══════════════════════════════════════════════════════════
-- 5. CONNECTIONS: let the RECIPIENT insert the accepted pair
-- When a user accepts a request, the service inserts a row with
-- requester_id = sender and recipient_id = current user.
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can create connection requests" ON public.connections;

CREATE POLICY "Users can create connection requests"
  ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- ═══════════════════════════════════════════════════════════
-- 6. create_direct_conversation RPC
-- The conversation_participants INSERT policy is WITH CHECK
-- (user_id = auth.uid()), so a client can never insert the *other*
-- participant's row. This SECURITY DEFINER function does that safely.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_direct_conversation(user_a UUID, user_b UUID)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_id UUID;
  _conv_id UUID;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> user_a AND auth.uid() <> user_b) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Reuse an existing direct conversation for this pair, if any.
  SELECT cp1.conversation_id INTO _existing_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
  WHERE cp1.user_id = user_a
    AND cp2.user_id = user_b
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = cp1.conversation_id AND c.type = 'direct'
    )
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    RETURN _existing_id;
  END IF;

  INSERT INTO conversations (type) VALUES ('direct') RETURNING id INTO _conv_id;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (_conv_id, user_a);
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (_conv_id, user_b);
  RETURN _conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, uuid) TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- 6b. conversation participants must be visible to all members of
-- the conversation (not just their own row), or the Messages list
-- can never show the other participant's name/avatar.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  target_conversation_id UUID,
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
    FROM public.conversation_participants
    WHERE conversation_id = target_conversation_id
      AND user_id = target_user_id
  );
$$;

DROP POLICY IF EXISTS "Users see own participation" ON public.conversation_participants;

CREATE POLICY "Users see own participation"
  ON public.conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_conversation_participant(conversation_id, auth.uid())
  );

-- 6c. Campaigns: the campaign detail screen shows "N registered" from
-- campaign_participants, but the original policy (user_id = auth.uid())
-- only ever returned the viewer's own row, so the count was always 0
-- (or 1 after registering). Campaigns are public listings, so let any
-- authenticated user see participation.

DROP POLICY IF EXISTS "Users can view own participation" ON public.campaign_participants;
DROP POLICY IF EXISTS "Users can view participation" ON public.campaign_participants;

CREATE POLICY "Users can view participation"
  ON public.campaign_participants FOR SELECT
  USING (auth.role() = 'authenticated');

-- ═══════════════════════════════════════════════════════════
-- 7. find_nearby_users: restore the auth guard lost when the
-- premium migration recreated the function without it.
-- ═══════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.find_nearby_users(uuid, text, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.find_nearby_users(
    p_user_id UUID,
    p_blood_group TEXT DEFAULT NULL,
    p_radius_km INTEGER DEFAULT 25,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    blood_group TEXT,
    city_name TEXT,
    region_name TEXT,
    country_name TEXT,
    approximate_distance_km DOUBLE PRECISION,
    is_available BOOLEAN,
    is_connected BOOLEAN,
    is_premium BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to query another user''s location';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM user_locations
      WHERE user_id = p_user_id
        AND current_coordinates IS NOT NULL
    ) THEN
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.display_name,
        p.avatar_url,
        CASE
            WHEN ps.blood_group_visibility IN ('public')
            THEN p.blood_group::TEXT
            WHEN ps.blood_group_visibility = 'connections'
                AND EXISTS (
                    SELECT 1 FROM connections c
                    WHERE (c.requester_id = p_user_id AND c.recipient_id = p.id)
                       OR (c.recipient_id = p_user_id AND c.requester_id = p.id)
                )
            THEN p.blood_group::TEXT
            ELSE NULL
        END,
        ci.name,
        r.name,
        co.name,
        ROUND(
            ST_Distance(
                ul.current_coordinates,
                (SELECT current_coordinates FROM user_locations WHERE user_locations.user_id = p_user_id)
            ) / 1000.0
        )::DOUBLE PRECISION,
        COALESCE(p.is_available, false),
        EXISTS (
            SELECT 1 FROM connections c
            WHERE (c.requester_id = p_user_id AND c.recipient_id = p.id AND c.status = 'accepted')
               OR (c.recipient_id = p_user_id AND c.requester_id = p.id AND c.status = 'accepted')
        ),
        COALESCE(p.is_premium, false)
    FROM profiles p
    JOIN privacy_settings ps ON ps.user_id = p.id
    JOIN user_locations ul ON ul.user_id = p.id
    LEFT JOIN cities ci ON ci.id = COALESCE(ul.current_city_id, ul.home_city_id)
    LEFT JOIN regions r ON r.id = COALESCE(ul.current_region_id, ul.home_region_id)
    LEFT JOIN countries co ON co.id = COALESCE(ul.current_country_id, ul.home_country_id)
    WHERE p.id != p_user_id
      AND ps.show_in_discovery = true
      AND ps.show_in_orbit = true
      AND ul.current_coordinates IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM user_blocks ub
          WHERE (ub.blocker_id = p_user_id AND ub.blocked_id = p.id)
             OR (ub.blocker_id = p.id AND ub.blocked_id = p_user_id)
      )
      AND (p_blood_group IS NULL OR p.blood_group::TEXT = p_blood_group)
      AND ST_DWithin(
          ul.current_coordinates,
          (SELECT current_coordinates FROM user_locations WHERE user_locations.user_id = p_user_id),
          p_radius_km * 1000
      )
    ORDER BY approximate_distance_km ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_nearby_users(uuid, text, integer, integer, integer) TO authenticated;

-- ═══════════════════════════════════════════════════════════
-- 8. payments table (idempotent version of 20260905)
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'payments'
  ) THEN
    CREATE TABLE public.payments (
      id bigserial PRIMARY KEY,
      user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
      reference text UNIQUE NOT NULL,
      amount integer NOT NULL,
      currency text NOT NULL DEFAULT 'NGN',
      status text NOT NULL DEFAULT 'pending',
      raw_response jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

    CREATE POLICY "Users can create own payments"
      ON public.payments FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Users can view own payments"
      ON public.payments FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════
-- 9. AVATAR STORAGE
-- Keep profile image uploads working when this consolidated repair
-- migration is applied without the earlier storage migration.
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );