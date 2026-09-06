import { supabase } from '@/lib/supabase/client';
import { paystackService } from './paystackService';

// Price in minor units (GHS pesewas). GHS 20.00 = 2000.
export const PREMIUM_PRICE_PESEWAS = 2000;
export const PREMIUM_CURRENCY = 'GHS';
export const PREMIUM_DISPLAY_PRICE = 'GHS 20.00';

export const premiumService = {
  // Legacy mock path (no payment) — kept for tests/fallback.
  async upgradeToPremium(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('upgrade_to_premium');

      if (error) {
        if (error.message?.includes('Could not find the function') || error.code === '42883') {
          console.error('[Premium] upgrade_to_premium RPC not found:', error.message);
          return {
            success: false,
            error: 'RPC not found: deploy the migration supabase/migrations/20260902000001_premium_upgrade.sql',
          };
        }

        if (error.message?.includes('column "is_premium" does not exist') || error.code === '42703') {
          console.error('[Premium] Missing column in DB:', error.message);
          return {
            success: false,
            error: 'Database schema out of date: run supabase/migrations/20260831000002_fix_schema_mismatches.sql to add missing columns',
          };
        }

        console.error('[Premium] Upgrade RPC error:', error.message);
        return { success: false, error: error.message };
      }

      const result = data as { error?: string; success?: boolean };
      if (result?.error) {
        return { success: false, error: result.error };
      }

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown RPC error';
      console.error('[Premium] Unexpected RPC exception:', message);
      return { success: false, error: message };
    }
  },

  // Real Paystack purchase. userId is embedded in metadata so the webhook
  // (or paystack-verify) can both record the payment and grant premium.
  async startPurchase(userId: string, email: string) {
    try {
      const { reference } = await paystackService.initTransaction({
        amount: PREMIUM_PRICE_PESEWAS,
        email,
        currency: PREMIUM_CURRENCY,
        callback_url: 'bloodin://payment-result',
        metadata: {
          user_id: userId,
          premium_package: 'standard',
          source: 'bloodin_app',
        },
      });
      return { success: true, data: { reference, price: PREMIUM_DISPLAY_PRICE } };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start purchase';
      console.error('[Premium] startPurchase error:', message);
      return { success: false, error: message };
    }
  },

  // Polls Paystack directly to confirm a completed transaction.
  async confirmPurchase(reference: string) {
    try {
      const tx = await paystackService.verifyTransaction(reference);
      const status: string = tx?.status ?? 'unknown';
      const failed = status === 'abandoned' || status === 'failed' || status === 'cancelled';
      return { success: true, status, paid: status === 'success' && !failed, failed };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to verify payment';
      console.error('[Premium] confirmPurchase error:', message);
      return { success: false, error: message };
    }
  },
};