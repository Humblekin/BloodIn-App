import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@^2/cors';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function jsonResponse(message: string, status = 200): Response {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const handleRequest = async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse('Method not allowed', 405);

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[complete-staff-password-change] Required Supabase environment is not configured');
    return jsonResponse('Password change completion is unavailable', 500);
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization) return jsonResponse('Authentication required', 401);

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await authClient.auth.getUser();
  if (authError || !authData.user) return jsonResponse('Authentication required', 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return jsonResponse('Invalid request body', 400);
  }
  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 6 || password.length > 128) {
    return jsonResponse('Choose a password with at least 6 characters', 400);
  }

  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
    authData.user.id,
  );
  const user = userData.user;
  if (userError || !user) {
    console.error('[complete-staff-password-change] Could not verify the staff account');
    return jsonResponse('Could not verify the password change', 500);
  }
  if (user.app_metadata?.must_change_password !== true) {
    return jsonResponse('No temporary password change is required', 400);
  }

  const temporaryPasswordHash = user.app_metadata?.temporary_password_hash;
  if (typeof temporaryPasswordHash !== 'string') {
    console.error('[complete-staff-password-change] Temporary password hash is missing');
    return jsonResponse('Could not verify the temporary password', 500);
  }

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  const passwordHash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0')
  ).join('');
  if (passwordHash === temporaryPasswordHash) {
    return jsonResponse('Change your temporary password before continuing', 400);
  }

  const appMetadata = { ...user.app_metadata };
  delete appMetadata.must_change_password;
  delete appMetadata.temporary_password_hash;
  const { error: updateError } = await adminClient.auth.admin.updateUserById(authData.user.id, {
    password,
    app_metadata: appMetadata,
  });
  if (updateError) {
    console.error('[complete-staff-password-change] Could not update the staff password');
    return jsonResponse(updateError.message, 400);
  }

  return jsonResponse('Password change completed');
};

export default { fetch: handleRequest };
