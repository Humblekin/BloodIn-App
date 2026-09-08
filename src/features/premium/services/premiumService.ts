import { paystackService } from './paystackService';

// Price in minor units (GHS pesewas). GHS 20.00 = 2000.
export const PREMIUM_PRICE_PESEWAS = 2000;
export const PREMIUM_CURRENCY = 'GHS';
export const PREMIUM_DISPLAY_PRICE = 'GHS 20.00';

export const premiumService = {
  // Real Paystack purchase. The server derives identity and pricing from the
  // authenticated session rather than trusting client-supplied metadata.
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