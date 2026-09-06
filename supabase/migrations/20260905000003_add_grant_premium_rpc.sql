-- ================================================================
-- BloodLink — grant_premium RPC for the Paystack webhook
-- The profiles trigger blocks is_premium changes unless
-- app.trusted_action = 'upgrade_to_premium' is set in the SAME
-- transaction. The webhook (service_role) must therefore grant
-- premium through this SECURITY DEFINER function rather than a
-- plain UPDATE. Idempotent.
-- ================================================================

CREATE OR REPLACE FUNCTION public.grant_premium(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.trusted_action', 'upgrade_to_premium', true);
  UPDATE public.profiles
  SET is_premium = true,
      updated_at = now()
  WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_premium(uuid) TO service_role;

-- Postgres grants EXECUTE to PUBLIC by default on new functions; revoke it so
-- only the server-side edge functions (service role) can grant premium.
REVOKE EXECUTE ON FUNCTION public.grant_premium(uuid) FROM PUBLIC, anon, authenticated;