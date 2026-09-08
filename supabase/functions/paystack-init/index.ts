// Supabase Edge Function: paystack-init
// Initializes a Paystack transaction server-side using the secret key,
// so no secret ever touches the device. Supports test and live keys.
//
// Expects JSON body:
//   {
//     amount: number,          // in minor units (pesewas/kobo)
//     email: string,
//     currency?: string,       // default 'GHS'
//     callback_url?: string,
//     mode?: 'test' | 'live',  // which secret key to use
//     metadata?: object        // should include user_id so the webhook
//                              // can map the charge back to a user
//   }
//
// Deploy with default JWT verification (the app calls it with the anon key).
// The service-role access here is intentionally limited to inserting a
// pending `payments` row; premium grants happen only via the verified webhook.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const PREMIUM_AMOUNT = 2000;
const PREMIUM_CURRENCY = 'GHS';

const supabase = createClient(
  SUPABASE_URL,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { global: { headers: { 'x-client-info': 'paystack-init' } } },
);

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const authorization = req.headers.get('Authorization');
    if (!authorization || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401 });
    }
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData } = await authClient.auth.getUser();
    const user = authData.user;
    if (!user) return new Response(JSON.stringify({ message: 'Authentication required' }), { status: 401 });

    const body = await req.json();
    const mode = body?.mode === 'live' ? 'live' : 'test';
    const secret =
      mode === 'live'
        ? (Deno.env.get('PAYSTACK_LIVE_KEY') ?? Deno.env.get('PAYSTACK_SECRET_KEY'))
        : (Deno.env.get('PAYSTACK_SECRET_KEY') ?? Deno.env.get('PAYSTACK_LIVE_KEY'));

    if (!secret) {
      return new Response(
        JSON.stringify({ message: `Paystack secret not configured for mode: ${mode}` }),
        { status: 500 },
      );
    }

    const metadata = body.metadata ?? {};

    const initializePayload: Record<string, unknown> = {
      email: user.email,
      amount: PREMIUM_AMOUNT,
      currency: PREMIUM_CURRENCY,
      metadata: { ...metadata, user_id: user.id, premium_package: 'standard', mode },
    };
    if (body.callback_url) initializePayload.callback_url = body.callback_url;

    const resp = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(initializePayload),
    });

    const text = await resp.text();
    let json: { data?: { reference?: string | null } } = {};
    try {
      json = JSON.parse(text);
    } catch {
      // Keep the raw response for non-JSON errors below.
    }

    // Record a pending payment so a verified webhook can complete it later,
    // even if metadata is somehow dropped during redirect.
    const reference = json?.data?.reference ?? null;
    if (reference) {
      const { error: paymentError } = await supabase.from('payments').upsert(
        {
          user_id: user.id,
          reference,
          amount: PREMIUM_AMOUNT,
          currency: PREMIUM_CURRENCY,
          status: 'pending',
        },
        { onConflict: 'reference' },
      );
      if (paymentError) {
        return new Response(JSON.stringify({ message: 'Could not reserve payment reference' }), { status: 500 });
      }
    }

    return new Response(text, {
      status: resp.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : String(err) }),
      { status: 500 },
    );
  }
};