-- BloodIn — Locality detection & nearby discovery repairs
--
-- 1. Seed every Ghana region with a resolvable city anchor (the original
--    seed only had 10 cities, so users more than 50 km from those cities
--    never got a country/region/city and stale labels survived).
-- 2. set_user_location: stop overwriting home_* on every GPS update and
--    stop COALESCE-ing stale current_city_id when resolution fails.
-- 3. find_nearby_users: gate Orbit on show_in_orbit but not Discover,
--    fall back to home_coordinates for legacy rows, and show the current
--    locality (never a stale home locality when current coords exist).

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Additional Ghana locality anchors
-- ──────────────────────────────────────────────────────────────────────────
INSERT INTO public.cities (region_id, name, latitude, longitude)
SELECT r.id, v.name, v.lat::double precision, v.lng::double precision
FROM (VALUES
    ('Greater Accra', 'Ashaiman',    5.6833,  -0.0500),
    ('Greater Accra', 'Teshie',      5.5833,  -0.1000),
    ('Central',       'Kasoa',       5.5333,  -0.4167),
    ('Central',       'Winneba',     5.3500,  -1.2500),
    ('Central',       'Mankessim',   5.2833,  -1.0167),
    ('Eastern',       'Nsawam',      5.8167,  -0.3500),
    ('Ashanti',       'Mampong',     7.0667,  -2.3667),
    ('Ashanti',       'Konongo',     6.6167,  -1.2167),
    ('Ashanti',       'Ejura',       7.3667,  -1.3500),
    ('Western',       'Axim',        4.8667,  -2.2400),
    ('Volta',         'Hohoe',       7.1500,   0.4500),
    ('Volta',         'Aflao',       6.1167,   1.1917),
    ('Volta',         'Keta',        6.1000,   0.9833),
    ('Volta',         'Sogakope',    6.0000,   0.6000),
    ('Northern',      'Yendi',       9.4000,  -0.0167),
    ('Upper East',    'Bolgatanga', 10.7333,  -0.8333),
    ('Upper East',    'Bawku',      11.0500,  -0.2500),
    ('Upper East',    'Navrongo',   10.6167,  -1.1167),
    ('Upper West',    'Wa',         10.0000,  -2.5000),
    ('Upper West',    'Tumu',       10.8833,  -2.4833),
    ('Bono',          'Sunyani',     7.3333,  -2.3333),
    ('Bono',          'Wenchi',      7.7333,  -2.1000),
    ('Bono East',     'Techiman',    7.5833,  -1.9333),
    ('Bono East',     'Kintampo',    8.0500,  -2.3000),
    ('Ahafo',         'Goaso',       6.9833,  -2.4833),
    ('Western North', 'Sefwi Wiawso',6.1833,  -2.7833),
    ('Oti',           'Dambai',      9.0167,   0.1667),
    ('North East',    'Nalerigu',   10.5167,  -0.3667),
    ('Savannah',      'Damongo',     8.0667,  -1.6667),
    ('Savannah',      'Salaga',      8.5333,  -0.5167)
) AS v(region, name, lat, lng)
JOIN public.regions r
  ON r.name = v.region
 AND r.country_id = (SELECT id FROM public.countries WHERE code = 'GH')
WHERE NOT EXISTS (
    SELECT 1 FROM public.cities c WHERE c.name = v.name
);

