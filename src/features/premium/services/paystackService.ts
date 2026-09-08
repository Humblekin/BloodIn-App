import { Linking } from 'react-native';
import { supabase } from '@/lib/supabase/client';

export type PaystackInitPayload = {
  amount: number;
  email: string;
  currency?: string;
  callback_url?: string;
  mode?: 'test' | 'live';
  metadata?: Record<string, any>;
};

function getMode(): 'test' | 'live' {
  return process.env.EXPO_PUBLIC_PAYSTACK_MODE === 'live' ? 'live' : 'test';
}

export const paystackService = {
  // Calls the Supabase Edge function `paystack-init`, which holds the secret
  // key and returns Paystack's `authorization_url`. The secret never touches
  // the device.
  async initTransaction(payload: PaystackInitPayload) {
    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    if (!SUPABASE_URL) throw new Error('Supabase URL not configured');

    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Your session has expired. Please sign in again.');

    const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ ...payload, mode: getMode() }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to initialize Paystack transaction');

    const authUrl = json?.data?.authorization_url ?? json?.authorization_url;
    const reference = json?.data?.reference ?? null;
    if (!authUrl) throw new Error('Missing authorization URL from Paystack init');

    await Linking.openURL(authUrl);
    return { reference, mode: getMode() };
  },

  // Asks Paystack (via the paystack-verify edge function) whether a
  // transaction actually succeeded — used instead of the webhook.
  async verifyTransaction(reference: string) {
    const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
    if (!SUPABASE_URL) throw new Error('Supabase URL not configured');

    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) throw new Error('Your session has expired. Please sign in again.');

    const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ reference, mode: getMode() }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to verify transaction');

    return json?.data ?? json;
  },
};

export default paystackService;