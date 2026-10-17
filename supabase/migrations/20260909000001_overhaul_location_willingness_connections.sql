-- ================================================================
-- BloodIn — Overhaul Location, Orbit, Donation Willingness & Connection Chat
-- Migration: 20260909000001_overhaul_location_willingness_connections.sql
-- ================================================================

-- 1. ADD DONATION WILLINGNESS TO PROFILES
-- Valid states: 'willing', 'not_willing', 'unspecified'
-- Default for all existing and new accounts is 'unspecified'
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS donation_willingness TEXT NOT NULL DEFAULT 'unspecified';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'profiles_donation_willingness_check'
    ) THEN
        ALTER TABLE public.profiles
        ADD CONSTRAINT profiles_donation_willingness_check
        CHECK (donation_willingness IN ('willing', 'not_willing', 'unspecified'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_donation_willingness
ON public.profiles(donation_willingness);


-- 2. HARDEN CONNECTIONS TABLE CONSTRAINTS
-- Prevent users from connecting to themselves
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'connections_no_self_connect'
    ) THEN
        ALTER TABLE public.connections
        ADD CONSTRAINT connections_no_self_connect
        CHECK (requester_id <> recipient_id);
    END IF;
END $$;

-- Prevent duplicate active (pending or accepted) connection requests between the same two users
CREATE UNIQUE INDEX IF NOT EXISTS idx_connections_active_unique_pair
ON public.connections (
    LEAST(requester_id, recipient_id),
    GREATEST(requester_id, recipient_id)
)
WHERE status IN ('pending', 'accepted');


-- 3. RLS POLICIES FOR CONNECTIONS
-- Ensure that sender creates as 'pending', recipient is the only one who can accept/reject,
-- and sender cannot arbitrarily promote status to 'accepted'.
DROP POLICY IF EXISTS "Users can view own connections" ON public.connections;
CREATE POLICY "Users can view own connections"
    ON public.connections FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can create connection requests" ON public.connections;
CREATE POLICY "Users can create connection requests"
    ON public.connections FOR INSERT
    WITH CHECK (
        auth.uid() = requester_id
        AND requester_id <> recipient_id
        AND status = 'pending'
    );

DROP POLICY IF EXISTS "Users can update own connections" ON public.connections;
CREATE POLICY "Users can update own connections"
    ON public.connections FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = recipient_id)
    WITH CHECK (
        -- Only recipient can accept or reject a request
        (auth.uid() = recipient_id AND status IN ('accepted', 'rejected', 'declined'))
        -- Or requester can cancel their pending request
        OR (auth.uid() = requester_id AND status = 'cancelled')
    );


