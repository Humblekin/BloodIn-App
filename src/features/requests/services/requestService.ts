// Project LifeOrbit — Blood Request Service
// Encapsulates all Supabase interactions for the blood requests domain.

import { supabase } from '@/lib/supabase/client';

export interface BloodRequestCreate {
  blood_group: string;
  urgency_level: 1 | 2 | 3;
  hospital_name: string;
  patient_name?: string;
  units_required: number;
  contact_number?: string;
  additional_notes?: string;
  latitude: number;
  longitude: number;
  expires_at: string;
}

export interface BloodRequestRow {
  id: string;
  requester_id: string;
  blood_group: string;
  urgency_level: number;
  hospital_name: string;
  patient_name: string | null;
  units_required: number;
  contact_number: string | null;
  additional_notes: string | null;
  status: 'active' | 'fulfilled' | 'cancelled' | 'expired';
  expires_at: string;
  created_at: string;
  updated_at: string;
  // Joined
  requester_profile?: { display_name: string; avatar_url: string | null };
}

export interface RequestResponseRow {
  id: string;
  request_id: string;
  responder_id: string;
  status: 'offered' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  message: string | null;
  created_at: string;
  responder_profile?: { display_name: string; avatar_url: string | null; blood_group: string | null };
}

export const requestService = {
  // ─── Fetch ────────────────────────────────────────────

  async getActiveRequests(options?: {
    bloodGroup?: string;
    limit?: number;
    offset?: number;
  }): Promise<BloodRequestRow[]> {
    let query = supabase
      .from('blood_requests')
      .select(`
        *,
        requester_profile:profiles!blood_requests_requester_id_fkey(display_name, avatar_url)
      `)
      .eq('status', 'active')
      .order('urgency_level', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 20);

    if (options?.bloodGroup) {
      query = query.eq('blood_group', options.bloodGroup);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as BloodRequestRow[];
  },

  async getRequestById(requestId: string): Promise<BloodRequestRow | null> {
    const { data, error } = await supabase
      .from('blood_requests')
      .select(`
        *,
        requester_profile:profiles!blood_requests_requester_id_fkey(display_name, avatar_url)
      `)
      .eq('id', requestId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as BloodRequestRow;
  },

  async getMyRequests(userId: string): Promise<BloodRequestRow[]> {
    const { data, error } = await supabase
      .from('blood_requests')
      .select('*')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as BloodRequestRow[];
  },

  // ─── Create ───────────────────────────────────────────

  async createRequest(userId: string, input: BloodRequestCreate): Promise<BloodRequestRow> {
    const { data, error } = await supabase
      .from('blood_requests')
      .insert({
        requester_id: userId,
        blood_group: input.blood_group,
        urgency_level: input.urgency_level,
        hospital_name: input.hospital_name,
        patient_name: input.patient_name || null,
        units_required: input.units_required,
        contact_number: input.contact_number || null,
        additional_notes: input.additional_notes || null,
        location_point: `POINT(${input.longitude} ${input.latitude})`,
        expires_at: input.expires_at,
      })
      .select()
      .single();

    if (error) throw error;
    return data as BloodRequestRow;
  },

  // ─── Update ───────────────────────────────────────────

  async updateRequestStatus(
    requestId: string,
    status: 'active' | 'fulfilled' | 'cancelled'
  ): Promise<void> {
    const { error } = await supabase
      .from('blood_requests')
      .update({ status })
      .eq('id', requestId);

    if (error) throw error;
  },

  // ─── Responses ────────────────────────────────────────

  async getResponses(requestId: string): Promise<RequestResponseRow[]> {
    const { data, error } = await supabase
      .from('request_responses')
      .select(`
        *,
        responder_profile:profiles!request_responses_responder_id_fkey(display_name, avatar_url, blood_group)
      `)
      .eq('request_id', requestId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as RequestResponseRow[];
  },

  async offerToHelp(requestId: string, responderId: string, message?: string): Promise<void> {
    const { error } = await supabase
      .from('request_responses')
      .insert({
        request_id: requestId,
        responder_id: responderId,
        message: message || null,
      });

    if (error) throw error;
  },

  async updateResponseStatus(
    responseId: string,
    status: 'accepted' | 'declined' | 'completed' | 'cancelled'
  ): Promise<void> {
    const { error } = await supabase
      .from('request_responses')
      .update({ status })
      .eq('id', responseId);

    if (error) throw error;
  },
};
