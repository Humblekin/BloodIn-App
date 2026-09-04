// Supabase Edge Function: paystack-webhook
// Receives Paystack webhooks, verifies signature, and updates `payments` and
// user `is_premium` status in the database.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE') ?? '';
const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE, { global: { headers: { 'x-client-info': 'paystack-webhook' } } });

function verifySignature(payload: string, signature: string | null) {
  if (!signature) return false;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(PAYSTACK_SECRET);
  // HMAC verification via SubtleCrypto (Deno)
  return crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-512' }, false, ['verify'])
    .then((key) => crypto.subtle.verify('HMAC', key, hexToBytes(signature), encoder.encode(payload)))
    .catch(() => false);
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  return bytes;
}

export default async (req: Request) => {
  try {
    const raw = await req.text();
    const signature = req.headers.get('x-paystack-signature');
    const ok = await verifySignature(raw, signature);
    if (!ok) return new Response('Invalid signature', { status: 401 });

    const event = JSON.parse(raw);
    const reference = event?.data?.reference;
    const status = event?.event === 'charge.success' ? 'success' : event?.event;

    // Upsert payment record
    await supabase.from('payments').upsert({ reference, status, raw_response: event }, { onConflict: 'reference' });

    if (status === 'success' && reference) {
      // Map reference -> user (depends on how you store metadata). Here we assume
      // metadata contains user_id.
      const userId = event?.data?.metadata?.user_id ?? null;
      if (userId) {
        await supabase.from('profiles').update({ is_premium: true }).eq('id', userId);
      }
    }

    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ message: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
};