-- 4. HARDEN CREATE_DIRECT_CONVERSATION RPC
-- Enforces that two users must have an 'accepted' connection and neither has blocked the other.
CREATE OR REPLACE FUNCTION public.create_direct_conversation(user_a UUID, user_b UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _existing_id UUID;
    _conv_id UUID;
    _is_connected BOOLEAN;
    _is_blocked BOOLEAN;
BEGIN
    IF auth.uid() IS NULL OR (auth.uid() <> user_a AND auth.uid() <> user_b) THEN
        RAISE EXCEPTION 'Not authorized to create this conversation';
    END IF;

    IF user_a = user_b THEN
        RAISE EXCEPTION 'Cannot start a conversation with yourself';
    END IF;

    -- Check if either user has blocked the other
    SELECT EXISTS (
        SELECT 1 FROM public.user_blocks
        WHERE (blocker_id = user_a AND blocked_id = user_b)
           OR (blocker_id = user_b AND blocked_id = user_a)
    ) INTO _is_blocked;

    IF _is_blocked THEN
        RAISE EXCEPTION 'Cannot start a conversation with a blocked user';
    END IF;

    -- Enforce accepted connection between the two users
    SELECT EXISTS (
        SELECT 1 FROM public.connections
        WHERE ((requester_id = user_a AND recipient_id = user_b)
           OR (requester_id = user_b AND recipient_id = user_a))
          AND status = 'accepted'
    ) INTO _is_connected;

    -- Also check legacy connection_requests table if used
    IF NOT _is_connected THEN
        SELECT EXISTS (
            SELECT 1 FROM public.connection_requests
            WHERE ((sender_id = user_a AND receiver_id = user_b)
               OR (sender_id = user_b AND receiver_id = user_a))
              AND status = 'accepted'
        ) INTO _is_connected;
    END IF;

    IF NOT _is_connected THEN
        RAISE EXCEPTION 'Connection request must be accepted before starting a conversation';
    END IF;

    -- Check if a direct conversation already exists between these two users
    SELECT cp1.conversation_id INTO _existing_id
    FROM public.conversation_participants cp1
    JOIN public.conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
    JOIN public.conversations c ON c.id = cp1.conversation_id
    WHERE cp1.user_id = user_a
      AND cp2.user_id = user_b
      AND c.type = 'direct'
    LIMIT 1;

    IF _existing_id IS NOT NULL THEN
        RETURN _existing_id;
    END IF;

    -- Create conversation record and add participants
    INSERT INTO public.conversations (type) VALUES ('direct') RETURNING id INTO _conv_id;
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (_conv_id, user_a);
    INSERT INTO public.conversation_participants (conversation_id, user_id) VALUES (_conv_id, user_b);

    RETURN _conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_direct_conversation(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(UUID, UUID) TO authenticated;


-- 5. FUNCTION TO VALIDATE DIRECT MESSAGING PERMISSIONS
CREATE OR REPLACE FUNCTION public.can_participate_in_conversation(target_conv_id UUID, target_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    _conv_type TEXT;
    _other_user_id UUID;
BEGIN
    IF target_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT type INTO _conv_type
    FROM public.conversations
    WHERE id = target_conv_id;

    IF _conv_type IS NULL THEN
        RETURN FALSE;
    END IF;

    -- User must be a participant in the conversation
    IF NOT EXISTS (
        SELECT 1 FROM public.conversation_participants
        WHERE conversation_id = target_conv_id AND user_id = target_user_id
    ) THEN
        RETURN FALSE;
    END IF;

    -- For direct conversations, check connection status and blocks
    IF _conv_type = 'direct' THEN
        SELECT user_id INTO _other_user_id
        FROM public.conversation_participants
        WHERE conversation_id = target_conv_id AND user_id <> target_user_id
        LIMIT 1;

        IF _other_user_id IS NOT NULL THEN
            -- Check if blocked
            IF EXISTS (
                SELECT 1 FROM public.user_blocks
                WHERE (blocker_id = target_user_id AND blocked_id = _other_user_id)
                   OR (blocker_id = _other_user_id AND blocked_id = target_user_id)
            ) THEN
                RETURN FALSE;
            END IF;

            -- Check accepted connection
            IF NOT EXISTS (
                SELECT 1 FROM public.connections
                WHERE ((requester_id = target_user_id AND recipient_id = _other_user_id)
                   OR (requester_id = _other_user_id AND recipient_id = target_user_id))
                  AND status = 'accepted'
            ) AND NOT EXISTS (
                SELECT 1 FROM public.connection_requests
                WHERE ((sender_id = target_user_id AND receiver_id = _other_user_id)
                   OR (sender_id = _other_user_id AND receiver_id = target_user_id))
                  AND status = 'accepted'
            ) THEN
                RETURN FALSE;
            END IF;
        END IF;
    END IF;

    RETURN TRUE;
END;
$$;


-- 6. SECURE RLS POLICIES FOR MESSAGES
DROP POLICY IF EXISTS "Users read messages in their conversations" ON public.messages;
CREATE POLICY "Users read messages in their conversations"
    ON public.messages FOR SELECT
    USING (public.can_participate_in_conversation(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users send messages to their conversations" ON public.messages;
CREATE POLICY "Users send messages to their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND public.can_participate_in_conversation(conversation_id, auth.uid())
    );


-- 7. REPAIR AND UPGRADE FIND_NEARBY_USERS RPC
-- Real geographical distance (not rough integer rounding to 0),
-- correct ascending sort by distance,
-- donation willingness filter and metadata,
-- stable secondary sorting by id.
CREATE OR REPLACE FUNCTION public.find_nearby_users(
    p_user_id UUID,
    p_blood_group TEXT DEFAULT NULL,
    p_radius_km INTEGER DEFAULT 25,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_willing_only BOOLEAN DEFAULT FALSE
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
    is_premium BOOLEAN,
    donation_willingness TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to query another user''s location';
    END IF;

    -- Ensure caller has a valid geographic location
    IF NOT EXISTS (
        SELECT 1
        FROM public.user_locations AS caller_location
        WHERE caller_location.user_id = p_user_id
          AND caller_location.current_coordinates IS NOT NULL
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.display_name,
        p.avatar_url,
        CASE
            WHEN ps.blood_group_visibility = 'public'
                THEN p.blood_group::TEXT
            WHEN ps.blood_group_visibility = 'connections'
                AND EXISTS (
                    SELECT 1
                    FROM public.connections c
                    WHERE ((c.requester_id = p_user_id AND c.recipient_id = p.id)
                       OR (c.recipient_id = p_user_id AND c.requester_id = p.id))
                      AND c.status = 'accepted'
                )
                THEN p.blood_group::TEXT
            ELSE NULL
        END,
        ci.name,
        r.name,
        co.name,
        -- Exact distance in kilometers rounded to 2 decimal places (never misleading 0 km for nonzero distances)
        ROUND(
            (ST_Distance(
                ul.current_coordinates,
                own_location.current_coordinates
            ) / 1000.0)::numeric,
            2
        )::DOUBLE PRECISION AS approximate_distance_km,
        COALESCE(p.is_available, false),
        EXISTS (
            SELECT 1
            FROM public.connections c
            WHERE ((c.requester_id = p_user_id AND c.recipient_id = p.id)
               OR (c.recipient_id = p_user_id AND c.requester_id = p.id))
              AND c.status = 'accepted'
        ),
        COALESCE(p.is_premium, false),
        COALESCE(p.donation_willingness, 'unspecified')
    FROM public.profiles p
    JOIN public.privacy_settings ps ON ps.user_id = p.id
    JOIN public.user_locations ul ON ul.user_id = p.id
    CROSS JOIN LATERAL (
        SELECT caller_location.current_coordinates
        FROM public.user_locations AS caller_location
        WHERE caller_location.user_id = p_user_id
    ) own_location
    LEFT JOIN public.cities ci ON ci.id = COALESCE(ul.current_city_id, ul.home_city_id)
    LEFT JOIN public.regions r ON r.id = COALESCE(ul.current_region_id, ul.home_region_id)
    LEFT JOIN public.countries co ON co.id = COALESCE(ul.current_country_id, ul.home_country_id)
    WHERE p.id <> p_user_id
      AND ps.show_in_discovery = true
      AND ps.show_in_orbit = true
      AND ul.current_coordinates IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.user_blocks ub
          WHERE (ub.blocker_id = p_user_id AND ub.blocked_id = p.id)
             OR (ub.blocker_id = p.id AND ub.blocked_id = p_user_id)
      )
      AND (p_blood_group IS NULL OR p.blood_group::TEXT = p_blood_group)
      AND (NOT p_willing_only OR p.donation_willingness = 'willing')
      AND ST_DWithin(
          ul.current_coordinates,
          own_location.current_coordinates,
          GREATEST(p_radius_km, 1) * 1000
      )
    -- Geographic order: strictly nearest first, stable secondary sort by UUID
    ORDER BY
        ST_Distance(ul.current_coordinates, own_location.current_coordinates) ASC,
        p.id ASC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

-- Drop the superseded 5-argument overload (pre-dates p_willing_only).
-- Leaving it in place creates an ambiguous PostgREST RPC overload.
DROP FUNCTION IF EXISTS public.find_nearby_users(UUID, TEXT, INTEGER, INTEGER, INTEGER);

REVOKE ALL ON FUNCTION public.find_nearby_users(UUID, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_users(UUID, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN) TO authenticated;
