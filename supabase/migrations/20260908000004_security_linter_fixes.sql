-- BloodLink - Resolve Supabase security linter warnings.
-- Safe to run after the existing migration chain.

-- Pin the lookup path for the application functions reported by Supabase.
-- This prevents caller-controlled objects from changing name resolution.
ALTER FUNCTION public.handle_updated_at()
    SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user()
    SET search_path = public, pg_temp;
ALTER FUNCTION public.can_view_post(uuid)
    SET search_path = public, pg_temp;
ALTER FUNCTION public.prevent_profile_privilege_escalation()
    SET search_path = public, pg_temp;
ALTER FUNCTION public.upgrade_to_premium()
    SET search_path = public, pg_temp;

-- SECURITY DEFINER functions are never callable by anonymous clients.
DO $$
DECLARE
    function_row record;
BEGIN
    FOR function_row IN
        SELECT
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS arguments
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef
    LOOP
        EXECUTE format(
            'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon',
            function_row.schema_name,
            function_row.function_name,
            function_row.arguments
        );
    END LOOP;
END
$$;

-- These legacy/extension helpers are not part of the application RPC API.
-- Use a conditional lookup because older databases may not contain them.
DO $$
DECLARE
    function_row record;
BEGIN
    FOR function_row IN
        SELECT
            n.nspname AS schema_name,
            p.proname AS function_name,
            pg_get_function_identity_arguments(p.oid) AS arguments
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.prosecdef
          AND p.proname IN ('rls_auto_enable', 'st_estimatedextent')
    LOOP
        EXECUTE format(
            'REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM authenticated',
            function_row.schema_name,
            function_row.function_name,
            function_row.arguments
        );
    END LOOP;
END
$$;

-- These functions are invoked by database triggers, not by application RPCs.
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_notification(uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.are_blocked(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_connection_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_connection_accepted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_post_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_post_reaction() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_community_announcement() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_blood_request() FROM PUBLIC, anon, authenticated;

-- Direct conversation creation is performed through the guarded RPC. A direct
-- table insert only needs to be possible for an authenticated caller.
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Public buckets still serve known object URLs without a SELECT policy.
-- Removing these policies prevents clients from listing every stored object.
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Post media is publicly readable" ON storage.objects;
