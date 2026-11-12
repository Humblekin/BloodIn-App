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
  expires_at: string | null;
}

export interface BloodRequestRow {
  id: string;
  requester_id: string;
  blood_group: string;
  urgency_level: number;
  hospital_name: string;
  patient_name: string | null;
  units_required: number;
  contact_number?: string | null;
  additional_notes: string | null;
  status: 'active' | 'fulfilled' | 'cancelled' | 'expired';
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  // New columns from 20260831000002
  title: string;
  description?: string | null;
  request_type?: string;
  urgency?: string;
  facility_name?: string | null;
  facility_address?: string | null;
  community_id?: string | null;
  organization_id?: string | null;
  safety_acknowledged?: boolean;
  is_verified?: boolean;
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

export function isBloodRequestExpired(
  request: Pick<BloodRequestRow, 'status' | 'expires_at'>,
  now = Date.now()
): boolean {
  if (request.status === 'expired' || !request.expires_at) return true;
  const expirationTime = Date.parse(request.expires_at);
  return !Number.isFinite(expirationTime) || expirationTime <= now;
}

export const requestService = {
  // ─── Fetch ────────────────────────────────────────────

  async getActiveRequests(options?: {
    bloodGroup?: string;
    limit?: number;
    offset?: number;
  }): Promise<BloodRequestRow[]> {
    const now = new Date().toISOString();
    let query = supabase
      .from('blood_requests')
      .select(`
        *,
        requester_profile:profiles!blood_requests_requester_id_fkey(display_name, avatar_url)
      `)
      .eq('status', 'active')
      .gt('expires_at', now)
      .order('urgency_level', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(options?.limit ?? 20);

    if (options?.bloodGroup) {
      query = query.eq('blood_group', options.bloodGroup);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
    }

    let data: any[] | null = null;
    let error: any = null;
    try {
      const res = await query;
      data = res.data;
      error = res.error;
    } catch (err) {
      error = err;
    }

    if (error) throw error;
    if (!data || data.length === 0) return [];

    return data as BloodRequestRow[];
  },

  async getRequestById(requestId: string): Promise<BloodRequestRow | null> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
      return null;
    }

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

    const request = data as BloodRequestRow;
    const { data: contact, error: contactError } = await supabase
      .from('blood_request_contacts')
      .select('contact_number')
      .eq('request_id', requestId)
      .maybeSingle();

    if (contactError) throw contactError;

    request.contact_number =
      (contact as { contact_number: string } | null)?.contact_number ?? null;

    return request;
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
    const urgencyMap: Record<number, string> = { 1: 'normal', 2: 'urgent', 3: 'critical' };
    const title =
      (input.patient_name ? `${input.patient_name} needs blood` : 'Blood needed') +
      ` · ${input.blood_group} at ${input.hospital_name}`;

    const { data, error } = await supabase
      .from('blood_requests')
      .insert({
        requester_id: userId,
        blood_group: input.blood_group,
        urgency_level: input.urgency_level,
        urgency: urgencyMap[input.urgency_level] || 'normal',
        title,
        description: input.additional_notes || null,
        facility_name: input.hospital_name,
        hospital_name: input.hospital_name,
        patient_name: input.patient_name || null,
        units_required: input.units_required,
        additional_notes: input.additional_notes || null,
        location_point: `POINT(${input.longitude} ${input.latitude})`,
        expires_at: input.expires_at,
        safety_acknowledged: true,
      })
      .select()
      .single();

    if (error) throw error;

    const request = data as BloodRequestRow;
    const contactNumber = input.contact_number?.trim();

    if (contactNumber) {
      const { error: contactError } = await supabase
        .from('blood_request_contacts')
        .insert({ request_id: request.id, contact_number: contactNumber });

      if (contactError) {
        await supabase.from('blood_requests').delete().eq('id', request.id);
        throw contactError;
      }

      request.contact_number = contactNumber;
    } else {
      request.contact_number = null;
    }

    return request;
  },

  // ─── Update ───────────────────────────────────────────

  async updateRequestStatus(
    requestId: string,
    status: 'active' | 'fulfilled' | 'cancelled'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    let query = supabase
      .from('blood_requests')
      .update({ status })
      .eq('id', requestId);

    if (status === 'active') {
      query = query.gt('expires_at', new Date().toISOString());
    }

    if (user?.id) {
      query = query.eq('requester_id', user.id);
    }

    const { error } = await query;
    if (error) throw error;
  },

  // ─── Responses ────────────────────────────────────────

  async getResponses(requestId: string): Promise<RequestResponseRow[]> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestId)) {
      return [];
    }

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
    const { data: request, error: requestError } = await supabase
      .from('blood_requests')
      .select('status, expires_at')
      .eq('id', requestId)
      .maybeSingle();

    if (requestError) throw requestError;
    if (!request || isBloodRequestExpired(request as Pick<BloodRequestRow, 'status' | 'expires_at'>)) {
      throw new Error('This request has expired and is no longer accepting offers.');
    }
    if (request.status !== 'active') {
      throw new Error('This request is no longer accepting offers.');
    }

    const { error } = await supabase
      .from('request_responses')
      .insert({
        request_id: requestId,
        responder_id: responderId,
        message: message || null,
      });

    if (error) throw error;

    const { error: conversationError } = await supabase.rpc('create_request_conversation', {
      p_request_id: requestId,
      p_responder_id: responderId,
    });

    if (conversationError) {
      console.warn('[Requests] Could not open the request chat:', conversationError.message);
    }
  },

  async getOrCreateRequestConversation(
    requestId: string,
    responderId: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('create_request_conversation', {
      p_request_id: requestId,
      p_responder_id: responderId,
    });

    if (error) throw error;
    return data as string;
  },

  async updateResponseStatus(
    responseId: string,
    status: 'accepted' | 'declined' | 'completed' | 'cancelled'
  ): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    let query = supabase
      .from('request_responses')
      .update({ status })
      .eq('id', responseId);

    // If cancelling, ensure the caller is the responder
    if (user?.id && status === 'cancelled') {
      query = query.eq('responder_id', user.id);
    }

    const { error } = await query;
    if (error) throw error;
  },
};
