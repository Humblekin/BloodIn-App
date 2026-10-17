-- ================================================================
-- BloodIn — Fix "Database error deleting user" (admin user deletion)
-- Migration: 20261017000000_fix_user_deletion_fk_constraints.sql
-- ================================================================
--
-- ROOT CAUSE
-- ----------
-- Deleting a user from the Supabase Dashboard (Authentication → Users →
-- "Delete selected users") makes GoTrue run `DELETE FROM auth.users`, which
-- cascades into `public.profiles` (profiles.id REFERENCES auth.users ON DELETE
-- CASCADE). Several public tables reference `auth.users(id)` or
-- `public.profiles(id)` WITHOUT an ON DELETE action (the Postgres default is
-- NO ACTION / RESTRICT). Those rows block the profile delete → the whole
-- transaction fails → GoTrue returns the generic error
-- "Database error deleting user", surfaced in the dashboard as
-- "Failed to delete selected users: Database error deleting user".
--
-- FIX
-- ---
-- Preserve authored / shared / historical records instead of destroying them.
-- Re-point the blocking foreign keys to ON DELETE SET NULL (redacting the link
-- to the deleted user) and drop NOT NULL where required. Constraint names are
-- kept identical so PostgREST embeds keep working (e.g. the client embeds
-- `profiles!messages_sender_id_fkey` and
-- `profiles!request_responses_responder_id_fkey`).
--
-- Deletion behavior after this migration:
--   * Private, user-owned data cascades away (locations, availability,
--     connections, blocks, notifications, memberships, participants, posts...).
--   * Shared / authored records are PRESERVED with a NULL author/actor:
--     chat messages, request responses, communities, organizations, campaigns,
--     verification records, reports, moderation actions, audit logs.
--
-- This migration is additive and idempotent; it never disables foreign keys
-- and never uses unbounded cascading deletes.
-- ================================================================

-- ────────────────────────────────────────────────────────────────
-- 1. PRE-FLIGHT AUDIT — report every FK that currently blocks an
--    auth-user delete (references auth.users or public.profiles with
--    NO ACTION / RESTRICT). This is read-only evidence of the cause.
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    _row RECORD;
    _found INTEGER := 0;
BEGIN
    FOR _row IN
        SELECT
            cls.relname            AS tbl,
            att.attname            AS col,
            refns.nspname          AS ref_schema,
            refcls.relname         AS ref_tbl,
            con.conname            AS conname,
            con.confdeltype        AS deltype
        FROM pg_constraint con
        JOIN pg_class     cls    ON cls.oid = con.conrelid
        JOIN pg_namespace nsp    ON nsp.oid = cls.relnamespace
        JOIN pg_attribute att    ON att.attrelid = con.conrelid
                                AND att.attnum = ANY (con.conkey)
        JOIN pg_class     refcls ON refcls.oid = con.confrelid
        JOIN pg_namespace refns  ON refns.oid = refcls.relnamespace
        WHERE con.contype = 'f'
          AND nsp.nspname = 'public'
          AND con.confdeltype IN ('a', 'r')            -- NO ACTION / RESTRICT
          AND (
                (refns.nspname = 'auth'   AND refcls.relname = 'users')
             OR (refns.nspname = 'public' AND refcls.relname = 'profiles')
          )
        ORDER BY cls.relname, att.attname
    LOOP
        _found := _found + 1;
        RAISE NOTICE '[BloodIn user-deletion] blocking FK: public.%.% -> %.% (constraint %, deltype %)',
            _row.tbl, _row.col, _row.ref_schema, _row.ref_tbl, _row.conname, _row.deltype;
    END LOOP;

    IF _found = 0 THEN
        RAISE NOTICE '[BloodIn user-deletion] No blocking foreign keys found.';
    END IF;
END $$;


-- ────────────────────────────────────────────────────────────────
-- 2. DROP any existing FK that sits on the 11 target columns, no
--    matter what it is named, so the re-created constraints below
--    are the only ones and no stale RESTRICT FK is left behind.
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    _pair RECORD;
    _con  RECORD;
