import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase/client';

type InitPayload = { amount: number; email: string; metadata?: Record<string, any> };

export const paystackService = {
  // Calls the Supabase Edge function `paystack-init` which holds the secret
  // and returns Paystack's `authorization_url`. This keeps the secret off-device.
  async initTransaction(payload: InitPayload) {
    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    if (!SUPABASE_URL) throw new Error('Supabase URL not configured');

    const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use the anon key so the request is authorized by Supabase front-end rules
        'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
        'apikey': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to initialize Paystack transaction');

    // Open authorization URL in the browser/webview
    const authUrl = json?.data?.authorization_url ?? json?.authorization_url;
    if (!authUrl) throw new Error('Missing authorization URL from Paystack init');

    // Open the payment page for the user to complete payment
    await Linking.openURL(authUrl);
    return json;
  },
};

export default paystackService;
