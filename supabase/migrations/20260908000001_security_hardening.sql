-- BloodLink - Security hardening for privileged writes.
-- Keep premium, membership roles, and verification outcomes server-controlled.

-- The old client-callable upgrade RPC bypasses payment verification.
REVOKE EXECUTE ON FUNCTION public.upgrade_to_premium() FROM PUBLIC, anon, authenticated;

-- A caller may only create a normal membership. Active/admin membership is
-- assigned by controlled server-side flows.
DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
CREATE POLICY "Users can join communities"
    ON public.community_members FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND role = 'member'
        AND status IN ('pending', 'active')
    );

-- Verification submissions always begin pending and cannot self-assign an
-- approver or an approval outcome.
DROP POLICY IF EXISTS "Users can submit verifications" ON public.verification_records;
CREATE POLICY "Users can submit verifications"
    ON public.verification_records FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'pending'
        AND verified_by IS NULL
    );

DROP POLICY IF EXISTS "Users can update own verifications" ON public.verification_records;
CREATE POLICY "Users can update own verifications"
    ON public.verification_records FOR UPDATE
    USING (auth.uid() = user_id AND status = 'pending')
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'pending'
        AND verified_by IS NULL
    );

-- Payment rows are written only by the service-role Edge Functions. Users can
-- inspect their own history but cannot forge pending or successful payments.
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (auth.uid() = user_id);
