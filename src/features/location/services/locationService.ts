// Project LifeOrbit — Location Service
import { supabase } from '@/lib/supabase/client';

export interface CountryRow { id: number; name: string; code: string; phone_code: string | null; }
export interface RegionRow { id: number; country_id: number; name: string; }
export interface CityRow { id: number; region_id: number; name: string; latitude: number | null; longitude: number | null; }

export const locationService = {
  // ─── Hierarchical Location Data ───────────────────────

  async getCountries(): Promise<CountryRow[]> {
    const { data, error } = await supabase
      .from('countries')
      .select('*')
      .order('name');

    if (error) throw error;
    return (data || []) as CountryRow[];
  },

  async getRegions(countryId: number): Promise<RegionRow[]> {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('country_id', countryId)
      .order('name');

    if (error) throw error;
    return (data || []) as RegionRow[];
  },

  async getCities(regionId: number): Promise<CityRow[]> {
    const { data, error } = await supabase
      .from('cities')
      .select('*')
      .eq('region_id', regionId)
      .order('name');

    if (error) throw error;
    return (data || []) as CityRow[];
  },

  // ─── User Location ───────────────────────────────────

  // Reverse-geocode a lat/lng pair to the nearest seeded Ghana city so the
  // user record can store the full hierarchy (country/region/city ids).
  async resolveNearestCity(latitude: number, longitude: number): Promise<{
    countryId: number;
    regionId: number;
    cityId: number;
    name: string;
  } | null> {
    interface CityWithRegion {
      id: number;
      name: string;
      latitude: number;
      longitude: number;
      regions: { id: number; country_id: number; name: string } | { id: number; country_id: number; name: string }[];
    }

    const { data, error } = await supabase
      .from('cities')
      .select('id, name, latitude, longitude, regions!cities_region_id_fkey(id, country_id, name)')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) {
      console.warn('[Location] resolveNearestCity lookup failed:', error);
      return null;
    }

    const rows = (data || []) as CityWithRegion[];
    if (rows.length === 0) return null;

    let nearest = rows[0];
    let nearestDist = Number.POSITIVE_INFINITY;

    for (const row of rows) {
      const dlat = (row.latitude ?? 0) - latitude;
      const dlng = (row.longitude ?? 0) - longitude;
      const dist = dlat * dlat + dlng * dlng;
      if (dist < nearestDist) {
        nearest = row;
        nearestDist = dist;
      }
    }

    const region = Array.isArray(nearest.regions) ? nearest.regions[0] : nearest.regions;
    if (!region) return null;

    return {
      countryId: region.country_id,
      regionId: region.id,
      cityId: nearest.id,
      name: `${nearest.name}, ${region.name}`,
    };
  },

  async updateUserLocation(userId: string, location: {
    countryId?: number;
    regionId?: number;
    cityId?: number;
    latitude?: number;
    longitude?: number;
  }): Promise<void> {
      if (location.latitude !== undefined && (location.latitude < -90 || location.latitude > 90)) {
        throw new Error('Invalid latitude');
      }
      if (location.longitude !== undefined && (location.longitude < -180 || location.longitude > 180)) {
        throw new Error('Invalid longitude');
      }

    const { error } = await supabase
      .rpc('set_user_location', {
        p_country_id: location.countryId ?? null,
        p_region_id: location.regionId ?? null,
        p_city_id: location.cityId ?? null,
        p_latitude: location.latitude ?? null,
        p_longitude: location.longitude ?? null,
      });

    if (error) throw error;
  },

  async getUserLocation(userId: string) {
    const { data, error } = await supabase
      .from('user_locations')
      .select(`
        *,
        home_country:countries!user_locations_home_country_id_fkey(name, code),
        home_region:regions!user_locations_home_region_id_fkey(name),
        home_city:cities!user_locations_home_city_id_fkey(name)
      `)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },

  async hasCurrentLocation(userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('user_locations')
      .select('current_coordinates')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return Boolean(data?.current_coordinates);
  },

  // ─── Discovery ────────────────────────────────────────

  async findNearbyUsers(options?: {
    bloodGroup?: string;
    radiusKm?: number;
    limit?: number;
    offset?: number;
  }) {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;

    if (!userId) {
      console.warn('[Location] findNearbyUsers called without a session');
      return [];
    }

    const { data, error } = await supabase.rpc('find_nearby_users', {
      p_user_id: userId,
      p_blood_group: options?.bloodGroup || null,
      p_radius_km: options?.radiusKm || 25,
      p_limit: options?.limit || 20,
      p_offset: options?.offset || 0,
    });

    if (error) throw error;
    return data || [];
  },
};
