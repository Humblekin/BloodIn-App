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

const HEALTH_ORG_TYPES = ['hospital', 'blood_bank', 'ngo'] as const;
const VERIFICATION_LEVELS = ['unverified', 'basic', 'verified', 'premium'] as const;
type SystemVerificationLevel = (typeof VERIFICATION_LEVELS)[number];

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
    console.error('[system-admin] Required Supabase environment is not configured');
    return jsonResponse({ message: 'System administration is unavailable' }, 500);
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
  if (authData.user.app_metadata?.system_role !== 'system_admin') {
    return jsonResponse({ message: 'System administrator access required' }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ message: 'Invalid request body' }, 400);
  }

  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'list_facilities') {
    const facilities: Array<{
      id: string;
      name: string;
      org_type: string;
      verification_level: SystemVerificationLevel;
      is_active: boolean;
    }> = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await adminClient
        .from('organizations')
        .select('id, name, org_type, verification_level, is_active')
        .in('org_type', [...HEALTH_ORG_TYPES])
        .order('name')
        .range(offset, offset + 499);
      if (error) {
        console.error('[system-admin] Could not load facility list');
        return jsonResponse({ message: 'Could not load facilities' }, 500);
      }
      facilities.push(...(data ?? []));
      if (!data || data.length < 500) break;
    }

    const ownerCounts = new Map<string, number>();
    for (let offset = 0; ; offset += 500) {
      const { data: owners, error } = await adminClient
        .from('organization_members')
        .select('organization_id')
        .eq('role', 'owner')
        .eq('status', 'active')
        .range(offset, offset + 499);
      if (error) {
        console.error('[system-admin] Could not load facility owners');
        return jsonResponse({ message: 'Could not load facility owners' }, 500);
      }
      for (const owner of owners ?? []) {
        ownerCounts.set(owner.organization_id, (ownerCounts.get(owner.organization_id) ?? 0) + 1);
      }
      if (!owners || owners.length < 500) break;
    }

    return jsonResponse({
      facilities: (facilities ?? []).map((facility) => ({
        ...facility,
        owner_count: ownerCounts.get(facility.id) ?? 0,
      })),
    });
  }

  if (action === 'create_facility') {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const orgType = typeof body.org_type === 'string' ? body.org_type : '';
    const slugInput = typeof body.slug === 'string' ? body.slug.trim().toLowerCase() : '';
    const slug = slugInput || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    if (name.length < 3 || name.length > 150) {
      return jsonResponse({ message: 'Facility name must be between 3 and 150 characters' }, 400);
    }
    if (!(HEALTH_ORG_TYPES as readonly string[]).includes(orgType)) {
      return jsonResponse({ message: 'Choose a hospital, blood bank, or NGO' }, 400);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 160) {
      return jsonResponse({ message: 'Enter a valid unique facility slug' }, 400);
    }

    const { data: duplicate, error: duplicateError } = await adminClient
      .from('organizations')
      .select('id')
      .ilike('name', name)
      .limit(1)
      .maybeSingle();
    if (duplicateError) {
      console.error('[system-admin] Could not verify facility name uniqueness');
      return jsonResponse({ message: 'Could not check the facility name' }, 500);
    }
    if (duplicate) return jsonResponse({ message: 'A facility with that name already exists' }, 409);

    const { data: created, error } = await adminClient
      .from('organizations')
      .insert({
        name,
        slug,
        org_type: orgType,
        verification_level: 'unverified',
        is_active: true,
        created_by: authData.user.id,
      })
      .select('id, name, org_type, verification_level, is_active')
      .single();

    if (error || !created) {
      if (error?.code === '23505') {
        return jsonResponse({ message: 'That facility slug is already in use' }, 409);
      }
      console.error('[system-admin] Could not create facility');
      return jsonResponse({ message: 'Could not create facility' }, 500);
    }

    return jsonResponse({ facility: { ...created, owner_count: 0 } }, 201);
  }

  if (action === 'set_verification') {
    const organizationId = typeof body.organization_id === 'string' ? body.organization_id : '';
    const verificationLevel =
      typeof body.verification_level === 'string' ? body.verification_level : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) {
      return jsonResponse({ message: 'Select a valid facility' }, 400);
    }
    if (!(VERIFICATION_LEVELS as readonly string[]).includes(verificationLevel)) {
      return jsonResponse({ message: 'Select a valid verification level' }, 400);
    }

    const { data: updated, error } = await adminClient
      .from('organizations')
      .update({ verification_level: verificationLevel })
      .eq('id', organizationId)
      .in('org_type', [...HEALTH_ORG_TYPES])
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('[system-admin] Could not update facility verification');
      return jsonResponse({ message: 'Could not update facility verification' }, 500);
    }
    if (!updated) return jsonResponse({ message: 'Facility not found' }, 404);

    return jsonResponse({ message: 'Facility verification updated' });
  }

  if (action === 'set_facility_active') {
    const organizationId = typeof body.organization_id === 'string' ? body.organization_id : '';
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) {
      return jsonResponse({ message: 'Select a valid facility' }, 400);
    }
    if (typeof body.is_active !== 'boolean') {
      return jsonResponse({ message: 'Select whether the facility should be active' }, 400);
    }

    const { data: updated, error } = await adminClient
      .from('organizations')
      .update({ is_active: body.is_active })
      .eq('id', organizationId)
      .in('org_type', [...HEALTH_ORG_TYPES])
      .select('id')
      .maybeSingle();
    if (error) {
      console.error('[system-admin] Could not update facility status');
      return jsonResponse({ message: 'Could not update facility status' }, 500);
    }
    if (!updated) return jsonResponse({ message: 'Facility not found' }, 404);

    return jsonResponse({ message: 'Facility status updated' });
  }

  if (action === 'create_owner') {
    const organizationId = typeof body.organization_id === 'string' ? body.organization_id : '';
    const displayName = typeof body.display_name === 'string' ? body.display_name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';

    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(organizationId)) {
      return jsonResponse({ message: 'Select a valid facility' }, 400);
    }
    if (!displayName || displayName.length > 100) {
      return jsonResponse({ message: 'Enter an owner name up to 100 characters' }, 400);
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ message: 'Enter a valid owner email address' }, 400);
    }

    const { data: facility, error: facilityError } = await adminClient
      .from('organizations')
      .select('id, org_type, is_active')
      .eq('id', organizationId)
      .maybeSingle();
    if (facilityError) {
      console.error('[system-admin] Could not verify facility for owner assignment');
      return jsonResponse({ message: 'Could not verify the selected facility' }, 500);
    }
    if (
      !facility ||
      !facility.is_active ||
      !(HEALTH_ORG_TYPES as readonly string[]).includes(facility.org_type)
    ) {
      return jsonResponse({ message: 'Choose an active hospital, blood bank, or NGO' }, 400);
    }

    const temporaryPassword = generateTemporaryPassword();
    const temporaryPasswordHash = await hashPassword(temporaryPassword);
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { display_name: displayName },
      app_metadata: {
        account_type: 'facility_owner',
        must_change_password: true,
        temporary_password_hash: temporaryPasswordHash,
      },
    });

    if (createError || !created.user) {
      if (createError?.message.toLowerCase().includes('already')) {
        return jsonResponse(
          { message: 'An account already uses this email. Use a different email or contact BloodIn support.' },
          409,
        );
      }
      console.error('[system-admin] Supabase could not create the facility owner account');
      return jsonResponse({ message: 'Could not create the facility owner account' }, 500);
    }

    const { error: insertError } = await adminClient.from('organization_members').insert({
      organization_id: organizationId,
      user_id: created.user.id,
      role: 'owner',
      status: 'active',
    });

    if (insertError) {
      const { error: rollbackError } = await adminClient.auth.admin.deleteUser(created.user.id);
      if (rollbackError) {
        console.error('[system-admin] Failed to roll back an unassigned owner account');
      }
      console.error('[system-admin] Could not assign the owner account to the facility');
      return jsonResponse({ message: 'Could not assign the owner to this facility' }, 500);
    }

    return jsonResponse({
      owner: { display_name: displayName, email, organization_id: organizationId },
      temporary_password: temporaryPassword,
    }, 201);
  }

  return jsonResponse({ message: 'Unknown system administration action' }, 400);
};
