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

  async updateUserLocation(userId: string, location: {
    countryId: number;
    regionId: number;
    cityId: number;
    latitude?: number;
    longitude?: number;
  }): Promise<void> {
    const update: any = {
      home_country_id: location.countryId,
      home_region_id: location.regionId,
      home_city_id: location.cityId,
      current_country_id: location.countryId,
      current_region_id: location.regionId,
      current_city_id: location.cityId,
      updated_at: new Date().toISOString(),
    };

    if (location.latitude && location.longitude) {
      update.home_coordinates = `POINT(${location.longitude} ${location.latitude})`;
      update.current_coordinates = `POINT(${location.longitude} ${location.latitude})`;
      update.coordinates_updated_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('user_locations')
      .update(update)
      .eq('user_id', userId);

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

  // ─── Discovery ────────────────────────────────────────

  async findNearbyUsers(options?: {
    bloodGroup?: string;
    radiusKm?: number;
    limit?: number;
    offset?: number;
  }) {
    const { data, error } = await supabase.rpc('find_nearby_users', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_blood_group: options?.bloodGroup || null,
      p_radius_km: options?.radiusKm || 25,
      p_limit: options?.limit || 20,
      p_offset: options?.offset || 0,
    });

    if (error) throw error;
    return data || [];
  },
};
