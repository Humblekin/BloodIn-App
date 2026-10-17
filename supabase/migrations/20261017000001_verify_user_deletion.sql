-- ================================================================
-- BloodIn — Verify user deletion works end-to-end (regression guard)
-- Migration: 20261017000001_verify_user_deletion.sql
-- ================================================================
--
-- Companion to 20261017000000_fix_user_deletion_fk_constraints.sql.
--
-- This migration is a hard verification: it
--   (1) asserts no foreign key in the public schema still blocks an
--       auth-user delete (references auth.users / public.profiles with
--       NO ACTION / RESTRICT), and
--   (2) performs a real end-to-end deletion of a throwaway auth user that
--       owns rows in every table that used to block the delete.
--
-- If anything fails, the error propagates and the whole migration (and its
-- transaction) is rolled back — so a successful `supabase db push` is proof
-- that user deletion works. The synthetic user and its rows are removed by
-- the very DELETE under test, so no test data is left behind.
-- ================================================================

DO $$
DECLARE
    _blocking  INTEGER;
    _labels    TEXT := '';
    _row       RECORD;

    _uid       UUID := gen_random_uuid();
    _suffix    TEXT := substr(replace(_uid::text, '-', ''), 1, 10);
    _conv_id   UUID;
    _req_id    UUID;
    _report_id UUID;
BEGIN
    -- ── (1) Structural check: no blocking user-referencing FK remains ──
    FOR _row IN
        SELECT cls.relname || '.' || att.attname || ' (' || con.conname || ')' AS label
        FROM pg_constraint con
        JOIN pg_class     cls    ON cls.oid = con.conrelid
        JOIN pg_namespace nsp    ON nsp.oid = cls.relnamespace
        JOIN pg_attribute att    ON att.attrelid = con.conrelid
                                AND att.attnum = ANY (con.conkey)
        JOIN pg_class     refcls ON refcls.oid = con.confrelid
        JOIN pg_namespace refns  ON refns.oid = refcls.relnamespace
        WHERE con.contype = 'f'
          AND nsp.nspname = 'public'
          AND con.confdeltype IN ('a', 'r')
          AND (
                (refns.nspname = 'auth'   AND refcls.relname = 'users')
             OR (refns.nspname = 'public' AND refcls.relname = 'profiles')
          )
        ORDER BY 1
    LOOP
        _labels := _labels || _row.label || '; ';
    END LOOP;

    IF _labels <> '' THEN
        RAISE EXCEPTION '[BloodIn user-deletion verify] blocking foreign keys still present: %', _labels;
    END IF;

    -- ── (2) Functional check: real auth-user delete with related rows ──
    INSERT INTO auth.users (id, instance_id, aud, role, email)
    VALUES (_uid, '00000000-0000-0000-0000-000000000000',
            'authenticated', 'authenticated', 'deletion-verify-' || _suffix || '@example.invalid');

    INSERT INTO public.blood_requests
        (requester_id, blood_group, hospital_name, location_point, expires_at)
    VALUES
        (_uid, 'O+', 'Verify Deletion Hospital',
         ST_SetSRID(ST_MakePoint(0, 0), 4326)::geography, now() + interval '1 day')
    RETURNING id INTO _req_id;

    INSERT INTO public.request_responses (request_id, responder_id) VALUES (_req_id, _uid);

    INSERT INTO public.conversations (type) VALUES ('direct') RETURNING id INTO _conv_id;
    INSERT INTO public.messages (conversation_id, sender_id, content)
    VALUES (_conv_id, _uid, 'user-deletion verification');

    INSERT INTO public.communities (name, slug, created_by)
    VALUES ('Verify Deletion Community ' || _suffix, 'verify-deletion-community-' || _suffix, _uid);

    INSERT INTO public.organizations (name, slug, org_type, created_by)
    VALUES ('Verify Deletion Org ' || _suffix, 'verify-deletion-org-' || _suffix, 'other', _uid);

    INSERT INTO public.campaigns (title, created_by, start_date)
    VALUES ('Verify Deletion Campaign ' || _suffix, _uid, now());

    INSERT INTO public.verification_records (user_id, verification_type, verified_by)
    VALUES (_uid, 'human', _uid);

    INSERT INTO public.reports (reporter_id, reported_user_id, reason)
    VALUES (_uid, _uid, 'other') RETURNING id INTO _report_id;

    INSERT INTO public.moderation_actions (report_id, moderator_id, action_type, target_user_id)
    VALUES (_report_id, _uid, 'warning', _uid);

    INSERT INTO public.audit_logs (actor_id, action, entity_type)
    VALUES (_uid, 'deletion_verify', 'user');

    -- The exact operation the admin dashboard performs.
    DELETE FROM auth.users WHERE id = _uid;

    -- Confirm the cascade reached public.profiles.
    IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN
        RAISE EXCEPTION '[BloodIn user-deletion verify] profile still present after delete';
    END IF;

    -- Confirm preserved records were redacted, not destroyed or orphaned.
    IF NOT EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = _conv_id) THEN
        RAISE EXCEPTION '[BloodIn user-deletion verify] chat message was destroyed (expected SET NULL)';
    END IF;
    IF EXISTS (SELECT 1 FROM public.messages WHERE conversation_id = _conv_id AND sender_id IS NOT NULL) THEN
        RAISE EXCEPTION '[BloodIn user-deletion verify] chat message sender was not redacted';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.communities WHERE slug = 'verify-deletion-community-' || _suffix) THEN
        RAISE EXCEPTION '[BloodIn user-deletion verify] community was destroyed (expected SET NULL)';
    END IF;
    IF EXISTS (SELECT 1 FROM public.communities WHERE slug = 'verify-deletion-community-' || _suffix AND created_by IS NOT NULL) THEN
        RAISE EXCEPTION '[BloodIn user-deletion verify] community creator was not redacted';
    END IF;
    IF EXISTS (SELECT 1 FROM public.campaigns WHERE title = 'Verify Deletion Campaign ' || _suffix AND created_by IS NOT NULL) THEN
        RAISE EXCEPTION '[BloodIn user-deletion verify] campaign creator was not redacted';
    END IF;
    IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = 'verify-deletion-org-' || _suffix AND created_by IS NOT NULL) THEN
        RAISE EXCEPTION '[BloodIn user-deletion verify] organization creator was not redacted';
    END IF;

    RAISE NOTICE '[BloodIn user-deletion verify] PASSED: auth user deleted, records preserved and redacted.';

    -- Clean up the preserved synthetic records so nothing is left behind.
    DELETE FROM public.campaigns     WHERE title = 'Verify Deletion Campaign ' || _suffix;
    DELETE FROM public.communities   WHERE slug  = 'verify-deletion-community-' || _suffix;
    DELETE FROM public.organizations WHERE slug  = 'verify-deletion-org-' || _suffix;
    DELETE FROM public.messages      WHERE conversation_id = _conv_id;
    DELETE FROM public.conversations WHERE id = _conv_id;
END $$;
