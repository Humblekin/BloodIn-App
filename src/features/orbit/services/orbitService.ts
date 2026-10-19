// Project LifeOrbit — Orbit Service
// Loads the current user's nearby network (via the PostGIS find_nearby_users RPC)
// and maps it into OrbitNode records for the OrbitCanvas visualization.
//
// Geographic ordering model:
//   Nearest eligible users first, farthest eligible users on outer rings.
//   Inner ring = closest physical proximity, middle = intermediate, outer = broader perimeter.
import { locationService, type NearbyUserResult } from '../../location/services/locationService';
import { supabase } from '@/lib/supabase/client';
import type { OrbitNode } from '../components/OrbitCanvas';

export const orbitService = {
  async getNearbyNodes(options?: {
    bloodGroup?: string;
    radiusKm?: number;
    limit?: number;
    willingOnly?: boolean;
  }): Promise<OrbitNode[]> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return [];

    const hasLocation = await locationService.hasCurrentLocation(userId);
    if (!hasLocation) {
      throw new Error('LOCATION_REQUIRED');
    }

    const rows = await locationService.findNearbyUsers({ ...options, forOrbit: true });

    // Filter out any records with invalid or missing coordinates/distances
    const validRows = rows.filter(
      (r) => typeof r.approximate_distance_km === 'number' && Number.isFinite(r.approximate_distance_km)
    );

    // Geographic Proximity Ordering:
    // Nearest eligible users strictly first, farthest later. Stable secondary sort by user_id.
    const ordered = [...validRows].sort((a, b) => {
      const distA = a.approximate_distance_km;
      const distB = b.approximate_distance_km;
      if (distA !== distB) {
        return distA - distB;
      }
      return a.user_id.localeCompare(b.user_id);
    });

    const nearThreshold = 10; // km — active glow indicator

    return ordered.map((u, index) => ({
      id: u.user_id,
      type: 'user' as const,
      distance: u.approximate_distance_km,
      angle: (360 / Math.max(1, ordered.length)) * index,
      active: u.is_connected || u.is_available || u.approximate_distance_km <= nearThreshold,
      displayName: u.display_name,
      bloodGroup: u.blood_group || undefined,
      locationName: [u.city_name, u.region_name].filter(Boolean).join(', ') || undefined,
      avatarUrl: u.avatar_url,
      isPremium: u.is_premium,
      donationWillingness: u.donation_willingness || 'unspecified',
      isConnected: u.is_connected,
      isAvailable: u.is_available,
    }));
  },
};
