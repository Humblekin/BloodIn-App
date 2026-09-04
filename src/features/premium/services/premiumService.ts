import { supabase } from '@/lib/supabase/client';
import { paystackService } from './paystackService';

export const premiumService = {
  async upgradeToPremium(): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.rpc('upgrade_to_premium');

      if (error) {
        // Helpful guidance when the DB function is not deployed
        if (error.message?.includes('Could not find the function') || error.code === '42883') {
          console.error('[Premium] upgrade_to_premium RPC not found:', error.message);
          return {
            success: false,
            error: 'RPC not found: deploy the migration supabase/migrations/20260902000001_premium_upgrade.sql',
          };
        }

        // Detect missing column errors (e.g. `is_premium` not present)
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

      // continue below
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

  async startPurchase(amount: number, email: string) {
    try {
      // Initialize transaction via Supabase Edge Function through paystackService
      const resp = await paystackService.initTransaction({ amount, email, metadata: {} });
      return { success: true, data: resp };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start purchase';
      console.error('[Premium] startPurchase error:', message);
      return { success: false, error: message };
    }
  },
};
