-- ================================================================
-- BloodIn — Premium Upgrade System
-- Run this SQL via the Supabase Dashboard SQL Editor.
-- Creates a server-side SECURITY DEFINER function to upgrade
-- a user to premium (bypasses the client-side privilege escalation trigger).
-- ================================================================

-- 1. upgrade_to_premium RPC
-- Called by the client after mock payment confirmation.
-- SECURITY DEFINER so it runs as postgres (bypasses trigger).
CREATE OR REPLACE FUNCTION public.upgrade_to_premium()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _uid uuid := auth.uid();
  _already_premium boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT is_premium INTO _already_premium
  FROM public.profiles
  WHERE id = _uid;

  IF _already_premium THEN
    RETURN json_build_object('error', 'Already premium');
  END IF;

  -- Mark this session as a trusted service operation so RLS/trigger guards
  -- that normally block users from changing privileged fields can allow it.
  PERFORM set_config('app.trusted_action', 'upgrade_to_premium', true);

  UPDATE public.profiles
  SET is_premium   = true,
      updated_at   = now()
  WHERE id = _uid;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Profile not found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upgrade_to_premium() TO authenticated;

-- 2. Update find_nearby_users RPC to include is_premium
-- If a previous version exists with a different return shape, DROP it first.
DROP FUNCTION IF EXISTS public.find_nearby_users(uuid, text, integer, integer, integer);

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
    is_connected BOOLEAN,
    is_premium BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