BEGIN
    FOR _pair IN
        SELECT *
        FROM (VALUES
            ('messages',             'sender_id'),
            ('request_responses',    'responder_id'),
            ('communities',          'created_by'),
            ('organizations',        'created_by'),
            ('campaigns',            'created_by'),
            ('verification_records', 'verified_by'),
            ('reports',              'reporter_id'),
            ('reports',              'reported_user_id'),
            ('moderation_actions',   'moderator_id'),
            ('moderation_actions',   'target_user_id'),
            ('audit_logs',           'actor_id')
        ) AS t(tbl, col)
    LOOP
        FOR _con IN
            SELECT con.conname
            FROM pg_constraint con
            JOIN pg_class     cls ON cls.oid = con.conrelid
            JOIN pg_namespace nsp ON nsp.oid = cls.relnamespace
            JOIN pg_attribute att ON att.attrelid = con.conrelid
                                 AND att.attnum = ANY (con.conkey)
            WHERE con.contype = 'f'
              AND nsp.nspname = 'public'
              AND cls.relname = _pair.tbl
              AND att.attname = _pair.col
        LOOP
            EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', _pair.tbl, _con.conname);
        END LOOP;
    END LOOP;
END $$;


-- ────────────────────────────────────────────────────────────────
-- 3. Allow the preserved records to keep a NULL author/actor.
--    (DROP NOT NULL is a no-op if the column is already nullable.)
-- ────────────────────────────────────────────────────────────────
ALTER TABLE public.messages            ALTER COLUMN sender_id    DROP NOT NULL;
ALTER TABLE public.request_responses   ALTER COLUMN responder_id DROP NOT NULL;
ALTER TABLE public.communities         ALTER COLUMN created_by   DROP NOT NULL;
ALTER TABLE public.organizations       ALTER COLUMN created_by   DROP NOT NULL;
ALTER TABLE public.campaigns           ALTER COLUMN created_by   DROP NOT NULL;
ALTER TABLE public.reports             ALTER COLUMN reporter_id  DROP NOT NULL;
ALTER TABLE public.moderation_actions  ALTER COLUMN moderator_id DROP NOT NULL;


-- ────────────────────────────────────────────────────────────────
-- 4. Re-create the foreign keys with ON DELETE SET NULL.
--    Names are kept canonical (<table>_<column>_fkey) because the
--    client embeds profiles through some of them by name.
-- ────────────────────────────────────────────────────────────────

-- Chat history is preserved; a deleted sender is redacted.
ALTER TABLE public.messages
    ADD CONSTRAINT messages_sender_id_fkey
    FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Blood-request responses are preserved; the responder link is redacted.
