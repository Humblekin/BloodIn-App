// Project LifeOrbit — Organization Service
import { supabase } from '@/lib/supabase/client';

export type OrgType = 'hospital' | 'blood_bank' | 'ngo' | 'medical_institution' | 'other';
export type OrgRole = 'owner' | 'admin' | 'staff';
export type OrgMemberStatus = 'pending' | 'active' | 'suspended' | 'left';

export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  org_type: OrgType;
  logo_url: string | null;
  website_url: string | null;
  city_id: number | null;
  verification_level: 'unverified' | 'basic' | 'verified' | 'premium';
  join_policy: 'open' | 'request' | 'invite_only';
  is_active: boolean;
  member_count: number;
  created_by: string;
  created_at: string;
}

export interface OrganizationMemberRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: OrgRole;
  status: OrgMemberStatus;
  is_active: boolean;
  joined_at: string;
  profile?: { display_name: string; avatar_url: string | null };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const organizationService = {
  async getOrganizations(options?: { limit?: number; offset?: number }): Promise<OrganizationRow[]> {
    let data: any[] | null = null;
    let error: any = null;
    try {
      const res = await supabase
        .from('organizations')
        .select('*')
        .eq('is_active', true)
        // Invite-only organizations stay reachable by direct link but are
        // hidden from public listings.
        .neq('join_policy', 'invite_only')
        .order('member_count', { ascending: false })
        .limit(options?.limit ?? 20);
      data = res.data;
      error = res.error;
    } catch (err) {
      error = err;
    }

    if (error) throw error;
    if (!data || data.length === 0) return [];

    return data as OrganizationRow[];
  },

  async getOrganizationById(organizationId: string): Promise<OrganizationRow | null> {
    if (!UUID_RE.test(organizationId)) return null;

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as OrganizationRow;
  },

  async getMembers(organizationId: string): Promise<OrganizationMemberRow[]> {
    if (!UUID_RE.test(organizationId)) return [];

    const { data, error } = await supabase
      .from('organization_members')
      .select(`*, profile:profiles!organization_members_user_id_fkey(display_name, avatar_url)`)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('role');

    if (error) throw error;
    return (data || []) as OrganizationMemberRow[];
  },

  async getPendingMembers(organizationId: string): Promise<OrganizationMemberRow[]> {
    if (!UUID_RE.test(organizationId)) return [];

    const { data, error } = await supabase
      .from('organization_members')
      .select(`*, profile:profiles!organization_members_user_id_fkey(display_name, avatar_url)`)
      .eq('organization_id', organizationId)
      .eq('status', 'pending')
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return (data || []) as OrganizationMemberRow[];
  },

  async getMyMembership(
    organizationId: string,
    userId: string
  ): Promise<{ role: OrgRole; status: OrgMemberStatus } | null> {
    if (!UUID_RE.test(organizationId)) return null;

    const { data, error } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;
    return (data as { role: OrgRole; status: OrgMemberStatus } | null);
  },

  async joinOrganization(organizationId: string, userId: string): Promise<void> {
    const organization = await organizationService.getOrganizationById(organizationId);
    const status: OrgMemberStatus =
      organization?.join_policy === 'open' ? 'active' : 'pending';

    const { data: existing } = await supabase
      .from('organization_members')
      .select('id, status')
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'active' || existing.status === 'pending') return;

      // Rejoining after leaving: reactivate the existing row as staff.
      if (existing.status === 'left') {
        const { error } = await supabase
          .from('organization_members')
          .update({ status, role: 'staff' })
          .eq('id', existing.id);
        if (error) throw error;
        return;
      }

      throw new Error('This membership cannot be reactivated. Contact an organization leader.');
    }

    const { error } = await supabase
      .from('organization_members')
      .insert({ organization_id: organizationId, user_id: userId, role: 'staff', status });

    if (error) {
      if (error.code === '23505') return; // concurrent join — already a member
      throw error;
    }
  },

  async leaveOrganization(organizationId: string, userId: string): Promise<void> {
    // Demote on leave so a former leader cannot rejoin with elevated rights
    // (the DB guard also enforces this).
    const { error } = await supabase
      .from('organization_members')
      .update({ status: 'left', role: 'staff' })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  async setMemberStatus(memberId: string, status: OrgMemberStatus): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ status })
      .eq('id', memberId);

    if (error) throw error;
  },

  async setMemberRole(memberId: string, role: OrgRole): Promise<void> {
    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('id', memberId);

    if (error) throw error;
  },
};
