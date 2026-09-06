-- ================================================================
-- BloodLink — Fix conversation participant visibility
-- The original "Users see own participation" SELECT policy
-- (user_id = auth.uid()) meant a user could never read the OTHER
-- participant's row, so the Messages list had no name/avatar to show.
-- Relaxed via a SECURITY DEFINER helper to avoid RLS recursion.
-- Idempotent.
-- ================================================================

CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  target_conversation_id UUID,
  target_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE conversation_id = target_conversation_id
      AND user_id = target_user_id
  );
$$;

DROP POLICY IF EXISTS "Users see own participation" ON public.conversation_participants;

CREATE POLICY "Users see own participation"
  ON public.conversation_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_conversation_participant(conversation_id, auth.uid())
  );

-- ═══════════════════════════════════════════════════════════
-- Campaigns: the campaign detail screen shows "N registered" from
-- campaign_participants, but the original policy (user_id = auth.uid())
-- only ever returned the viewer's own row, so the count was always 0
-- (or 1 after registering). Campaigns are public listings, so let any
-- authenticated user see participation.
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view own participation" ON public.campaign_participants;
DROP POLICY IF EXISTS "Users can view participation" ON public.campaign_participants;

CREATE POLICY "Users can view participation"
  ON public.campaign_participants FOR SELECT
  USING (auth.role() = 'authenticated');