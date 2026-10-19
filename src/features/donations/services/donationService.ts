// Project LifeOrbit — Donate Programme Service
// Opt-in donor card (unique card code + QR) and the donation recognition
// ledger. All mutations run through SECURITY DEFINER RPCs; reads rely on RLS.
import { supabase } from '@/lib/supabase/client';

export interface DonorCard {
  memberCode: string;
  joinedAt: string;
  isActive: boolean;
  recognitionCount: number;
  lastRecognitionDate: string | null;
}

export interface RecognitionRecord {
  id: string;
  donationDate: string;
  locationLabel: string | null;
}

export interface RecogniseDonationInput {
  donorCode: string;
  donationDate?: string;
  locationLabel?: string;
  notes?: string;
}

interface MemberRow {
  member_code: string;
  joined_at: string;
  is_active: boolean;
}

interface RecognitionRow {
  id: string;
  donation_date: string;
  location_label: string | null;
}

export const donationService = {
  async getMyCard(): Promise<DonorCard | null> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) return null;

    const [memberRes, countRes, latestRes] = await Promise.all([
      supabase
        .from('donation_program_members')
        .select('member_code, joined_at, is_active')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('donation_recognitions')
        .select('id', { count: 'exact', head: true })
        .eq('donor_id', userId),
      supabase
        .from('donation_recognitions')
        .select('donation_date')
        .eq('donor_id', userId)
        .order('donation_date', { ascending: false })
        .limit(1),
    ]);

    if (memberRes.error) throw memberRes.error;
    if (countRes.error) throw countRes.error;
    if (latestRes.error) throw latestRes.error;

    const member = memberRes.data as MemberRow | null;
    if (!member) return null;

    return {
      memberCode: member.member_code,
      joinedAt: member.joined_at,
      isActive: member.is_active,
      recognitionCount: countRes.count ?? 0,
      lastRecognitionDate: (latestRes.data as { donation_date: string }[] | null)?.[0]?.donation_date ?? null,
    };
  },

  async joinProgramme(): Promise<DonorCard | null> {
    const { error } = await supabase.rpc('join_donation_programme');
    if (error) throw error;
    return donationService.getMyCard();
  },

  async leaveProgramme(): Promise<void> {
    const { error } = await supabase.rpc('leave_donation_programme');
    if (error) throw error;
  },

  async recogniseDonation(input: RecogniseDonationInput): Promise<RecognitionRecord> {
    const { data, error } = await supabase.rpc('recognize_donation', {
      p_donor_code: input.donorCode,
      p_donation_date: input.donationDate,
      p_location_label: input.locationLabel ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) throw error;

    const rows = data as RecognitionRow[] | null;
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (!row) {
      throw new Error('The donation could not be recorded.');
    }

    return {
      id: row.id,
      donationDate: row.donation_date,
      locationLabel: row.location_label,
    };
  },
};
