import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-retry-count, traceparent, tracestate, baggage',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function generateTemporaryPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ message: 'Method not allowed' }, 405);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[create-staff-account] Required Supabase environment is not configured');
    return jsonResponse({ message: 'Staff account creation is unavailable' }, 500);
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization) return jsonResponse({ message: 'Authentication required' }, 401);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) {
    return jsonResponse({ message: 'Authentication required' }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ message: 'Invalid request body' }, 400);
  }

  const organizationId =
    typeof body.organization_id === 'string' ? body.organization_id : '';
  const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const canRecordDonations = body.can_record_donations === true;

  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) {
    return jsonResponse({ message: 'Select a valid facility' }, 400);
  }
  if (!displayName || displayName.length > 100) {
    return jsonResponse({ message: 'Enter a staff name up to 100 characters' }, 400);
  }
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ message: 'Enter a valid staff email address' }, 400);
  }

  const [{ data: membership, error: membershipError }, { data: organization, error: organizationError }] =
    await Promise.all([
      adminClient
        .from('organization_members')
        .select('role, status')
        .eq('organization_id', organizationId)
        .eq('user_id', authData.user.id)
        .maybeSingle(),
      adminClient
        .from('organizations')
        .select('org_type, is_active')
        .eq('id', organizationId)
        .maybeSingle(),
    ]);

  if (membershipError || organizationError) {
    console.error('[create-staff-account] Could not verify facility access');
    return jsonResponse({ message: 'Could not verify facility access' }, 500);
  }
  if (
    !membership ||
    membership.status !== 'active' ||
    !['owner', 'admin'].includes(membership.role) ||
    !organization?.is_active ||
    !['hospital', 'blood_bank', 'ngo'].includes(organization.org_type)
  ) {
    return jsonResponse(
      { message: 'Only an active facility owner or admin can create staff accounts for an active health organization' },
      403,
    );
  }

  const temporaryPassword = generateTemporaryPassword();
  const temporaryPasswordHash = await hashPassword(temporaryPassword);
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { display_name: displayName },
    app_metadata: {
      account_type: 'facility_staff',
      must_change_password: true,
      temporary_password_hash: temporaryPasswordHash,
    },
  });

  if (createError || !created.user) {
    if (createError?.message.toLowerCase().includes('already')) {
      return jsonResponse(
        { message: 'An account already uses this email. Use a different work email or contact BloodIn support.' },
        409,
      );
    }
    console.error('[create-staff-account] Supabase could not create the account');
    return jsonResponse({ message: 'Could not create the staff account' }, 500);
  }

  const { error: insertError } = await adminClient.from('organization_members').insert({
    organization_id: organizationId,
    user_id: created.user.id,
    role: 'staff',
    status: 'active',
    can_record_donations: canRecordDonations,
  });

  if (insertError) {
    const { error: rollbackError } = await adminClient.auth.admin.deleteUser(created.user.id);
    if (rollbackError) {
      console.error('[create-staff-account] Failed to roll back an unassigned account');
    }
    console.error('[create-staff-account] Could not assign the account to the facility');
    return jsonResponse({ message: 'Could not assign the account to this facility' }, 500);
  }

  return jsonResponse({
    staff: {
      display_name: displayName,
      email,
    },
    temporary_password: temporaryPassword,
  });
};