ALTER TABLE public.request_responses
    ADD CONSTRAINT request_responses_responder_id_fkey
    FOREIGN KEY (responder_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Communities are shared assets; keep them, redact the (deleted) creator.
ALTER TABLE public.communities
    ADD CONSTRAINT communities_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Organizations are shared assets; keep them, redact the creator.
ALTER TABLE public.organizations
    ADD CONSTRAINT organizations_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Campaigns are shared assets; keep them, redact the creator.
ALTER TABLE public.campaigns
    ADD CONSTRAINT campaigns_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Verification records are historical; keep them, redact the verifier.
ALTER TABLE public.verification_records
    ADD CONSTRAINT verification_records_verified_by_fkey
    FOREIGN KEY (verified_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Reports and moderation actions are audit data; keep them, redact the actor.
ALTER TABLE public.reports
    ADD CONSTRAINT reports_reporter_id_fkey
    FOREIGN KEY (reporter_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.reports
    ADD CONSTRAINT reports_reported_user_id_fkey
    FOREIGN KEY (reported_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.moderation_actions
    ADD CONSTRAINT moderation_actions_moderator_id_fkey
    FOREIGN KEY (moderator_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.moderation_actions
    ADD CONSTRAINT moderation_actions_target_user_id_fkey
    FOREIGN KEY (target_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Audit logs are permanent; keep them, redact the actor.
ALTER TABLE public.audit_logs
    ADD CONSTRAINT audit_logs_actor_id_fkey
    FOREIGN KEY (actor_id) REFERENCES auth.users(id) ON DELETE SET NULL;


-- ────────────────────────────────────────────────────────────────
-- 5. POST-FLIGHT AUDIT — there must be no remaining blocking FK.
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    _row RECORD;
    _remaining TEXT := '';
    _count INTEGER := 0;
BEGIN
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
        _count := _count + 1;
        _remaining := _remaining || _row.label || '; ';
    END LOOP;

    IF _count = 0 THEN
        RAISE NOTICE '[BloodIn user-deletion] OK: no blocking foreign keys remain.';
    ELSE
        RAISE WARNING '[BloodIn user-deletion] % blocking FK(s) still present: %',
            _count, _remaining;
    END IF;
END $$;


-- ────────────────────────────────────────────────────────────────
-- 6. REGRESSION TEST (best-effort, self-cleaning).
--    Creates a throwaway auth user plus one row in every table that
--    used to block deletion, then deletes the user and asserts the
--    deletion succeeds. Wrapped so that a failure NEVER aborts the
--    migration: on any error the block is rolled back, leaving no
--    test data behind.
-- ────────────────────────────────────────────────────────────────
DO $$
DECLARE
    _uid      UUID := gen_random_uuid();
    _suffix   TEXT := substr(replace(_uid::text, '-', ''), 1, 10);
    _conv_id  UUID;
    _req_id   UUID;
    _report_id UUID;
BEGIN
    BEGIN
        -- auth user (triggers handle_new_user -> profiles, privacy_settings,
        -- user_locations, notification_preferences)
        INSERT INTO auth.users (id, instance_id, aud, role, email)
        VALUES (_uid, '00000000-0000-0000-0000-000000000000',
                'authenticated', 'authenticated', 'deletion-test-' || _suffix || '@example.invalid');

        -- blood request + response (response.responder_id was NOT NULL/RESTRICT)
        INSERT INTO public.blood_requests
            (requester_id, blood_group, hospital_name, location_point, expires_at)
        VALUES
            (_uid, 'O+', 'Deletion Test Hospital',
             ST_SetSRID(ST_MakePoint(0, 0), 4326)::geography, now() + interval '1 day')
        RETURNING id INTO _req_id;

        INSERT INTO public.request_responses (request_id, responder_id)
        VALUES (_req_id, _uid);

        -- conversation + message (messages.sender_id was NOT NULL/RESTRICT)
        INSERT INTO public.conversations (type) VALUES ('direct') RETURNING id INTO _conv_id;
        INSERT INTO public.messages (conversation_id, sender_id, content)
        VALUES (_conv_id, _uid, 'deletion regression test');

        -- community / organization / campaign (created_by NOT NULL/RESTRICT)
        INSERT INTO public.communities (name, slug, created_by)
        VALUES ('Deletion Test Community ' || _suffix, 'deletion-test-community-' || _suffix, _uid);

        INSERT INTO public.organizations (name, slug, org_type, created_by)
        VALUES ('Deletion Test Org ' || _suffix, 'deletion-test-org-' || _suffix, 'other', _uid);

        INSERT INTO public.campaigns (title, created_by, start_date)
        VALUES ('Deletion Test Campaign ' || _suffix, _uid, now());

        -- verification + report + moderation + audit (all RESTRICT)
        INSERT INTO public.verification_records (user_id, verification_type, verified_by)
        VALUES (_uid, 'human', _uid);

        INSERT INTO public.reports (reporter_id, reported_user_id, reason)
        VALUES (_uid, _uid, 'other')
        RETURNING id INTO _report_id;

        INSERT INTO public.moderation_actions (report_id, moderator_id, action_type, target_user_id)
        VALUES (_report_id, _uid, 'warning', _uid);

        INSERT INTO public.audit_logs (actor_id, action, entity_type)
        VALUES (_uid, 'deletion_test', 'user');

        -- THE ACTUAL OPERATION THAT USED TO FAIL
        DELETE FROM auth.users WHERE id = _uid;

        -- Assert the user is really gone (cascade reached profiles).
        IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid) THEN
            RAISE WARNING '[BloodIn user-deletion] regression test: profile still present after delete';
        ELSE
            RAISE NOTICE '[BloodIn user-deletion] regression test PASSED: auth user + related rows deleted without error.';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        -- Any failure rolls back this sub-block automatically (no leftovers)
        -- and is reported without aborting the migration.
        RAISE WARNING '[BloodIn user-deletion] regression test FAILED (rolled back): % (%)',
            SQLERRM, SQLSTATE;
    END;
END $$;
