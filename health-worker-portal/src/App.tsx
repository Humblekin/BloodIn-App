import { type FormEvent, useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { getSafeSignInErrorMessage } from './lib/safeAuthError';

const DEV_SKIP_MFA =
  import.meta.env.VITE_DEV_SKIP_MFA === 'true' &&
  ['127.0.0.1', 'localhost'].includes(window.location.hostname);

type Phase = 'loading' | 'login' | 'password_change' | 'mfa' | 'enroll' | 'dashboard';

interface RecordingOrg {
  organization_id: string;
  organization_name: string;
  org_type: string;
  verification_level: string;
}

interface ApprovalOrg {
  organization_id: string;
  organization_name: string;
  org_type: string;
  verification_level: string;
}

interface ManageOrg {
  organization_id: string;
  organization_name: string;
  org_type: string;
  verification_level: string;
}

interface SystemFacility {
  id: string;
  name: string;
  org_type: 'hospital' | 'blood_bank' | 'ngo';
  verification_level: 'unverified' | 'basic' | 'verified' | 'premium';
  is_active: boolean;
  owner_count: number;
}

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  can_record_donations: boolean;
  display_name: string;
}

interface EmbeddedOrg {
  id: string;
  name: string;
  org_type: string;
  verification_level: string;
  is_active: boolean;
}

interface DonorLookup {
  user_id: string;
  display_name: string;
  blood_group: string | null;
  member_code: string;
  is_active: boolean;
}

interface DonorForCard extends DonorLookup {
  donation_count: number;
}

interface DonationLevel {
  level: number;
  minDonations: number;
  label: string;
}

interface TodayRecord {
  id: string;
  donor_id: string;
  donor_name: string;
  blood_group: string | null;
  donation_date: string;
  created_at: string;
  source: string | null;
  method: string | null;
}

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

const ACCESS_LOAD_TIMEOUT_MS = 15_000;

