// Project LifeOrbit — Location Service
import * as Location from 'expo-location';
import { supabase } from '@/lib/supabase/client';

export interface CountryRow { id: number; name: string; code: string; phone_code: string | null; }
export interface RegionRow { id: number; country_id: number; name: string; }
export interface CityRow { id: number; region_id: number; name: string; latitude: number | null; longitude: number | null; }

export interface ValidCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  timestamp: number;
}

export interface LocationPermissionResult {
  granted: boolean;
  canAskAgain: boolean;
  servicesEnabled: boolean;
  status: Location.PermissionStatus | 'services_disabled';
  message?: string;
}

export const locationService = {
  // ─── Device Location Acquisition & Permissions ────────

  /**
   * Checks both device-level location services and app foreground permission.
   */
  async checkLocationPermission(): Promise<LocationPermissionResult> {
    try {
      const servicesEnabled = await Location.isLocationServicesEnabledAsync();
      if (!servicesEnabled) {
        return {
          granted: false,
          canAskAgain: true,
          servicesEnabled: false,
          status: 'services_disabled',
          message: 'Location services are disabled on this device. Please turn on GPS.',
        };
      }

      const permission = await Location.getForegroundPermissionsAsync();
      return {
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        servicesEnabled: true,
        status: permission.status,
      };
    } catch (err) {
      console.warn('[Location] Permission check failed:', err);
      return {
        granted: false,
        canAskAgain: true,
        servicesEnabled: false,
        status: Location.PermissionStatus.UNDETERMINED,
        message: 'Could not check location permission.',
      };
    }
  },

  /**
   * Prompts user for foreground location permission if not already granted.
   */
  async requestLocationPermission(): Promise<LocationPermissionResult> {
    try {
      const servicesEnabled = await Location.isLocationServicesEnabledAsync();
      if (!servicesEnabled) {
        return {
          granted: false,
          canAskAgain: true,
          servicesEnabled: false,
          status: 'services_disabled',
          message: 'Location services are disabled on your device. Please turn on GPS/Location in system settings.',
        };
      }

      const current = await Location.getForegroundPermissionsAsync();
      if (current.granted) {
        return {
          granted: true,
          canAskAgain: current.canAskAgain,
          servicesEnabled: true,
          status: current.status,
        };
      }

      const requested = await Location.requestForegroundPermissionsAsync();
      return {
        granted: requested.granted,
        canAskAgain: requested.canAskAgain,
        servicesEnabled: true,
        status: requested.status,
        message: requested.granted
          ? undefined
          : requested.canAskAgain
            ? 'Location permission was denied.'
            : 'Location permission is permanently denied. Please enable it in device Settings.',
      };
    } catch (err) {
      console.warn('[Location] Permission request failed:', err);
      return {
        granted: false,
        canAskAgain: true,
        servicesEnabled: false,
        status: Location.PermissionStatus.DENIED,
        message: 'Unable to request location permissions.',
      };
    }
  },

  /**
   * Acquires the device's real GPS coordinates.
   * Validates numeric bounds and horizontal accuracy.
   * Never silently falls back to hardcoded city coordinates.
   */
  async acquireCurrentPosition(accuracy: Location.Accuracy = Location.Accuracy.Balanced): Promise<ValidCoordinates> {
    const perm = await this.requestLocationPermission();
    if (!perm.granted) {
      throw new Error(perm.message || 'LOCATION_PERMISSION_DENIED');
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy,
    });

    if (!pos || !pos.coords) {
      throw new Error('LOCATION_UNAVAILABLE');
    }

    const { latitude, longitude, accuracy: horizAccuracy } = pos.coords;

    // Strict coordinate validation
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error('INVALID_COORDINATES_RECEIVED');
    }

    return {
      latitude,
      longitude,
      accuracy: typeof horizAccuracy === 'number' && Number.isFinite(horizAccuracy) ? horizAccuracy : null,
      timestamp: pos.timestamp || Date.now(),
    };
  },

  /**
   * One-stop method to acquire GPS coordinates, resolve nearest city hierarchy,
   * and persist directly to the authenticated user's database record.
   */
  async acquireAndSaveUserLocation(userId: string): Promise<{
    success: boolean;
    error?: string;
    coordinates?: ValidCoordinates;
    locationName?: string;
  }> {
    try {
      const coords = await this.acquireCurrentPosition();

      let countryId: number | undefined;
      let regionId: number | undefined;
      let cityId: number | undefined;
      let locationName = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;

      try {
        const resolved = await this.resolveNearestCity(coords.latitude, coords.longitude);
        if (resolved) {
          countryId = resolved.countryId;
          regionId = resolved.regionId;
          cityId = resolved.cityId;
          locationName = resolved.name;
        }
      } catch (err) {
        console.warn('[Location] Nearest city resolution warning:', err);
      }

      await this.updateUserLocation(userId, {
        countryId,
        regionId,
        cityId,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      return {
        success: true,
        coordinates: coords,
        locationName,
      };
    } catch (err: any) {
      const message = err?.message || 'Failed to update location';
      console.warn('[Location] acquireAndSaveUserLocation failed:', message);
      return {
        success: false,
        error: message,
      };
    }
  },

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
    if (location.latitude !== undefined && (location.latitude < -90 || location.latitude > 90 || !Number.isFinite(location.latitude))) {
      throw new Error('Invalid latitude');
    }
    if (location.longitude !== undefined && (location.longitude < -180 || location.longitude > 180 || !Number.isFinite(location.longitude))) {
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
    willingOnly?: boolean;
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
      p_willing_only: options?.willingOnly ?? false,
    });

    if (error) throw error;
    return data || [];
  },
};
