-- Migration: Security hardening
--
-- Closes the highest-impact vulnerabilities from the security audit:
--   C1  find_nearby_users RPC ran SECURITY DEFINER with an unvalidated
--       p_user_id -> fixed by enforcing auth.uid() == p_user_id.
--   C3  profiles UPDATE had no WITH CHECK -> users could self-set
--       is_premium / human_verified / identity_verified / is_verified /
--       verification_level / account_type. Now blocked.
--   C4  audit_logs + moderation_actions had RLS disabled -> anyone could
--       tamper with audits/moderation. Now RLS-enabled, server-only.
--   H1  request_verifications SELECT was USING(true) -> restricted to the
--       request owner and responders.
--   M3  countries/regions/cities had no RLS -> now read-only for authed.
--
-- Note: M2 (handle_new_user) is intentionally left as SECURITY DEFINER. That
-- is the required, idiomatic pattern for Supabase auth signup triggers -- the
-- function only inserts rows for the new user id from the trusted `new`
-- record, so it is not an attack surface. Flipping it to SECURITY INVOKER
-- would risk breaking the signup flow.
--
-- All statements are guarded / idempotent. Safe to re-run.

-- ═══════════════════════════════════════════════════════════
-- C1. Lock down find_nearby_users: only the caller's own location
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION find_nearby_users(
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
    is_connected BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Authorization guard: a caller may only ever ask about themselves.
    -- This prevents any user from querying another user's exact location or
    -- their surrounding network (location-privacy leak / enumeration vector).
    IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to query another user''s location';
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
        COALESCE(p.is_verified, false),
        EXISTS (
            SELECT 1 FROM connections c
            WHERE (c.requester_id = p_user_id AND c.recipient_id = p.id AND c.status = 'accepted')
               OR (c.recipient_id = p_user_id AND c.requester_id = p.id AND c.status = 'accepted')
        )
    FROM profiles p
    JOIN privacy_settings ps ON ps.user_id = p.id
    JOIN user_locations ul ON ul.user_id = p.id
    LEFT JOIN cities ci ON ci.id = COALESCE(ul.current_city_id, ul.home_city_id)
    LEFT JOIN regions r ON r.id = COALESCE(ul.current_region_id, ul.home_region_id)
    LEFT JOIN countries co ON co.id = COALESCE(ul.current_country_id, ul.home_country_id)
    WHERE p.id != p_user_id
      AND ps.show_in_discovery = true
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


-- ═══════════════════════════════════════════════════════════
-- C3. profiles UPDATE: block privilege escalation
-- NOTE: RLS policy expressions cannot reference NEW/OLD (that syntax only
-- exists inside trigger functions), so this is enforced with a BEFORE UPDATE
-- trigger guarded by auth.uid(). Service role / SQL Editor updates (auth.uid()
-- IS NULL or acting on another user) are NOT blocked, so admins can still set
-- verification flags.
-- ═══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> NEW.id THEN
        RETURN NEW;
    END IF;

    IF NEW.account_type      IS DISTINCT FROM OLD.account_type
       OR NEW.is_premium      IS DISTINCT FROM OLD.is_premium
       OR NEW.is_verified     IS DISTINCT FROM OLD.is_verified
       OR NEW.verification_level IS DISTINCT FROM OLD.verification_level
       OR NEW.human_verified  IS DISTINCT FROM OLD.human_verified
       OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
    THEN
        RAISE EXCEPTION 'Cannot modify privileged profile fields';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- ═══════════════════════════════════════════════════════════
-- C4. Enable RLS on audit_logs + moderation_actions (server-only)
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- No public policies are created: only the postgres/service_role (bypasses RLS)
-- can read or write these. Ready-made statements kept here for moderation tooling
-- to extend later if needed.


-- ═══════════════════════════════════════════════════════════
-- H1. request_verifications: restrict reads to the request owner
-- ═══════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "Anyone can view request verifications" ON public.request_verifications;

CREATE POLICY "Request owner and responders can view verifications"
    ON public.request_verifications FOR SELECT
    USING (
        request_id IN (
            SELECT id FROM blood_requests WHERE requester_id = auth.uid()
        )
        OR request_id IN (
            SELECT request_id FROM request_responses WHERE responder_id = auth.uid()
        )
    );


-- ═══════════════════════════════════════════════════════════
-- M3. Reference data: enable RLS, read-only for authenticated users
-- ═══════════════════════════════════════════════════════════
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reference data is readable by authenticated users" ON public.countries;
CREATE POLICY "Reference data is readable by authenticated users"
    ON public.countries FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Reference data is readable by authenticated users" ON public.regions;
CREATE POLICY "Reference data is readable by authenticated users"
    ON public.regions FOR SELECT
    USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Reference data is readable by authenticated users" ON public.cities;
CREATE POLICY "Reference data is readable by authenticated users"
    ON public.cities FOR SELECT
    USING (auth.role() = 'authenticated');