function withAccessLoadTimeout<T>(request: PromiseLike<T>, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`${label} did not respond within 15 seconds.`)),
      ACCESS_LOAD_TIMEOUT_MS
    );
  });

  return Promise.race([Promise.resolve(request), timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function getAccessLoadTimeoutMessage(error: unknown): string | null {
  return error instanceof Error && error.message.includes('did not respond within 15 seconds.')
    ? error.message
    : null;
}

function parseLevels(raw: unknown): DonationLevel[] {
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
    .filter((level): level is DonationLevel => level !== null)
    .sort((a, b) => a.minDonations - b.minDonations);
}

async function getEdgeFunctionErrorMessage(
  error: { message: string; context?: unknown }
): Promise<string> {
  if (error.context instanceof Response) {
    try {
      const body: unknown = await error.context.json();
      if (
        typeof body === 'object' &&
        body !== null &&
        'message' in body &&
        typeof body.message === 'string'
      ) {
        return body.message;
      }
    } catch {
      return error.message;
    }
  }
  return error.message;
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [dashboardAccessError, setDashboardAccessError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [mfaCode, setMfaCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaChallengeId, setMfaChallengeId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  const [orgs, setOrgs] = useState<RecordingOrg[]>([]);
  const [orgsLoaded, setOrgsLoaded] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState('');

  const [donorCode, setDonorCode] = useState('');
  const [donor, setDonor] = useState<DonorLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [recordBusy, setRecordBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [records, setRecords] = useState<TodayRecord[]>([]);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const [approvalOrgs, setApprovalOrgs] = useState<ApprovalOrg[]>([]);
  const [approvalOrgsLoaded, setApprovalOrgsLoaded] = useState(false);
  const [approvalOrgId, setApprovalOrgId] = useState('');
  const [levels, setLevels] = useState<DonationLevel[]>([]);

  const [cardCode, setCardCode] = useState('');
  const [cardDonor, setCardDonor] = useState<DonorForCard | null>(null);
  const [cardError, setCardError] = useState<string | null>(null);
  const [cardNotice, setCardNotice] = useState<string | null>(null);
  const [cardLookupBusy, setCardLookupBusy] = useState(false);
  const [cardIssueBusy, setCardIssueBusy] = useState(false);

  const [manageOrgs, setManageOrgs] = useState<ManageOrg[]>([]);
  const [manageOrgsLoaded, setManageOrgsLoaded] = useState(false);
  const [manageOrgId, setManageOrgId] = useState('');
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffError, setStaffError] = useState<string | null>(null);
  const [staffBusyId, setStaffBusyId] = useState<string | null>(null);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffCanRecord, setNewStaffCanRecord] = useState(true);
  const [createStaffBusy, setCreateStaffBusy] = useState(false);
  const [createdStaffCredential, setCreatedStaffCredential] = useState<{
    display_name: string;
    email: string;
    temporary_password: string;
  } | null>(null);
  const [systemFacilities, setSystemFacilities] = useState<SystemFacility[]>([]);
  const [systemFacilitiesError, setSystemFacilitiesError] = useState<string | null>(null);
  const [systemFacilitiesLoaded, setSystemFacilitiesLoaded] = useState(false);
  const [newFacilityName, setNewFacilityName] = useState('');
  const [newFacilityType, setNewFacilityType] = useState<SystemFacility['org_type']>('hospital');
  const [createFacilityBusy, setCreateFacilityBusy] = useState(false);
  const [ownerFacilityId, setOwnerFacilityId] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [createOwnerBusy, setCreateOwnerBusy] = useState(false);
  const [systemNotice, setSystemNotice] = useState<string | null>(null);
  const [createdOwnerCredential, setCreatedOwnerCredential] = useState<{
    display_name: string;
    email: string;
    temporary_password: string;
  } | null>(null);

  const [benefitEnabled, setBenefitEnabled] = useState(false);
  const [benefitTerms, setBenefitTerms] = useState('');
  const [benefitBusy, setBenefitBusy] = useState(false);
  const [benefitNotice, setBenefitNotice] = useState<string | null>(null);
  const [benefitError, setBenefitError] = useState<string | null>(null);

  const loadOrgs = useCallback(async () => {
    setOrgsLoaded(false);
    try {
      const { data, error } = await withAccessLoadTimeout(
        supabase.rpc('my_recording_organizations'),
        'Facility recording access'
      );
      if (error) {
        setAuthError(error.message);
        return;
      }
      const list = (data as RecordingOrg[] | null) ?? [];
      setOrgs(list);
      setSelectedOrgId((current) =>
        current && list.some((org) => org.organization_id === current)
          ? current
          : list[0]?.organization_id ?? ''
      );
      setAuthError(null);
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : 'Could not load facility recording access.'
      );
    } finally {
      setOrgsLoaded(true);
    }
  }, []);

  const loadApprovalAccess = useCallback(async () => {
    setApprovalOrgsLoaded(false);

    try {
      const [orgsRes, settingsRes] = await withAccessLoadTimeout(
        Promise.all([
          supabase.rpc('my_approval_organizations'),
          supabase
            .from('donation_programme_settings')
            .select('levels')
            .eq('id', true)
            .maybeSingle(),
        ]),
        'Donation approval access'
      );

      if (orgsRes.error) {
        setCardError(orgsRes.error.message);
      } else {
        const list = (orgsRes.data as ApprovalOrg[] | null) ?? [];
        setApprovalOrgs(list);
        setApprovalOrgId((current) =>
          current && list.some((org) => org.organization_id === current)
            ? current
            : list[0]?.organization_id ?? ''
        );
      }

      if (!settingsRes.error) {
        setLevels(parseLevels((settingsRes.data as { levels: unknown } | null)?.levels));
      }
    } catch (error) {
      const timeoutMessage = getAccessLoadTimeoutMessage(error);
      if (timeoutMessage) setDashboardAccessError(timeoutMessage);
      setCardError(
        error instanceof Error ? error.message : 'Could not load donation approval access.'
      );
    } finally {
      setApprovalOrgsLoaded(true);
    }
  }, []);

  const loadManageOrgs = useCallback(async () => {
    setManageOrgsLoaded(false);

    try {
      const { data: authData } = await withAccessLoadTimeout(
        supabase.auth.getUser(),
        'Facility management access'
      );
      const userId = authData.user?.id;
      if (!userId) return;

      const { data, error } = await withAccessLoadTimeout(
        supabase
          .from('organization_members')
          .select(
            'organization_id, role, organizations!inner(id, name, org_type, verification_level, is_active)'
          )
          .eq('user_id', userId)
          .eq('status', 'active')
          .in('role', ['owner', 'admin']),
        'Facility management access'
      );

      if (error) {
        setStaffError(error.message);
        return;
      }

      const rows =
        (data as unknown as Array<{
          organization_id: string;
          organizations: EmbeddedOrg | EmbeddedOrg[] | null;
        }> | null) ?? [];

      const seen = new Set<string>();
      const list: ManageOrg[] = [];

      for (const row of rows) {
        const org = Array.isArray(row.organizations)
          ? row.organizations[0] ?? null
          : row.organizations;
        if (!org || !org.is_active) continue;
        if (!['hospital', 'blood_bank', 'ngo'].includes(org.org_type)) continue;
        if (seen.has(row.organization_id)) continue;
        seen.add(row.organization_id);
        list.push({
          organization_id: row.organization_id,
          organization_name: org.name,
          org_type: org.org_type,
          verification_level: org.verification_level,
        });
      }

      list.sort((a, b) => a.organization_name.localeCompare(b.organization_name));
      setManageOrgs(list);
      setManageOrgId((current) =>
        current && list.some((org) => org.organization_id === current)
          ? current
          : list[0]?.organization_id ?? ''
      );
    } catch (error) {
      const timeoutMessage = getAccessLoadTimeoutMessage(error);
      if (timeoutMessage) setDashboardAccessError(timeoutMessage);
      setStaffError(
        error instanceof Error ? error.message : 'Could not load facility management access.'
      );
    } finally {
      setManageOrgsLoaded(true);
    }
  }, []);

  const loadSystemFacilities = useCallback(async () => {
    setSystemFacilitiesLoaded(false);
    setSystemFacilitiesError(null);

    try {
      const { data, error } = await withAccessLoadTimeout(
        supabase.functions.invoke('system-admin', {
          body: { action: 'list_facilities' },
        }),
        'System administration access'
      );
      if (error) {
        setSystemFacilitiesError(await getEdgeFunctionErrorMessage(error));
        setSystemFacilities([]);
        return;
      }

      const facilities = data?.facilities;
      if (!Array.isArray(facilities)) {
        setSystemFacilitiesError('The system administrator response was invalid.');
        setSystemFacilities([]);
        return;
      }
      setSystemFacilities(facilities as SystemFacility[]);
      setOwnerFacilityId((current) =>
        current &&
        facilities.some(
          (facility: SystemFacility) => facility.id === current && facility.is_active
        )
          ? current
          : facilities.find((facility: SystemFacility) => facility.is_active)?.id ?? ''
      );
    } catch (error) {
      const timeoutMessage = getAccessLoadTimeoutMessage(error);
      if (timeoutMessage) setDashboardAccessError(timeoutMessage);
      setSystemFacilitiesError(
        error instanceof Error ? error.message : 'Could not load system administration access.'
      );
      setSystemFacilities([]);
    } finally {
      setSystemFacilitiesLoaded(true);
    }
  }, []);

  const loadStaff = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      setStaff([]);
      return;
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select(
        'id, user_id, role, status, can_record_donations, profile:profiles!organization_members_user_id_fkey(display_name)'
      )
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .order('role');

    if (error) {
      setStaffError(error.message);
      setStaff([]);
      return;
    }

    setStaffError(null);
    const rows =
      (data as unknown as Array<{
        id: string;
        user_id: string;
        role: string;
        can_record_donations: boolean;
        profile: { display_name: string } | { display_name: string }[] | null;
      }> | null) ?? [];

    setStaff(
      rows.map((row) => {
        const profile = Array.isArray(row.profile) ? row.profile[0] ?? null : row.profile;
        return {
          id: row.id,
          user_id: row.user_id,
          role: row.role,
          can_record_donations: row.can_record_donations,
          display_name: profile?.display_name ?? 'Member',
        };
      })
    );
  }, []);

  const loadBenefit = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      setBenefitEnabled(false);
      setBenefitTerms('');
      return;
    }

    const { data, error } = await supabase
      .from('facility_donor_benefits')
      .select('free_blood_enabled, terms')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (error) {
      setBenefitError(error.message);
      return;
    }

    const benefit = data as { free_blood_enabled: boolean; terms: string | null } | null;
    setBenefitError(null);
    setBenefitEnabled(benefit?.free_blood_enabled ?? false);
    setBenefitTerms(benefit?.terms ?? '');
  }, []);

  const loadRecords = useCallback(async (organizationId: string) => {
    if (!organizationId) {
      setRecords([]);
      return;
    }
    const { data, error } = await supabase.rpc('organization_donations_today', {
      p_organization_id: organizationId,
    });
    if (error) {
      setRecordsError(error.message);
      setRecords([]);
      return;
    }
    setRecordsError(null);
    setRecords((data as TodayRecord[] | null) ?? []);
  }, []);

  const syncAuth = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const nextSession = data.session;
    setSession(nextSession);
    const systemAdmin = nextSession?.user.app_metadata?.system_role === 'system_admin';
    setIsSystemAdmin(systemAdmin);

    if (!nextSession) {
      setPhase('login');
      return;
    }

    if (nextSession.user.app_metadata?.must_change_password === true) {
      setPhase('password_change');
      return;
    }

    if (DEV_SKIP_MFA) {
      setDashboardAccessError(null);
      setPhase('dashboard');
      await Promise.all([
        loadOrgs(),
        loadApprovalAccess(),
        loadManageOrgs(),
        ...(systemAdmin ? [loadSystemFacilities()] : []),
      ]);
      return;
    }

    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal2') {
      setDashboardAccessError(null);
      setPhase('dashboard');
      await Promise.all([
        loadOrgs(),
        loadApprovalAccess(),
        loadManageOrgs(),
        ...(systemAdmin ? [loadSystemFacilities()] : []),
      ]);
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.find((item) => item.status === 'verified');

    if (!factor) {
      setPhase('enroll');
      return;
    }

    const { data: challenge, error } = await supabase.auth.mfa.challenge({
      factorId: factor.id,
    });

    if (error || !challenge) {
      setAuthError(error?.message ?? 'Could not start two-factor authentication.');
      setPhase('mfa');
      return;
    }

    setMfaFactorId(factor.id);
    setMfaChallengeId(challenge.id);
    setPhase('mfa');
  }, [loadOrgs, loadApprovalAccess, loadManageOrgs, loadSystemFacilities]);

  useEffect(() => {
    void syncAuth();
    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      void syncAuth();
    });
    return () => subscription.subscription.unsubscribe();
  }, [syncAuth]);

  useEffect(() => {
    if (phase === 'dashboard' && selectedOrgId) {
      void loadRecords(selectedOrgId);
    }
  }, [phase, selectedOrgId, loadRecords]);

  useEffect(() => {
    if (phase === 'dashboard' && manageOrgId) {
      void loadStaff(manageOrgId);
      void loadBenefit(manageOrgId);
    }
  }, [phase, manageOrgId, loadStaff, loadBenefit]);

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setAuthBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      setAuthError(getSafeSignInErrorMessage(error));
    }
    setAuthBusy(false);
  };

  const handleFirstPasswordChange = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword.length < 6) {
      setAuthError('Choose a password with at least 6 characters.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setAuthError('The passwords do not match.');
      return;
    }

    setAuthBusy(true);
    setAuthError(null);
    const { error: passwordError } = await supabase.auth.updateUser({ password: newPassword });
    if (passwordError && passwordError.code !== 'same_password') {
      setAuthError(passwordError.message);
      setAuthBusy(false);
      return;
    }

    const { error } = await supabase.functions.invoke('complete-staff-password-change', {
      body: { password: newPassword },
    });
    if (error) {
      setAuthError(await getEdgeFunctionErrorMessage(error));
      setAuthBusy(false);
      return;
    }

    setNewPassword('');
    setConfirmNewPassword('');
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      setAuthError('Password updated. Sign out, then sign in again with your new password to continue.');
      setAuthBusy(false);
      return;
    }
    await syncAuth();
    setAuthBusy(false);
  };

  const handleVerifyMfa = async (event: FormEvent) => {
    event.preventDefault();
    if (!mfaFactorId || !mfaChallengeId) return;
    setAuthBusy(true);
    setAuthError(null);
    const { error } = await supabase.auth.mfa.verify({
      factorId: mfaFactorId,
      challengeId: mfaChallengeId,
      code: mfaCode.trim(),
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setMfaCode('');
      await syncAuth();
    }
    setAuthBusy(false);
  };

  const handleEnroll = async () => {
    setAuthBusy(true);
    setAuthError(null);

    const { data: factors } = await supabase.auth.mfa.listFactors();
    const stale = factors?.totp?.filter((factor) => factor.status !== 'verified') ?? [];
    for (const factor of stale) {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
      friendlyName: 'BloodIn staff',
    });
    if (error || !data?.totp) {
      setAuthError(error?.message ?? 'Could not set up two-factor authentication.');
    } else {
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    }
    setAuthBusy(false);
  };

  const handleConfirmEnrollment = async (event: FormEvent) => {
    event.preventDefault();
    if (!enrollment) return;
    setAuthBusy(true);
    setAuthError(null);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
      factorId: enrollment.factorId,
    });
    if (challengeError || !challenge) {
      setAuthError(challengeError?.message ?? 'Could not start two-factor authentication.');
      setAuthBusy(false);
      return;
    }
    const { error } = await supabase.auth.mfa.verify({
      factorId: enrollment.factorId,
      challengeId: challenge.id,
      code: mfaCode.trim(),
    });
    if (error) {
      setAuthError(error.message);
    } else {
      setEnrollment(null);
      setMfaCode('');
      await syncAuth();
    }
    setAuthBusy(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsSystemAdmin(false);
    setPhase('login');
    setOrgs([]);
    setRecords([]);
    setDonor(null);
    setDonorCode('');
    setEnrollment(null);
    setAuthError(null);
    setApprovalOrgs([]);
    setCardDonor(null);
    setCardCode('');
    setCardError(null);
    setCardNotice(null);
    setManageOrgs([]);
    setStaff([]);
    setStaffError(null);
    setCreatedStaffCredential(null);
    setSystemFacilities([]);
    setCreatedOwnerCredential(null);
    setSystemNotice(null);
    setBenefitEnabled(false);
    setBenefitTerms('');
    setBenefitError(null);
    setBenefitNotice(null);
  };

  const handleLookup = async (event: FormEvent) => {
    event.preventDefault();
    const code = donorCode.trim().toUpperCase();
    if (!selectedOrgId) {
      setLookupError('Select a facility first.');
      return;
    }
    if (code.length < 6) {
      setLookupError('Enter the full card code.');
      return;
    }

    setLookupBusy(true);
    setLookupError(null);
    setNotice(null);
    setDonor(null);

    const { data, error } = await supabase.rpc('lookup_donor_for_recording', {
      p_donor_code: code,
      p_organization_id: selectedOrgId,
    });

    if (error) {
      setLookupError(error.message);
    } else {
      const rows = (data as DonorLookup[] | null) ?? [];
      if (rows.length === 0) {
        setLookupError('No donor card matches that code.');
      } else if (!rows[0].is_active) {
        setLookupError('That donor card is no longer active.');
      } else {
        setDonor(rows[0]);
      }
    }

    setLookupBusy(false);
  };

  const handleRecord = async () => {
    if (!donor || !selectedOrgId) return;
    setRecordBusy(true);
    setLookupError(null);
    setNotice(null);

    const { error } = await supabase.rpc('recognize_donation', {
      p_donor_code: donor.member_code,
      p_organization_id: selectedOrgId,
      p_method: 'code',
      p_notes: null,
    });

    if (error) {
      setLookupError(error.message);
    } else {
      setNotice(`Donation recorded for ${donor.display_name}.`);
      setDonor(null);
      setDonorCode('');
      await loadRecords(selectedOrgId);
    }

    setRecordBusy(false);
  };

  const handleCardLookup = async (event: FormEvent) => {
    event.preventDefault();
    const code = cardCode.trim().toUpperCase();
    if (!approvalOrgId) {
      setCardError('Select a facility first.');
      return;
    }
    if (code.length < 6) {
      setCardError('Enter the full card code.');
      return;
    }

    setCardLookupBusy(true);
    setCardError(null);
    setCardNotice(null);
    setCardDonor(null);

    const { data, error } = await supabase.rpc('lookup_donor_for_card', {
      p_donor_code: code,
      p_organization_id: approvalOrgId,
    });

    if (error) {
      setCardError(error.message);
    } else {
      const rows = (data as DonorForCard[] | null) ?? [];
      if (rows.length === 0) {
        setCardError('No donor card matches that code.');
      } else if (!rows[0].is_active) {
        setCardError('That donor card is no longer active.');
      } else {
        setCardDonor(rows[0]);
      }
    }

    setCardLookupBusy(false);
  };

  const eligibleLevel = cardDonor
    ? levels
        .filter((level) => cardDonor.donation_count >= level.minDonations)
        .sort((a, b) => b.minDonations - a.minDonations)[0] ?? null
    : null;

  const handleIssueCard = async () => {
    if (!cardDonor || !approvalOrgId || !eligibleLevel) return;
    setCardIssueBusy(true);
    setCardError(null);
    setCardNotice(null);

    const { data, error } = await supabase.rpc('issue_donor_card', {
      p_donor_code: cardDonor.member_code,
      p_organization_id: approvalOrgId,
    });

    if (error) {
      setCardError(error.message);
    } else {
      const card = (data as { level: number; expires_at: string | null }[] | null)?.[0];
      const expiry = card?.expires_at
        ? ` Valid until ${new Date(card.expires_at).toLocaleDateString()}.`
        : '';
      setCardNotice(
        `Special card issued for ${cardDonor.display_name} at Level ${
          card?.level ?? eligibleLevel.level
        }.${expiry}`
      );
      setCardDonor(null);
      setCardCode('');
    }

    setCardIssueBusy(false);
  };

  const handleToggleRecorder = async (member: StaffMember) => {
    if (!manageOrgId) return;
    setStaffBusyId(member.user_id);
    setStaffError(null);

    const { error } = await supabase.rpc('set_organization_recorder', {
      p_organization_id: manageOrgId,
      p_user_id: member.user_id,
      p_can_record: !member.can_record_donations,
    });

    if (error) {
      setStaffError(error.message);
    } else {
      await Promise.all([loadStaff(manageOrgId), loadOrgs()]);
    }

    setStaffBusyId(null);
  };

  const handleToggleFacilityAdmin = async (member: StaffMember) => {
    if (!manageOrgId || member.role === 'owner') return;
    setStaffBusyId(member.user_id);
    setStaffError(null);
    const { error } = await supabase
      .from('organization_members')
      .update({ role: member.role === 'admin' ? 'staff' : 'admin' })
      .eq('organization_id', manageOrgId)
      .eq('user_id', member.user_id)
      .eq('status', 'active');

    if (error) {
      setStaffError(error.message);
    } else {
      await loadStaff(manageOrgId);
    }
    setStaffBusyId(null);
  };

  const handleCreateStaffAccount = async (event: FormEvent) => {
    event.preventDefault();
    if (!manageOrgId) return;

    setCreateStaffBusy(true);
    setStaffError(null);
    setCreatedStaffCredential(null);
    const { data, error } = await supabase.functions.invoke('create-staff-account', {
      body: {
        organization_id: manageOrgId,
        display_name: newStaffName.trim(),
        email: newStaffEmail.trim(),
        can_record_donations: newStaffCanRecord,
      },
    });

    if (error) {
      setStaffError(await getEdgeFunctionErrorMessage(error));
      setCreateStaffBusy(false);
      return;
    }

    if (
      typeof data?.staff?.display_name !== 'string' ||
      typeof data.staff.email !== 'string' ||
      typeof data.temporary_password !== 'string'
    ) {
      setStaffError('The account was created, but its credentials were not returned. Contact BloodIn support before creating it again.');
      setCreateStaffBusy(false);
      return;
    }

    const credential = data as {
      staff: { display_name: string; email: string };
      temporary_password: string;
    };
    setCreatedStaffCredential({
      display_name: credential.staff.display_name,
      email: credential.staff.email,
      temporary_password: credential.temporary_password,
    });
    setNewStaffName('');
    setNewStaffEmail('');
    await Promise.all([loadStaff(manageOrgId), loadOrgs()]);
    setCreateStaffBusy(false);
  };

  const handleCopyTemporaryPassword = async () => {
    if (!createdStaffCredential) return;
    try {
      await navigator.clipboard.writeText(createdStaffCredential.temporary_password);
    } catch {
      setStaffError('Could not copy the password. Select and copy it manually.');
    }
  };

  const handleCreateFacility = async (event: FormEvent) => {
    event.preventDefault();
    setCreateFacilityBusy(true);
    setSystemFacilitiesError(null);
    setSystemNotice(null);

    const { data, error } = await supabase.functions.invoke('system-admin', {
      body: {
        action: 'create_facility',
        name: newFacilityName.trim(),
        org_type: newFacilityType,
      },
    });
    if (error) {
      setSystemFacilitiesError(await getEdgeFunctionErrorMessage(error));
    } else if (
      typeof data?.facility?.id !== 'string' ||
      typeof data.facility.name !== 'string'
    ) {
      setSystemFacilitiesError('The facility was created, but its details were not returned. Reload the facility list before trying again.');
    } else {
      setNewFacilityName('');
      setSystemNotice(`${data.facility.name} was added as unverified. Assign an owner and verify it before donation recording.`);
      await loadSystemFacilities();
      setOwnerFacilityId(data.facility.id);
    }

    setCreateFacilityBusy(false);
  };

  const handleSetFacilityVerification = async (
    facility: SystemFacility,
    verificationLevel: SystemFacility['verification_level']
  ) => {
    setSystemFacilitiesError(null);
    setSystemNotice(null);
    const { error } = await supabase.functions.invoke('system-admin', {
      body: {
        action: 'set_verification',
        organization_id: facility.id,
        verification_level: verificationLevel,
      },
    });
    if (error) {
      setSystemFacilitiesError(await getEdgeFunctionErrorMessage(error));
      return;
    }

    setSystemNotice(`${facility.name} verification updated.`);
    await loadSystemFacilities();
    await Promise.all([loadOrgs(), loadApprovalAccess(), loadManageOrgs()]);
  };

  const handleSetFacilityActive = async (facility: SystemFacility) => {
    setSystemFacilitiesError(null);
    setSystemNotice(null);
    const { error } = await supabase.functions.invoke('system-admin', {
      body: {
        action: 'set_facility_active',
        organization_id: facility.id,
        is_active: !facility.is_active,
      },
    });
    if (error) {
      setSystemFacilitiesError(await getEdgeFunctionErrorMessage(error));
      return;
    }

    setSystemNotice(`${facility.name} ${facility.is_active ? 'deactivated' : 'activated'}.`);
    await loadSystemFacilities();
    await Promise.all([loadOrgs(), loadApprovalAccess(), loadManageOrgs()]);
  };

  const handleCreateFacilityOwner = async (event: FormEvent) => {
    event.preventDefault();
    if (!ownerFacilityId) return;

    setCreateOwnerBusy(true);
    setSystemFacilitiesError(null);
    setSystemNotice(null);
    setCreatedOwnerCredential(null);
    const { data, error } = await supabase.functions.invoke('system-admin', {
      body: {
        action: 'create_owner',
        organization_id: ownerFacilityId,
        display_name: newOwnerName.trim(),
        email: newOwnerEmail.trim(),
      },
    });

    if (error) {
      setSystemFacilitiesError(await getEdgeFunctionErrorMessage(error));
      setCreateOwnerBusy(false);
      return;
    }
    if (
      typeof data?.owner?.display_name !== 'string' ||
      typeof data.owner.email !== 'string' ||
      typeof data.temporary_password !== 'string'
    ) {
      setSystemFacilitiesError('The owner account was created, but its credentials were not returned. Contact support before trying again.');
      setCreateOwnerBusy(false);
      return;
    }

    setCreatedOwnerCredential({
      display_name: data.owner.display_name,
      email: data.owner.email,
      temporary_password: data.temporary_password,
    });
    setNewOwnerName('');
    setNewOwnerEmail('');
    setSystemNotice('Facility owner account created. Share the temporary password directly; it is shown only once.');
    await loadSystemFacilities();
    setCreateOwnerBusy(false);
  };

  const handleCopyOwnerPassword = async () => {
    if (!createdOwnerCredential) return;
    try {
      await navigator.clipboard.writeText(createdOwnerCredential.temporary_password);
    } catch {
      setSystemFacilitiesError('Could not copy the password. Select and copy it manually.');
    }
  };

  const handleSaveBenefit = async () => {
    if (!manageOrgId) return;
    setBenefitBusy(true);
    setBenefitError(null);
    setBenefitNotice(null);

    const { error } = await supabase.from('facility_donor_benefits').upsert(
      {
        organization_id: manageOrgId,
        free_blood_enabled: benefitEnabled,
        terms: benefitTerms.trim() || null,
        updated_by: session?.user.id ?? null,
      },
      { onConflict: 'organization_id' }
    );

    if (error) {
      setBenefitError(error.message);
    } else {
      setBenefitNotice('Free blood terms saved.');
    }

    setBenefitBusy(false);
  };

  if (phase === 'loading') {
    return (
      <div className="auth-wrap">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  if (phase === 'login') {
    return (
      <div className="auth-wrap">
        <form className="card auth-card" onSubmit={handleSignIn}>
          <div className="brand" style={{ marginBottom: 16 }}>
            <span className="brand-mark">B</span>
            <div>
              BloodIn CareDesk
              <small>Health worker portal</small>
            </div>
          </div>
          <h1>Sign in</h1>
          <p className="muted">
            Staff accounts need two-factor authentication. Use the account your facility
            created for you.
          </p>
          {authError && <div className="alert error">{authError}</div>}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          <button className="button block" type="submit" disabled={authBusy}>
            {authBusy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    );
  }

  if (phase === 'password_change') {
    return (
      <div className="auth-wrap">
        <form className="card auth-card" onSubmit={handleFirstPasswordChange}>
          <h1>Set your password</h1>
          <p className="muted">
            Your facility admin gave you a temporary password. Create a new password before
            continuing. Use at least 6 characters; you’ll set up two-factor authentication next.
          </p>
          {authError && <div className="alert error">{authError}</div>}
          <div className="field">
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirmNewPassword">Confirm new password</label>
            <input
              id="confirmNewPassword"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              required
            />
          </div>
          <button className="button block" type="submit" disabled={authBusy}>
            {authBusy ? 'Updating…' : 'Update password'}
          </button>
          <button
            type="button"
            className="button secondary block"
            onClick={() => void handleSignOut()}
          >
            Sign out
          </button>
        </form>
      </div>
    );
  }

  if (phase === 'mfa') {
    return (
      <div className="auth-wrap">
        <form className="card auth-card" onSubmit={handleVerifyMfa}>
          <h1>Two-factor code</h1>
          <p className="muted">
            Open your authenticator app and enter the 6-digit code for BloodIn CareDesk.
          </p>
          {authError && <div className="alert error">{authError}</div>}
          <div className="field">
            <label htmlFor="mfa">Code</label>
            <input
              id="mfa"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={mfaCode}
              onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))}
              required
            />
          </div>
          <button className="button block" type="submit" disabled={authBusy}>
            {authBusy ? 'Checking…' : 'Verify'}
          </button>
          <button
            type="button"
            className="button secondary block"
            onClick={() => void handleSignOut()}
          >
            Use a different account
          </button>
        </form>
      </div>
    );
  }

  if (phase === 'enroll') {
    return (
      <div className="auth-wrap">
        <div className="card auth-card">
          <h1>Set up two-factor authentication</h1>
          <p className="muted">
            Your staff account needs an authenticator app before you can record donations.
          </p>
          {authError && <div className="alert error">{authError}</div>}
          {!enrollment ? (
            <button
              className="button block"
              onClick={() => void handleEnroll()}
              disabled={authBusy}
            >
              {authBusy ? 'Preparing…' : 'Set up authenticator'}
            </button>
          ) : (
            <form onSubmit={handleConfirmEnrollment}>
              <div className="qr-box">
                <img src={enrollment.qrCode} alt="Scan this QR code with your authenticator app" />
              </div>
              <p className="muted" style={{ marginTop: 12 }}>
                Scan the QR code, or add this secret manually:
              </p>
              <div className="secret">{enrollment.secret}</div>
              <div className="field">
                <label htmlFor="enrollCode">6-digit code</label>
                <input
                  id="enrollCode"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              <button className="button block" type="submit" disabled={authBusy}>
                {authBusy ? 'Checking…' : 'Activate 2FA'}
              </button>
            </form>
          )}
          <button
            type="button"
            className="button secondary block"
            onClick={() => void handleSignOut()}
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const hasAccess = orgs.length > 0 || approvalOrgs.length > 0 || manageOrgs.length > 0;
  const selectedManageOrg =
    manageOrgs.find((org) => org.organization_id === manageOrgId) ?? null;

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">B</span>
          <div>
            BloodIn CareDesk
            <small>Health worker portal</small>
          </div>
        </div>
        <div className="row">
          <span className="muted">{session?.user.email}</span>
          <button className="button secondary small" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      </header>

      <main className="container">
        {DEV_SKIP_MFA && (
          <div className="alert error" style={{ marginBottom: 16 }}>
            Developer trial mode: two-factor authentication is bypassed. Do not deploy this
            build.
          </div>
        )}
        {authError && <div className="alert error">{authError}</div>}
        {dashboardAccessError && (
          <div className="alert error">{dashboardAccessError}</div>
        )}

        {!orgsLoaded ||
        !approvalOrgsLoaded ||
        !manageOrgsLoaded ||
        (isSystemAdmin && !systemFacilitiesLoaded) ? (
          <p className="muted">Loading your access…</p>
        ) : !hasAccess && !isSystemAdmin ? (
          <div className="card">
            <h2 className="section-title">No staff access</h2>
            <p className="muted">
              Your account is signed in, but you are not a named recorder or leader at a
              verified hospital, blood bank, or NGO. Ask your facility owner to grant
              access.
            </p>
          </div>
        ) : (
          <>
            {isSystemAdmin && (
              <section className="card" style={{ marginBottom: 18 }}>
                <h2 className="section-title">System administration</h2>
                <p className="muted">
                  Manage health facilities across BloodIn and appoint facility owners. Each owner
                  can then create accounts for staff at their organization. New facilities start
                  unverified; donation recording remains unavailable until verified.
                </p>
                {systemFacilitiesError && !dashboardAccessError && (
                  <div className="alert error">{systemFacilitiesError}</div>
                )}
                {systemNotice && <div className="alert success">{systemNotice}</div>}

                <form onSubmit={handleCreateFacility}>
                  <h3 className="section-title">Add a facility</h3>
                  <div className="field">
                    <label htmlFor="newFacilityName">Facility name</label>
                    <input
                      id="newFacilityName"
                      maxLength={150}
                      value={newFacilityName}
                      onChange={(event) => setNewFacilityName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="newFacilityType">Facility type</label>
                    <select
                      id="newFacilityType"
                      value={newFacilityType}
                      onChange={(event) =>
                        setNewFacilityType(event.target.value as SystemFacility['org_type'])
                      }
                    >
                      <option value="hospital">Hospital</option>
                      <option value="blood_bank">Blood bank</option>
                      <option value="ngo">Health NGO</option>
                    </select>
                  </div>
                  <button className="button" type="submit" disabled={createFacilityBusy}>
                    {createFacilityBusy ? 'Adding…' : 'Add unverified facility'}
                  </button>
                </form>

                <form onSubmit={handleCreateFacilityOwner} style={{ marginTop: 26 }}>
                  <h3 className="section-title">Appoint a facility owner</h3>
                  <p className="muted">
                    Create an individual owner login and assign it to one active facility. The
                    owner must change the one-time temporary password and set up MFA before use.
                  </p>
                  <div className="field">
                    <label htmlFor="ownerFacility">Facility</label>
                    <select
                      id="ownerFacility"
                      value={ownerFacilityId}
                      onChange={(event) => setOwnerFacilityId(event.target.value)}
                      required
                    >
                      <option value="">Select a facility</option>
                      {systemFacilities
                        .filter((facility) => facility.is_active)
                        .map((facility) => (
                          <option key={facility.id} value={facility.id}>
                            {facility.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="newOwnerName">Owner name</label>
                    <input
                      id="newOwnerName"
                      autoComplete="name"
                      maxLength={100}
                      value={newOwnerName}
                      onChange={(event) => setNewOwnerName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="newOwnerEmail">Owner email</label>
                    <input
                      id="newOwnerEmail"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={newOwnerEmail}
                      onChange={(event) => setNewOwnerEmail(event.target.value)}
                      required
                    />
                  </div>
                  <button
                    className="button"
                    type="submit"
                    disabled={createOwnerBusy || !systemFacilities.some((facility) => facility.is_active)}
                  >
                    {createOwnerBusy ? 'Creating…' : 'Create owner login'}
                  </button>
                </form>

                {createdOwnerCredential && (
                  <div className="alert success" style={{ marginTop: 18 }}>
                    <strong>Owner account created for {createdOwnerCredential.display_name}.</strong>
                    <p className="muted">
                      Share these credentials directly. This temporary password is shown only once.
                    </p>
                    <p><strong>Email:</strong> {createdOwnerCredential.email}</p>
                    <p>
                      <strong>Temporary password:</strong>{' '}
                      <code className="temporary-password">
                        {createdOwnerCredential.temporary_password}
                      </code>
                    </p>
                    <div className="row">
                      <button
                        className="button small"
                        type="button"
                        onClick={() => void handleCopyOwnerPassword()}
                      >
                        Copy password
                      </button>
                      <button
                        className="button secondary small"
                        type="button"
                        onClick={() => setCreatedOwnerCredential(null)}
                      >
                        Hide credentials
                      </button>
                    </div>
                  </div>
                )}

                <h3 className="section-title" style={{ marginTop: 28 }}>Facilities</h3>
                {systemFacilities.length === 0 ? (
                  <div className="empty">No hospital, blood bank, or health NGO facilities yet.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Facility</th>
                        <th>Owners</th>
                        <th>Verification</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {systemFacilities.map((facility) => (
                        <tr key={facility.id}>
                          <td>{facility.name} <span className="muted">({facility.org_type.replace('_', ' ')})</span></td>
                          <td>{facility.owner_count}</td>
                          <td>
                            <select
                              aria-label={`Verification for ${facility.name}`}
                              value={facility.verification_level}
                              onChange={(event) =>
                                void handleSetFacilityVerification(
                                  facility,
                                  event.target.value as SystemFacility['verification_level']
                                )
                              }
                            >
                              <option value="unverified">Unverified</option>
                              <option value="basic">Basic</option>
                              <option value="verified">Verified</option>
                              <option value="premium">Premium</option>
                            </select>
                          </td>
                          <td>
                            <button
                              className="button secondary small"
                              type="button"
                              onClick={() => void handleSetFacilityActive(facility)}
                            >
                              {facility.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            )}

            {orgs.length > 0 && (
              <>
                <div className="card" style={{ marginBottom: 18 }}>
                  <div className="row between">
                    <div>
                      <h2 className="section-title">Recording as</h2>
                      <p className="muted">
                        Choose the facility where the donation is happening.
                      </p>
                    </div>
                    {orgs.length > 1 ? (
                      <div className="field" style={{ marginTop: 0, minWidth: 260 }}>
                        <label htmlFor="org">Facility</label>
                        <select
                          id="org"
                          value={selectedOrgId}
                          onChange={(event) => setSelectedOrgId(event.target.value)}
                        >
                          {orgs.map((org) => (
                            <option key={org.organization_id} value={org.organization_id}>
                              {org.organization_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="chip success">{orgs[0].organization_name}</span>
                    )}
                  </div>
                </div>

                <div className="grid">
                  <section className="card">
                    <h2 className="section-title">Record a donation</h2>
                    <p className="muted">
                      Type the code shown on the donor&apos;s BloodIn card. Only
                      today&apos;s donations can be recorded.
                    </p>
                    {notice && <div className="alert success">{notice}</div>}
                    {lookupError && <div className="alert error">{lookupError}</div>}
                    <form onSubmit={handleLookup}>
                      <div className="field">
                        <label htmlFor="donorCode">Donor card code</label>
                        <input
                          id="donorCode"
                          value={donorCode}
                          onChange={(event) => setDonorCode(event.target.value.toUpperCase())}
                          placeholder="e.g. 3F9A2C7B1D4E"
                          autoCapitalize="characters"
                          autoCorrect="off"
                          required
                        />
                      </div>
                      <button
                        className="button block"
                        type="submit"
                        disabled={lookupBusy || recordBusy}
                      >
                        {lookupBusy ? 'Looking up…' : 'Find donor'}
                      </button>
                    </form>

                    {donor && (
                      <div className="donor-preview">
                        <div className="donor-name">{donor.display_name}</div>
                        <div className="row" style={{ marginTop: 6 }}>
                          {donor.blood_group && (
                            <span className="chip">{donor.blood_group}</span>
                          )}
                          <span className="muted">{donor.member_code}</span>
                        </div>
                        <button
                          className="button block"
                          onClick={() => void handleRecord()}
                          disabled={recordBusy}
                        >
                          {recordBusy ? 'Recording…' : 'Record today’s donation'}
                        </button>
                      </div>
                    )}
                  </section>

                  <section className="card">
                    <div className="row between" style={{ marginBottom: 10 }}>
                      <div>
                        <h2 className="section-title">Today’s records</h2>
                        <p className="muted">Recorded by your facility today.</p>
                      </div>
                      <div className="stat">
                        <strong>{records.length}</strong>
                        <span>donations</span>
                      </div>
                    </div>

                    {recordsError && <div className="alert error">{recordsError}</div>}

                    {records.length === 0 ? (
                      <div className="empty">No donations recorded yet today.</div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>Donor</th>
                            <th>Blood</th>
                            <th>Time</th>
                            <th>Source</th>
                          </tr>
                        </thead>
                        <tbody>
                          {records.map((record) => (
                            <tr key={record.id}>
                              <td>{record.donor_name}</td>
                              <td>{record.blood_group ?? '—'}</td>
                              <td>
                                {new Date(record.created_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td>
                                <span
                                  className={`chip ${
                                    record.source === 'drive' ? 'drive' : ''
                                  }`}
                                >
                                  {record.source ?? 'facility'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </section>
                </div>
              </>
            )}

            {approvalOrgs.length > 0 && (
              <section className="card" style={{ marginTop: 18 }}>
                <h2 className="section-title">Approve a special donor card</h2>
                <p className="muted">
                  Enter the donor&apos;s card code to check their verified donations. Only
                  hospital and blood bank leaders can issue the special card.
                </p>

                {cardNotice && <div className="alert success">{cardNotice}</div>}
                {cardError && <div className="alert error">{cardError}</div>}

                {approvalOrgs.length > 1 ? (
                  <div className="field">
                    <label htmlFor="approvalOrg">Approving facility</label>
                    <select
                      id="approvalOrg"
                      value={approvalOrgId}
                      onChange={(event) => setApprovalOrgId(event.target.value)}
                    >
                      {approvalOrgs.map((org) => (
                        <option key={org.organization_id} value={org.organization_id}>
                          {org.organization_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="muted" style={{ marginTop: 8 }}>
                    Approving as <strong>{approvalOrgs[0].organization_name}</strong>.
                  </p>
                )}

                <form onSubmit={handleCardLookup}>
                  <div className="field">
                    <label htmlFor="cardCode">Donor card code</label>
                    <input
                      id="cardCode"
                      value={cardCode}
                      onChange={(event) => setCardCode(event.target.value.toUpperCase())}
                      placeholder="e.g. 3F9A2C7B1D4E"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      required
                    />
                  </div>
                  <button
                    className="button block"
                    type="submit"
                    disabled={cardLookupBusy || cardIssueBusy}
                  >
                    {cardLookupBusy ? 'Looking up…' : 'Find donor'}
                  </button>
                </form>

                {cardDonor && (
                  <div className="donor-preview">
                    <div className="donor-name">{cardDonor.display_name}</div>
                    <div className="row" style={{ marginTop: 6 }}>
                      {cardDonor.blood_group && (
                        <span className="chip">{cardDonor.blood_group}</span>
                      )}
                      <span className="muted">
                        {cardDonor.donation_count} verified donation
                        {cardDonor.donation_count === 1 ? '' : 's'}
                      </span>
                    </div>

                    {eligibleLevel ? (
                      <>
                        <p className="muted" style={{ marginTop: 10 }}>
                          Eligible for <strong>{eligibleLevel.label}</strong> (
                          {eligibleLevel.minDonations} donations).
                        </p>
                        <button
                          className="button block"
                          onClick={() => void handleIssueCard()}
                          disabled={cardIssueBusy}
                        >
                          {cardIssueBusy
                            ? 'Issuing…'
                            : `Approve ${eligibleLevel.label} card`}
                        </button>
                      </>
                    ) : (
                      <div className="alert warning">
                        This donor has not reached the first card level yet.
                      </div>
                    )}
                  </div>
                )}

                <p className="footer-note">
                  The card is issued by BloodIn and records the approving facility.
                  Free-blood terms are set by each hospital separately.
                </p>
              </section>
            )}

            {manageOrgs.length > 0 && (
              <section className="card" style={{ marginTop: 18 }}>
                <h2 className="section-title">Recording staff</h2>
                <p className="muted">
                  Only people marked here can record donations for this facility.
                </p>

                {staffError && <div className="alert error">{staffError}</div>}

                {createdStaffCredential && (
                  <div className="alert success">
                    <strong>Account created for {createdStaffCredential.display_name}.</strong>
                    <p className="muted">
                      Share these credentials directly with the worker. The temporary password
                      is shown only once; they must change it and set up two-factor authentication
                      when they sign in.
                    </p>
                    <p>
                      <strong>Email:</strong> {createdStaffCredential.email}
                    </p>
                    <p>
                      <strong>Temporary password:</strong>{' '}
                      <code className="temporary-password">
                        {createdStaffCredential.temporary_password}
                      </code>
                    </p>
                    <div className="row">
                      <button
                        className="button small"
                        type="button"
                        onClick={() => void handleCopyTemporaryPassword()}
                      >
                        Copy password
                      </button>
                      <button
                        className="button secondary small"
                        type="button"
                        onClick={() => setCreatedStaffCredential(null)}
                      >
                        Hide credentials
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleCreateStaffAccount}>
                  <h3 className="section-title">Create staff login</h3>
                  <p className="muted">
                    Create an individual account for a health worker. Their temporary password
                    will be shown to you once.
                  </p>
                  <div className="field">
                    <label htmlFor="newStaffName">Staff member name</label>
                    <input
                      id="newStaffName"
                      autoComplete="name"
                      maxLength={100}
                      value={newStaffName}
                      onChange={(event) => setNewStaffName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="newStaffEmail">Staff member email</label>
                    <input
                      id="newStaffEmail"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={newStaffEmail}
                      onChange={(event) => setNewStaffEmail(event.target.value)}
                      required
                    />
                  </div>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={newStaffCanRecord}
                      onChange={(event) => setNewStaffCanRecord(event.target.checked)}
                    />
                    Allow this worker to record donations
                  </label>
                  <button
                    className="button block"
                    type="submit"
                    disabled={createStaffBusy || !manageOrgId}
                  >
                    {createStaffBusy ? 'Creating account…' : 'Create staff account'}
                  </button>
                </form>

                {manageOrgs.length > 1 ? (
                  <div className="field">
                    <label htmlFor="manageOrg">Facility</label>
                    <select
                      id="manageOrg"
                      value={manageOrgId}
                      onChange={(event) => setManageOrgId(event.target.value)}
                    >
                      {manageOrgs.map((org) => (
                        <option key={org.organization_id} value={org.organization_id}>
                          {org.organization_name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="muted" style={{ marginTop: 8 }}>
                    Managing <strong>{manageOrgs[0].organization_name}</strong>.
                  </p>
                )}

                {selectedManageOrg && !['verified', 'premium'].includes(selectedManageOrg.verification_level) && (
                  <div className="alert warning">
                    This facility is not verified yet. You can set up staff accounts, but donation
                    recording remains disabled until BloodIn verifies the facility.
                  </div>
                )}

                {staff.length === 0 ? (
                  <div className="empty">No active staff members yet.</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Facility admin</th>
                        <th>Can record</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staff.map((member) => (
                        <tr key={member.id}>
                          <td>{member.display_name}</td>
                          <td>{member.role}</td>
                          <td>
                            {member.role === 'owner' ? (
                              <span className="muted">Owner</span>
                            ) : (
                              <button
                                className="button secondary small"
                                onClick={() => void handleToggleFacilityAdmin(member)}
                                disabled={staffBusyId === member.user_id}
                              >
                                {staffBusyId === member.user_id
                                  ? 'Saving…'
                                  : member.role === 'admin'
                                  ? 'Remove admin'
                                  : 'Make admin'}
                              </button>
                            )}
                          </td>
                          <td>
                            <button
                              className={`button small ${
                                member.can_record_donations ? 'secondary' : ''
                              }`}
                              onClick={() => void handleToggleRecorder(member)}
                              disabled={staffBusyId === member.user_id}
                            >
                              {staffBusyId === member.user_id
                                ? 'Saving…'
                                : member.can_record_donations
                                ? 'Stop recording'
                                : 'Allow recording'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {selectedManageOrg &&
                  (selectedManageOrg.org_type === 'hospital' ||
                    selectedManageOrg.org_type === 'blood_bank') && (
                    <div style={{ marginTop: 22 }}>
                      <h3 className="section-title">Free blood coverage</h3>
                      <p className="muted">
                        Shown on the special card for donors this facility approves.
                      </p>

                      {benefitNotice && (
                        <div className="alert success">{benefitNotice}</div>
                      )}
                      {benefitError && <div className="alert error">{benefitError}</div>}

                      <label className="checkbox-row">
                        <input
                          type="checkbox"
                          checked={benefitEnabled}
                          onChange={(event) => setBenefitEnabled(event.target.checked)}
                        />
                        Offer free blood to special cardholders
                      </label>

                      <div className="field">
                        <label htmlFor="benefitTerms">Terms</label>
                        <textarea
                          id="benefitTerms"
                          rows={3}
                          value={benefitTerms}
                          onChange={(event) => setBenefitTerms(event.target.value)}
                          placeholder="e.g. One free unit per year for the cardholder"
                        />
                      </div>

                      <button
                        className="button small"
                        onClick={() => void handleSaveBenefit()}
                        disabled={benefitBusy}
                      >
                        {benefitBusy ? 'Saving…' : 'Save terms'}
                      </button>
                    </div>
                  )}
              </section>
            )}

            <p className="footer-note">
              Donation records cannot be edited or deleted. If a mistake is made, contact
              BloodIn support. Donations are always dated today.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
