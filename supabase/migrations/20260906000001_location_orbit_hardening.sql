-- BloodLink — Location and Orbit hardening
-- Applies the location behavior required by the current mobile client.

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
        FROM public.user_locations
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
        ROUND(
            ST_Distance(
                ul.current_coordinates,
                own_location.current_coordinates
            ) / 1000.0
        )::DOUBLE PRECISION,
        COALESCE(p.is_available, false),
        EXISTS (
            SELECT 1
            FROM public.connections c
            WHERE ((c.requester_id = p_user_id AND c.recipient_id = p.id)
               OR (c.recipient_id = p_user_id AND c.requester_id = p.id))
              AND c.status = 'accepted'
        ),
        COALESCE(p.is_premium, false)
    FROM public.profiles p
    JOIN public.privacy_settings ps ON ps.user_id = p.id
    JOIN public.user_locations ul ON ul.user_id = p.id
    CROSS JOIN LATERAL (
        SELECT current_coordinates
        FROM public.user_locations
        WHERE user_id = p_user_id
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
      AND ST_DWithin(
          ul.current_coordinates,
          own_location.current_coordinates,
          GREATEST(p_radius_km, 1) * 1000
      )
    ORDER BY approximate_distance_km ASC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.find_nearby_users(uuid, text, integer, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_users(uuid, text, integer, integer, integer) TO authenticated;
