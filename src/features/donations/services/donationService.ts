// Project LifeOrbit — Donate Programme Service
// Opt-in donor card (unique card code + QR), the donation recognition ledger,
// and the special donor card issued after a verified facility approves it.
import { supabase } from '@/lib/supabase/client';

export interface DonorLevel {
  level: number;
  minDonations: number;
  label: string;
}

export type DonorCardStatus = 'active' | 'suspended' | 'revoked' | 'expired';

export interface SpecialCard {
  level: number;
  levelLabel: string;
  status: DonorCardStatus;
  issuedAt: string;
  expiresAt: string | null;
  approvedByOrganizationId: string | null;
  approvedByOrganizationName: string | null;
  nextLevel: DonorLevel | null;
  donationsToNextLevel: number | null;
  freeBloodEnabled: boolean;
  freeBloodTerms: string | null;
}

export interface DonorCard {
  memberCode: string;
  joinedAt: string;
  isActive: boolean;
  recognitionCount: number;
  lastRecognitionDate: string | null;
  levels: DonorLevel[];
  specialCard: SpecialCard | null;
}

export interface RecognitionRecord {
  id: string;
  donationDate: string;
  locationLabel: string | null;
  organizationId: string | null;
  source: 'facility' | 'drive' | null;
  method: 'qr' | 'code' | null;
}

export interface RecogniseDonationInput {
  donorCode: string;
  organizationId: string;
  method?: 'qr' | 'code';
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
  organization_id: string | null;
  source: 'facility' | 'drive' | null;
  method: 'qr' | 'code' | null;
}

interface SettingsRow {
  levels: unknown;
}

interface DonorCardRow {
  level: number;
  status: DonorCardStatus;
  issued_at: string;
  expires_at: string | null;
  approved_by_organization_id: string | null;
}

function parseLevels(raw: unknown): DonorLevel[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      if (typeof item !== 'object' || item === null) return null;
      const record = item as Record<string, unknown>;
      const level = Number(record.level);
      const minDonations = Number(record.min_donations);
      const label =
        typeof record.label === 'string' && record.label.length > 0
          ? record.label
          : `Level ${level}`;
      if (!Number.isFinite(level) || !Number.isFinite(minDonations)) return null;
      return { level, minDonations, label };
    })
    .filter((level): level is DonorLevel => level !== null)
    .sort((a, b) => a.minDonations - b.minDonations);
}

export const donationService = {
  async getMyCard(): Promise<DonorCard | null> {
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    const userId = authData.user?.id;
    if (!userId) return null;

    const [memberRes, countRes, latestRes, settingsRes, cardRes] = await Promise.all([
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
      supabase
        .from('donation_programme_settings')
        .select('levels')
        .eq('id', true)
        .maybeSingle(),
      supabase
        .from('donor_cards')
        .select('level, status, issued_at, expires_at, approved_by_organization_id')
        .eq('user_id', userId)
        .maybeSingle(),
    ]);

    if (memberRes.error) throw memberRes.error;
    if (countRes.error) throw countRes.error;
    if (latestRes.error) throw latestRes.error;
    if (settingsRes.error) throw settingsRes.error;
    if (cardRes.error) throw cardRes.error;

    const member = memberRes.data as MemberRow | null;
    if (!member) return null;

    const recognitionCount = countRes.count ?? 0;
    const lastRecognitionDate =
      (latestRes.data as { donation_date: string }[] | null)?.[0]?.donation_date ?? null;
    const levels = parseLevels((settingsRes.data as SettingsRow | null)?.levels);
    const card = cardRes.data as DonorCardRow | null;

    let specialCard: SpecialCard | null = null;

    if (card) {
      const nextLevel =
        levels.find((level) => level.minDonations > recognitionCount) ?? null;
      const levelLabel =
        levels.find((level) => level.level === card.level)?.label ?? `Level ${card.level}`;

      let organizationName: string | null = null;
      let freeBloodEnabled = false;
      let freeBloodTerms: string | null = null;

      if (card.approved_by_organization_id) {
        const [orgRes, benefitRes] = await Promise.all([
          supabase
            .from('organizations')
            .select('name')
            .eq('id', card.approved_by_organization_id)
            .maybeSingle(),
          supabase
            .from('facility_donor_benefits')
            .select('free_blood_enabled, terms')
            .eq('organization_id', card.approved_by_organization_id)
            .maybeSingle(),
        ]);

        if (orgRes.error) throw orgRes.error;
        if (benefitRes.error) throw benefitRes.error;

        organizationName =
          (orgRes.data as { name: string } | null)?.name ?? null;
        const benefit = benefitRes.data as
          | { free_blood_enabled: boolean; terms: string | null }
          | null;
        freeBloodEnabled = benefit?.free_blood_enabled ?? false;
        freeBloodTerms = benefit?.terms ?? null;
      }

      specialCard = {
        level: card.level,
        levelLabel,
        status: card.status,
        issuedAt: card.issued_at,
        expiresAt: card.expires_at,
        approvedByOrganizationId: card.approved_by_organization_id,
        approvedByOrganizationName: organizationName,
        nextLevel,
        donationsToNextLevel: nextLevel
          ? Math.max(0, nextLevel.minDonations - recognitionCount)
          : null,
        freeBloodEnabled,
        freeBloodTerms,
      };
    }

    return {
      memberCode: member.member_code,
      joinedAt: member.joined_at,
      isActive: member.is_active,
      recognitionCount,
      lastRecognitionDate,
      levels,
      specialCard,
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
      p_organization_id: input.organizationId,
      p_method: input.method ?? 'code',
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
      organizationId: row.organization_id,
      source: row.source,
      method: row.method,
    };
  },
};
