// Project LifeOrbit — Orbit Service
// Loads the current user's nearby network (via the privacy-aware
// find_nearby_users RPC) and maps it into OrbitNode records for the
// OrbitCanvas visualization.
//
// Relevance model (client-side, using only fields the RPC already exposes):
//   1. Already-connected members are most relevant.
//   2. Members who are available to help are next.
//   3. Everyone else by proximity (the RPC already orders by distance).
// The resulting order feeds the tiered rings: inner ring = most relevant,
// middle = moderately relevant, outer = the broader local network.
import { locationService } from '../../location/services/locationService';
import { supabase } from '@/lib/supabase/client';
import type { OrbitNode } from '../components/OrbitCanvas';

export interface NearbyUserResult {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  blood_group: string | null;
  city_name: string | null;
  region_name: string | null;
  country_name: string | null;
  approximate_distance_km: number;
  is_available: boolean;
  is_connected: boolean;
  is_premium: boolean;
}

export const orbitService = {
  async getNearbyNodes(options?: {
    bloodGroup?: string;
    radiusKm?: number;
    limit?: number;
  }): Promise<OrbitNode[]> {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id;
    if (!userId) return [];

    if (!(await locationService.hasCurrentLocation(userId))) {
      throw new Error('LOCATION_REQUIRED');
    }

    let users: any[] = [];
    try {
      users = (await locationService.findNearbyUsers(options)) || [];
    } catch (err) {
      console.warn('[Orbit] findNearbyUsers failed:', err);
      users = [];
    }

    const rows = users as unknown as NearbyUserResult[];

    // Relevance ordering: connected → available → distance (stable, nearest first).
    const ordered = [...rows].sort((a, b) => {
      if (a.is_connected !== b.is_connected) return a.is_connected ? -1 : 1;
      if (a.is_available !== b.is_available) return a.is_available ? -1 : 1;
      return (a.approximate_distance_km ?? 0) - (b.approximate_distance_km ?? 0);
    });

    const nearThreshold = 10; // km — used for the inner "active" halo

    return ordered.map((u, index) => ({
      id: u.user_id,
      type: 'user' as const,
      distance: u.approximate_distance_km ?? 0,
      angle: (360 / Math.max(1, ordered.length)) * index,
      active: u.is_connected || u.is_available || (u.approximate_distance_km ?? 0) <= nearThreshold,
      displayName: u.display_name,
      bloodGroup: u.blood_group || undefined,
      locationName: [u.city_name, u.region_name].filter(Boolean).join(', ') || undefined,
      avatarUrl: u.avatar_url,
      isPremium: u.is_premium,
    }));
  },
};
