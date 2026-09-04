// Supabase Edge Function: paystack-init
// Initializes a Paystack transaction server-side using the secret key.
// Expects JSON body: { amount: number, email: string, metadata?: object }

export default async (req: Request) => {
  try {
    if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    const body = await req.json();
    const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY') ?? Deno.env.get('PAYSTACK_LIVE_KEY');
    if (!PAYSTACK_SECRET) return new Response(JSON.stringify({ message: 'Paystack secret not configured' }), { status: 500 });

    const resp = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email,
        amount: body.amount,
        metadata: body.metadata ?? {},
      }),
    });

    const data = await resp.text();
    return new Response(data, { status: resp.status, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ message: err instanceof Error ? err.message : String(err) }), { status: 500 });
  }
};
