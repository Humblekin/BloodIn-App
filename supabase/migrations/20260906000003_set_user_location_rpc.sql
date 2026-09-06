-- BloodLink — Reliable location persistence
-- Build PostGIS geography on the database instead of sending WKT through REST.

CREATE OR REPLACE FUNCTION public.set_user_location(
    p_country_id INTEGER DEFAULT NULL,
    p_region_id INTEGER DEFAULT NULL,
    p_city_id INTEGER DEFAULT NULL,
    p_latitude DOUBLE PRECISION DEFAULT NULL,
    p_longitude DOUBLE PRECISION DEFAULT NULL
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
        home_country_id = COALESCE(EXCLUDED.home_country_id, user_locations.home_country_id),
        home_region_id = COALESCE(EXCLUDED.home_region_id, user_locations.home_region_id),
        home_city_id = COALESCE(EXCLUDED.home_city_id, user_locations.home_city_id),
        home_coordinates = EXCLUDED.home_coordinates,
        current_country_id = COALESCE(EXCLUDED.current_country_id, user_locations.current_country_id),
        current_region_id = COALESCE(EXCLUDED.current_region_id, user_locations.current_region_id),
        current_city_id = COALESCE(EXCLUDED.current_city_id, user_locations.current_city_id),
        current_coordinates = EXCLUDED.current_coordinates,
        coordinates_updated_at = now(),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.set_user_location(integer, integer, integer, double precision, double precision) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_user_location(integer, integer, integer, double precision, double precision) TO authenticated;
