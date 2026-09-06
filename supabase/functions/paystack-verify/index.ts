// Supabase Edge Function: paystack-verify
// Confirms a Paystack transaction by calling Paystack's verify API
// server-side (secret key never touches the device). Used instead of —
// or as a fallback to — the webhook: the app polls this endpoint after
// the user returns from the Paystack payment page.
//
// Expects JSON body: { reference: string, mode?: 'test' | 'live' }
//
// Deploy with default JWT verification (the app calls it with the anon key).

import { createClient } from 'npm:@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { global: { headers: { 'x-client-info': 'paystack-verify' } } },
);

async function getUserIdFromMetadata(data: any): Promise<string | null> {
  const direct = data?.metadata?.user_id ?? null;
  if (direct) return direct;

  // Paystack sometimes nests extra fields under `custom_fields`.
  const custom = data?.metadata?.custom_fields ?? [];
  if (Array.isArray(custom)) {
    for (const field of custom) {
      if (field?.variable_name === 'user_id' && field?.value) return String(field.value);
    }
  }
  return null;
}

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const body = await req.json();
    const reference: string | null = body?.reference ?? null;
    if (!reference) {
      return new Response(JSON.stringify({ message: 'Missing transaction reference' }), { status: 400 });
    }

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

    const resp = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { 'Authorization': `Bearer ${secret}` },
    });
    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify(data), { status: resp.status });
    }

    const tx = data?.data ?? {};
    const status = tx.status ?? 'unknown';
    const paid = status === 'success';

    if (paid) {
      const userId = await getUserIdFromMetadata(tx);
      const paymentRow: Record<string, unknown> = {
        reference,
        status,
        raw_response: data,
      };
      if (userId) paymentRow.user_id = userId;
      if (typeof tx.amount === 'number') paymentRow.amount = tx.amount;
      if (tx.currency) paymentRow.currency = tx.currency;

      await supabase.from('payments').upsert(paymentRow, { onConflict: 'reference' });

      if (userId) {
        await supabase.rpc('grant_premium', { target_user_id: userId });
      }
    }

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ message: err instanceof Error ? err.message : String(err) }),
      { status: 500 },
    );
  }
};