-- ──────────────────────────────────────────────────────────────────────────
-- 2. set_user_location — explicit home updates vs. GPS current updates
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_user_location(
    p_country_id INTEGER DEFAULT NULL,
    p_region_id INTEGER DEFAULT NULL,
    p_city_id INTEGER DEFAULT NULL,
    p_latitude DOUBLE PRECISION DEFAULT NULL,
    p_longitude DOUBLE PRECISION DEFAULT NULL,
    p_update_home BOOLEAN DEFAULT FALSE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_latitude IS NULL OR p_longitude IS NULL
       OR p_latitude < -90 OR p_latitude > 90
       OR p_longitude < -180 OR p_longitude > 180 THEN
        RAISE EXCEPTION 'Valid latitude and longitude are required';
    END IF;

    INSERT INTO public.user_locations (
        user_id,
        home_country_id,
        home_region_id,
        home_city_id,
        home_coordinates,
        current_country_id,
        current_region_id,
        current_city_id,
        current_coordinates,
        coordinates_updated_at,
        updated_at
    )
    VALUES (
        auth.uid(),
        p_country_id,
        p_region_id,
        p_city_id,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        p_country_id,
        p_region_id,
        p_city_id,
        ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
        now(),
        now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        -- Home only changes when the user explicitly picks it (or when no
        -- home has ever been stored); travel must never overwrite it.
        home_country_id = CASE
            WHEN p_update_home THEN EXCLUDED.home_country_id
            ELSE COALESCE(user_locations.home_country_id, EXCLUDED.home_country_id)
        END,
        home_region_id = CASE
            WHEN p_update_home THEN EXCLUDED.home_region_id
            ELSE COALESCE(user_locations.home_region_id, EXCLUDED.home_region_id)
        END,
        home_city_id = CASE
            WHEN p_update_home THEN EXCLUDED.home_city_id
            ELSE COALESCE(user_locations.home_city_id, EXCLUDED.home_city_id)
        END,
        home_coordinates = CASE
            WHEN p_update_home THEN EXCLUDED.home_coordinates
            ELSE COALESCE(user_locations.home_coordinates, EXCLUDED.home_coordinates)
        END,
        -- Current always reflects the latest fix. Unresolvable hierarchy
        -- values clear the previous ones instead of leaving them stale.
        current_country_id = CASE
            WHEN p_update_home THEN user_locations.current_country_id
            ELSE EXCLUDED.current_country_id
        END,
        current_region_id = CASE
            WHEN p_update_home THEN user_locations.current_region_id
            ELSE EXCLUDED.current_region_id
        END,
        current_city_id = CASE
            WHEN p_update_home THEN user_locations.current_city_id
            ELSE EXCLUDED.current_city_id
        END,
        current_coordinates = CASE
            WHEN p_update_home THEN COALESCE(user_locations.current_coordinates, EXCLUDED.current_coordinates)
            ELSE EXCLUDED.current_coordinates
        END,
        coordinates_updated_at = CASE
            WHEN p_update_home THEN user_locations.coordinates_updated_at
            ELSE now()
        END,
        updated_at = now();
END;
$$;

DROP FUNCTION IF EXISTS public.set_user_location(integer, integer, integer, double precision, double precision);

REVOKE ALL ON FUNCTION public.set_user_location(integer, integer, integer, double precision, double precision, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_location(integer, integer, integer, double precision, double precision, boolean) TO authenticated;

-- ──────────────────────────────────────────────────────────────────────────
-- 3. find_nearby_users — discovery vs. orbit gates, legacy coordinates,
--    current-aware locality labels
-- ──────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.find_nearby_users(
    p_user_id UUID,
    p_blood_group TEXT DEFAULT NULL,
    p_radius_km INTEGER DEFAULT 25,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0,
    p_willing_only BOOLEAN DEFAULT FALSE,
    p_for_orbit BOOLEAN DEFAULT FALSE
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
DECLARE
    v_own_coordinates geography;
BEGIN
    IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to query another user''s location';
    END IF;

    SELECT COALESCE(cl.current_coordinates, cl.home_coordinates)
    INTO v_own_coordinates
    FROM public.user_locations AS cl
    WHERE cl.user_id = p_user_id;

    IF v_own_coordinates IS NULL THEN
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
            (ST_Distance(
                COALESCE(ul.current_coordinates, ul.home_coordinates),
                v_own_coordinates
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
    LEFT JOIN public.cities ci ON ci.id = CASE
        WHEN ul.current_coordinates IS NOT NULL THEN ul.current_city_id
        ELSE ul.home_city_id
    END
    LEFT JOIN public.regions r ON r.id = CASE
        WHEN ul.current_coordinates IS NOT NULL THEN ul.current_region_id
        ELSE ul.home_region_id
    END
    LEFT JOIN public.countries co ON co.id = CASE
        WHEN ul.current_coordinates IS NOT NULL THEN ul.current_country_id
        ELSE ul.home_country_id
    END
    WHERE p.id <> p_user_id
      AND ps.show_in_discovery = true
      AND (NOT p_for_orbit OR ps.show_in_orbit = true)
      AND COALESCE(ul.current_coordinates, ul.home_coordinates) IS NOT NULL
      AND NOT EXISTS (
          SELECT 1
          FROM public.user_blocks ub
          WHERE (ub.blocker_id = p_user_id AND ub.blocked_id = p.id)
             OR (ub.blocker_id = p.id AND ub.blocked_id = p_user_id)
      )
      AND (p_blood_group IS NULL OR p.blood_group::TEXT = p_blood_group)
      AND (NOT p_willing_only OR p.donation_willingness = 'willing')
      AND ST_DWithin(
          COALESCE(ul.current_coordinates, ul.home_coordinates),
          v_own_coordinates,
          GREATEST(p_radius_km, 1) * 1000
      )
    ORDER BY
        ST_Distance(COALESCE(ul.current_coordinates, ul.home_coordinates), v_own_coordinates) ASC,
        p.id ASC
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
    OFFSET GREATEST(p_offset, 0);
END;
$$;

-- Drop the superseded 6-argument overload (pre-dates p_for_orbit).
DROP FUNCTION IF EXISTS public.find_nearby_users(UUID, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN);

REVOKE ALL ON FUNCTION public.find_nearby_users(UUID, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.find_nearby_users(UUID, TEXT, INTEGER, INTEGER, INTEGER, BOOLEAN, BOOLEAN) TO authenticated;
