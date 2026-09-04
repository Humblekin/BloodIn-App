// Project LifeOrbit — Discover Service
// Powers the Discover screen with real network records.
//
// - People come from the privacy-aware find_nearby_users RPC (respects the
//   caller's own location + show_in_discovery + user_blocks + blood-group
//   visibility).
// - Communities and organizations come from read-only queries against their
//   tables, both of which only expose active/verified records via RLS.
import { supabase } from '@/lib/supabase/client';
import { locationService } from '@/features/location/services/locationService';

export type DiscoverItemType = 'person' | 'community' | 'organization';

export interface DiscoverResult {
  id: string;
  type: DiscoverItemType;
  name: string;
  subtitle?: string;
  distanceKm?: number;
  bloodGroup?: string | null;
  memberCount?: number;
  isVerified?: boolean;
  avatarUrl?: string | null;
}

export const discoverService = {
  async searchPeople(options?: {
    bloodGroup?: string;
    radiusKm?: number;
    limit?: number;
  }): Promise<DiscoverResult[]> {
    const users = (await locationService.findNearbyUsers({
      bloodGroup: options?.bloodGroup,
      radiusKm: options?.radiusKm,
      limit: options?.limit ?? 20,
    })) as any[];

    return (users || []).map((u) => ({
      id: u.user_id,
      type: 'person' as const,
      name: u.display_name,
      subtitle: u.is_connected
        ? 'Connected'
        : [u.city_name, u.region_name].filter(Boolean).join(', ') || 'Nearby',
      distanceKm: u.approximate_distance_km,
      bloodGroup: u.blood_group || null,
      avatarUrl: u.avatar_url,
    }));
  },

  async searchCommunities(options?: {
    limit?: number;
  }): Promise<DiscoverResult[]> {
    const { data, error } = await supabase
      .from('communities')
      .select('id, name, description, member_count, is_verified, logo_url')
      .eq('is_active', true)
      .order('member_count', { ascending: false })
      .limit(options?.limit ?? 20);

    if (error) throw error;

    return (data || []).map((c) => ({
      id: c.id,
      type: 'community' as const,
      name: c.name,
      subtitle: c.member_count ? `${c.member_count} member${c.member_count === 1 ? '' : 's'}` : undefined,
      isVerified: c.is_verified,
      avatarUrl: c.logo_url,
    }));
  },

  async searchOrganizations(options?: {
    limit?: number;
  }): Promise<DiscoverResult[]> {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, description, org_type, verification_level, logo_url')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .limit(options?.limit ?? 20);

    if (error) throw error;

    return (data || []).map((o) => ({
      id: o.id,
      type: 'organization' as const,
      name: o.name,
      subtitle: o.org_type,
      isVerified: o.verification_level !== 'unverified',
      avatarUrl: o.logo_url,
    }));
  },
};