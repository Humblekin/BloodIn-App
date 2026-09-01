// Project LifeOrbit — Campaign Service
import { supabase } from '@/lib/supabase/client';

export interface CampaignRow {
  id: string;
  title: string;
  description: string | null;
  campaign_type: 'donation_drive' | 'awareness' | 'registration' | 'other';
  community_id: string | null;
  organization_id: string | null;
  created_by: string;
  start_date: string;
  end_date: string | null;
  venue: string | null;
  cover_image_url: string | null;
  max_participants: number | null;
  status: 'draft' | 'upcoming' | 'active' | 'completed' | 'cancelled';
  safety_info: string | null;
  created_at: string;
}

export interface CampaignParticipantRow {
  id: string;
  campaign_id: string;
  user_id: string;
  status: 'interested' | 'registered' | 'attended' | 'cancelled';
  registered_at: string;
  profile?: { display_name: string; avatar_url: string | null };
}

export const campaignService = {
  async getCampaigns(options?: {
    status?: string;
    limit?: number;
  }): Promise<CampaignRow[]> {
    let query = supabase
      .from('campaigns')
      .select('*')
      .order('start_date', { ascending: true })
      .limit(options?.limit ?? 20);

    if (options?.status) {
      query = query.eq('status', options.status);
    } else {
      query = query.in('status', ['upcoming', 'active']);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as CampaignRow[];
  },

  async getCampaignById(campaignId: string): Promise<CampaignRow | null> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as CampaignRow;
  },

  async createCampaign(input: Omit<CampaignRow, 'id' | 'created_at' | 'status'> & { status?: string }): Promise<CampaignRow> {
    const { data, error } = await supabase
      .from('campaigns')
      .insert(input)
      .select()
      .single();

    if (error) throw error;
    return data as CampaignRow;
  },

  async registerForCampaign(campaignId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('campaign_participants')
      .insert({ campaign_id: campaignId, user_id: userId, status: 'registered' });

    if (error) throw error;
  },

  async getParticipants(campaignId: string): Promise<CampaignParticipantRow[]> {
    const { data, error } = await supabase
      .from('campaign_participants')
      .select(`*, profile:profiles!campaign_participants_user_id_fkey(display_name, avatar_url)`)
      .eq('campaign_id', campaignId);

    if (error) throw error;
    return (data || []) as CampaignParticipantRow[];
  },
};
