// Supabase Edge Function: paystack-webhook
// Receives Paystack webhooks, verifies the HMAC signature against BOTH the
// test and live secret keys (so one endpoint works in either mode), then
// records the payment and grants premium on a successful charge.
//
// Deploy with --no-verify-jwt: Paystack does not send a Supabase JWT.
// Security is enforced by the x-paystack-signature check below.

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const PAYSTACK_SECRETS: string[] = [
  Deno.env.get('PAYSTACK_SECRET_KEY'),
  Deno.env.get('PAYSTACK_LIVE_KEY'),
].filter((v) => typeof v === 'string' && v.length > 0) as string[];
const PREMIUM_AMOUNT = 2000;
const PREMIUM_CURRENCY = 'GHS';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, {
  global: { headers: { 'x-client-info': 'paystack-webhook' } },
});

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return bytes;
}

async function verifySignature(payload: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);

  for (const secret of PAYSTACK_SECRETS) {
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-512' },
        false,
        ['verify'],
      );
      const ok = await crypto.subtle.verify('HMAC', key, hexToBytes(signature), data);
      if (ok) return true;
    } catch {
      // Try the next secret.
    }
  }
  return false;
}

export default async (req: Request) => {
  try {
    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const verified = await verifySignature(raw, signature);
    if (!verified) return new Response('Invalid signature', { status: 401 });

    const event = JSON.parse(raw);
    const data = event?.data ?? {};
    const reference: string | null = data.reference ?? null;
    const status = event?.event === 'charge.success' ? 'success' : String(event?.event ?? 'unknown');
    const userId: string | null = data?.metadata?.user_id ?? null;

    const paymentRow: Record<string, unknown> = { reference, status, raw_response: event };
    if (userId) paymentRow.user_id = userId;
    if (typeof data.amount === 'number') paymentRow.amount = data.amount;
    if (data.currency) paymentRow.currency = data.currency;

    if (!reference) return new Response(JSON.stringify({ status: 'ignored' }), { status: 200 });

    const { data: pendingPayment } = await supabase
      .from('payments')
      .select('user_id, amount, currency, status')
      .eq('reference', reference)
      .maybeSingle();
    if (!pendingPayment || pendingPayment.amount !== PREMIUM_AMOUNT || pendingPayment.currency !== PREMIUM_CURRENCY) {
      return new Response(JSON.stringify({ status: 'ignored' }), { status: 200 });
    }

    if (status === 'success' && data.reference === reference && data.amount === PREMIUM_AMOUNT && data.currency === PREMIUM_CURRENCY && userId === pendingPayment.user_id) {
      await supabase.from('payments').update(paymentRow).eq('reference', reference);
      // grant_premium internally sets the trigger's trusted_action so the
      // profiles trigger doesn't reject the is_premium change.
      await supabase.rpc('grant_premium', { target_user_id: pendingPayment.user_id });
    } else {
      await supabase.from('payments').update({ status: 'rejected', raw_response: event }).eq('reference', reference);
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
  } catch (err) {
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : String(err) }),
      { status: 500 },
    );
  }
};