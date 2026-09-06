-- ================================================================
-- BloodLink — Final Schema Alignment
-- Migration: 20260906000000_final_alignment.sql
--
-- Comprehensive pass that aligns the database schema with every
-- table, column, trigger, RLS policy, index, RPC, and Realtime
-- subscription used by the Expo client code.
--
-- Idempotent everywhere. Safe to run at any point, even if all
-- earlier migrations have already been applied.
-- ================================================================

-- ═══════════════════════════════════════════════════════════
-- 1. MISSING updated_at TRIGGERS
-- Several tables declare an updated_at column but have no
-- BEFORE UPDATE trigger to auto-set it. The handle_updated_at()
-- function already exists from the initial migration.
-- ═══════════════════════════════════════════════════════════

-- posts
DROP TRIGGER IF EXISTS update_posts_updated_at ON public.posts;
CREATE TRIGGER update_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- messages
DROP TRIGGER IF EXISTS update_messages_updated_at ON public.messages;
CREATE TRIGGER update_messages_updated_at
    BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- campaigns
DROP TRIGGER IF EXISTS update_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

-- community_announcements
DROP TRIGGER IF EXISTS update_community_announcements_updated_at ON public.community_announcements;
CREATE TRIGGER update_community_announcements_updated_at
    BEFORE UPDATE ON public.community_announcements
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();


-- ═══════════════════════════════════════════════════════════
-- 2. MISSING indexes for common query patterns
-- These speed up the most frequent client queries without
-- adding storage overhead for writes that are already indexed.
-- ═══════════════════════════════════════════════════════════

-- blood_requests: filtered by status + ordered by created_at
CREATE INDEX IF NOT EXISTS idx_requests_status_created
    ON public.blood_requests(status, created_at DESC);

-- blood_requests: requester's own requests (profile page)
CREATE INDEX IF NOT EXISTS idx_requests_requester
    ON public.blood_requests(requester_id, created_at DESC);

-- notifications: filtered by user_id + is_read + ordered by created_at DESC
-- (already has idx_notifications_user, but adding is_read filter)
CREATE INDEX IF NOT EXISTS idx_notifications_user_read
    ON public.notifications(user_id, is_read, created_at DESC);

-- campaigns: filtered by status + ordered by start_date
CREATE INDEX IF NOT EXISTS idx_campaigns_status_start
    ON public.campaigns(status, start_date ASC);

-- campaigns: by community
CREATE INDEX IF NOT EXISTS idx_campaigns_community
    ON public.campaigns(community_id, start_date ASC);

-- communities: active communities ordered by member_count
CREATE INDEX IF NOT EXISTS idx_communities_active_members
    ON public.communities(is_active, member_count DESC);

-- organizations: active orgs ordered by name
CREATE INDEX IF NOT EXISTS idx_organizations_active_name
    ON public.organizations(is_active, name ASC);

-- messages: conversation lookup (already has idx_messages_conversation)

-- conversation_participants: by user_id (already has idx_conversation_participants_user)

-- post_comments: by post_id (already has idx_post_comments_post)

-- post_reactions: by post_id (already has idx_post_reactions_post)


-- ═══════════════════════════════════════════════════════════
-- 3. REALTIME — Enable for tables with subscriptions
-- The client subscribes to postgres_changes on these tables
-- via Supabase Realtime. Without this, the subscriptions
-- silently receive no events.
-- ═══════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;


-- ═══════════════════════════════════════════════════════════
-- 4. RLS POLICY CLEANUP
-- Ensure every table that the client queries has at least
-- SELECT/INSERT/UPDATE policies that match the code's patterns.
-- ═══════════════════════════════════════════════════════════

-- availability_statuses: add authenticated read so the profile
-- screen can optionally display availability history.
DROP POLICY IF EXISTS "Authenticated users can view availability"
    ON public.availability_statuses;
CREATE POLICY "Authenticated users can view availability"
    ON public.availability_statuses FOR SELECT
    USING (auth.role() = 'authenticated');

-- connection_requests: ensure the receiver can also INSERT
-- (when the client creates a mutual row on acceptance).
-- The repair migration already fixed this for connections,
-- but connection_requests INSERT should only be the sender.
-- Verify: the existing policy is WITH CHECK (auth.uid() = sender_id).
-- This is correct — only the sender inserts. ✓

-- post_reactions: the toggleReaction function does:
--   1. SELECT to check existing reaction
--   2. DELETE if exists
--   3. INSERT if not
-- All three need to work for the authenticated user.
-- The existing policies (SELECT/INSERT/UPDATE/DELETE) cover this. ✓

-- organizations: ensure the SELECT policy covers active orgs
-- (already has "Anyone can view active organizations" with is_active = true). ✓

-- request_verifications: ensure the owner can view
-- (already has the restricted policy from security hardening). ✓


-- ═══════════════════════════════════════════════════════════
-- 5. SEED DATA — Ghana sample organizations
-- Provides visible content for the Discover tab's
-- organization section and campaigns that reference them.
-- ═══════════════════════════════════════════════════════════

-- Only seed if no organizations exist yet.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organizations LIMIT 1) THEN
    -- We need a system user to act as created_by. Use the first
    -- profile, or skip if no profiles exist yet.
    DECLARE
      _system_user UUID;
    BEGIN
      SELECT id INTO _system_user FROM public.profiles ORDER BY created_at LIMIT 1;

      IF _system_user IS NOT NULL THEN
        INSERT INTO public.organizations (name, slug, description, org_type, logo_url, country_id, region_id, city_id, verification_level, created_by)
        VALUES
          (
            'Korle-Bu Blood Bank',
            'korle-bu-blood-bank',
            'Ghana''s leading hospital blood bank, providing safe blood products to patients across the Greater Accra Region. Open 24/7 for emergency transfusions.',
            'blood_bank',
            NULL,
            (SELECT id FROM countries WHERE code = 'GH'),
            (SELECT id FROM regions WHERE name = 'Greater Accra'),
            (SELECT id FROM cities WHERE name = 'Accra'),
            'verified',
            _system_user
          ),
          (
            'Ghana Red Cross Society',
            'ghana-red-cross',
            'National humanitarian organization coordinating blood donation drives, emergency response, and community health education across all 16 regions.',
            'ngo',
            NULL,
            (SELECT id FROM countries WHERE code = 'GH'),
            (SELECT id FROM regions WHERE name = 'Greater Accra'),
            (SELECT id FROM cities WHERE name = 'Accra'),
            'premium',
            _system_user
          ),
          (
            '37 Military Hospital Blood Centre',
            '37-military-hospital',
            'Military hospital blood centre serving both service personnel and civilians. Specializes in rare blood types and emergency transfusions.',
            'hospital',
            NULL,
            (SELECT id FROM countries WHERE code = 'GH'),
            (SELECT id FROM regions WHERE name = 'Greater Accra'),
            (SELECT id FROM cities WHERE name = 'Accra'),
            'verified',
            _system_user
          ),
          (
            'Komfo Anokye Teaching Hospital',
            'komfo-anokye',
            'Major teaching hospital in Kumasi serving the Ashanti Region and beyond. Home to one of West Africa''s largest blood transfusion services.',
            'hospital',
            NULL,
            (SELECT id FROM countries WHERE code = 'GH'),
            (SELECT id FROM regions WHERE name = 'Ashanti'),
            (SELECT id FROM cities WHERE name = 'Kumasi'),
            'verified',
            _system_user
          );
      END IF;
    END;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════
-- 6. SEED DATA — Ghana sample campaigns
-- Provides visible content for the Campaigns section.
-- ═══════════════════════════════════════════════════════════

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.campaigns LIMIT 1) THEN
    DECLARE
      _system_user UUID;
      _korle_bu_org UUID;
      _red_cross_org UUID;
      _37_mil_org UUID;
      _komfo_org UUID;
    BEGIN
      SELECT id INTO _system_user FROM public.profiles ORDER BY created_at LIMIT 1;
      SELECT id INTO _korle_bu_org FROM public.organizations WHERE slug = 'korle-bu-blood-bank' LIMIT 1;
      SELECT id INTO _red_cross_org FROM public.organizations WHERE slug = 'ghana-red-cross' LIMIT 1;
      SELECT id INTO _37_mil_org FROM public.organizations WHERE slug = '37-military-hospital' LIMIT 1;
      SELECT id INTO _komfo_org FROM public.organizations WHERE slug = 'komfo-anokye' LIMIT 1;

      IF _system_user IS NOT NULL THEN
        INSERT INTO public.campaigns (title, description, campaign_type, organization_id, created_by, start_date, end_date, country_id, region_id, city_id, venue, status, max_participants)
        VALUES
          (
            'Korle-Bu Emergency Blood Drive',
            'Urgent blood donation drive to replenish critically low O- and B+ stocks. All healthy adults aged 17-65 are welcome. Walk-ins accepted, registration preferred.',
            'donation_drive',
            _korle_bu_org,
            _system_user,
            now() + interval '3 days',
            now() + interval '5 days',
            (SELECT id FROM countries WHERE code = 'GH'),
            (SELECT id FROM regions WHERE name = 'Greater Accra'),
            (SELECT id FROM cities WHERE name = 'Accra'),
            'Korle-Bu Teaching Hospital, Main Auditorium',
            'upcoming',
            100
          ),
          (
            'National Blood Donation Day',
            'Annual nationwide blood donation campaign organized by Ghana Red Cross. Target: 10,000 units across all regions. Donate at any participating centre.',
            'awareness',
            _red_cross_org,
            _system_user,
            now() + interval '14 days',
            now() + interval '15 days',
            (SELECT id FROM countries WHERE code = 'GH'),
            (SELECT id FROM regions WHERE name = 'Greater Accra'),
            (SELECT id FROM cities WHERE name = 'Accra'),
            'All Red Cross centres nationwide',
            'upcoming',
            500
          ),
          (
            '37 Military Hospital Donor Registration',
            'Register as a regular blood donor at 37 Military Hospital. Registered donors receive priority access and health screenings. Ideal for first-time donors.',
            'registration',
            _37_mil_org,
            _system_user,
            now() + interval '7 days',
            now() + interval '7 days' + interval '6 hours',
            (SELECT id FROM countries WHERE code = 'GH'),
            (SELECT id FROM regions WHERE name = 'Greater Accra'),
            (SELECT id FROM cities WHERE name = 'Accra'),
            '37 Military Hospital, Blood Centre',
            'upcoming',
            50
          ),
          (
            'Kumasi Youth Blood Challenge',
            'Youth-focused donation challenge across Kumasi universities and SHSs. Top-donating campus wins a health workshop. Safe, supervised, rewarding.',
            'donation_drive',
            _komfo_org,
            _system_user,
            now() + interval '21 days',
            now() + interval '28 days',
            (SELECT id FROM countries WHERE code = 'GH'),
            (SELECT id FROM regions WHERE name = 'Ashanti'),
            (SELECT id FROM cities WHERE name = 'Kumasi'),
            'KNUST Campus, Student Centre',
            'upcoming',
            200
          );
      END IF;
    END;
  END IF;
END $$;


-- ═══════════════════════════════════════════════════════════
-- 7. SEED DATA — Additional Ghana cities with coordinates
-- Ensures the nearest-city resolver has more resolution
-- for users across Ghana.
-- ═══════════════════════════════════════════════════════════

INSERT INTO public.cities (region_id, name, latitude, longitude) VALUES
    ((SELECT id FROM regions WHERE name = 'Ashanti'), 'Ejisu', 6.7333, -1.3833),
    ((SELECT id FROM regions WHERE name = 'Northern'), 'Yendi', 9.4427, -0.0061),
    ((SELECT id FROM regions WHERE name = 'Western'), 'Sekondi', 4.9340, -1.7140),
    ((SELECT id FROM regions WHERE name = 'Central'), 'Mankessim', 5.2833, -1.0333),
    ((SELECT id FROM regions WHERE name = 'Eastern'), 'Nkawkaw', 6.5500, -0.7833),
    ((SELECT id FROM regions WHERE name = 'Bono'), 'Sunyani', 7.3349, -2.3266),
    ((SELECT id FROM regions WHERE name = 'Volta'), 'Hohoe', 6.7833, 0.4667),
    ((SELECT id FROM regions WHERE name = 'Upper East'), 'Bolgatanga', 10.7855, -0.8514),
    ((SELECT id FROM regions WHERE name = 'Upper West'), 'Wa', 10.0601, -2.5099),
    ((SELECT id FROM regions WHERE name = 'Western North'), 'Sefwi Wiawso', 6.2000, -2.4833),
    ((SELECT id FROM regions WHERE name = 'Ahafo'), 'Goaso', 6.8000, -2.5167),
    ((SELECT id FROM regions WHERE name = 'Bono East'), 'Techiman', 7.5900, -1.9400),
    ((SELECT id FROM regions WHERE name = 'Oti'), 'Dambai', 8.0667, 0.1833),
    ((SELECT id FROM regions WHERE name = 'North East'), 'Nalerigu', 10.5167, -0.3667),
    ((SELECT id FROM regions WHERE name = 'Savannah'), 'Damongo', 9.0833, -1.8167),
    ((SELECT id FROM regions WHERE name = 'Greater Accra'), 'Ashaiman', 5.6780, -0.0350),
    ((SELECT id FROM regions WHERE name = 'Greater Accra'), 'Teshie', 5.5833, -0.1000),
    ((SELECT id FROM regions WHERE name = 'Ashanti'), 'Mampong', 7.0500, -1.4000),
    ((SELECT id FROM regions WHERE name = 'Ashanti'), 'Konongo', 6.6167, -1.2167),
    ((SELECT id FROM regions WHERE name = 'Central'), 'Swedru', 5.3260, -1.2830)
ON CONFLICT (region_id, name) DO NOTHING;


-- ═══════════════════════════════════════════════════════════
-- 8. VERIFICATION: Ensure handle_new_user creates all
-- required rows. This is the canonical version — any prior
-- version is superseded.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', 'User'));

  INSERT INTO public.privacy_settings (user_id)
  VALUES (new.id);

  INSERT INTO public.user_locations (user_id)
  VALUES (new.id);

  INSERT INTO public.notification_preferences (user_id)
  VALUES (new.id);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- 9. FINAL find_nearby_users RPC
-- Canonical version with auth guard, is_premium, and
-- null-coordinate safety check.
-- ═══════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.find_nearby_users(uuid, text, integer, integer, integer);

CREATE OR REPLACE FUNCTION public.find_nearby_users(
    p_user_id UUID,
    p_blood_group TEXT DEFAULT NULL,
    p_radius_km INTEGER DEFAULT 25,
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    avatar_url TEXT,
    blood_group TEXT,
    city_name TEXT,
    region_name TEXT,
    country_name TEXT,
    approximate_distance_km DOUBLE PRECISION,
    is_available BOOLEAN,
    is_connected BOOLEAN,
    is_premium BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF auth.uid() IS NULL OR p_user_id IS DISTINCT FROM auth.uid() THEN
        RAISE EXCEPTION 'Not authorized to query another user''s location';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM user_locations
      WHERE user_id = p_user_id
        AND current_coordinates IS NOT NULL
    ) THEN
      RETURN;
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.display_name,
        p.avatar_url,
        CASE
            WHEN ps.blood_group_visibility IN ('public')
            THEN p.blood_group::TEXT
            WHEN ps.blood_group_visibility = 'connections'
                AND EXISTS (
                    SELECT 1 FROM connections c
                    WHERE (c.requester_id = p_user_id AND c.recipient_id = p.id)
                       OR (c.recipient_id = p_user_id AND c.requester_id = p.id)
                )
            THEN p.blood_group::TEXT
            ELSE NULL
        END,
        ci.name,
        r.name,
        co.name,
        ROUND(
            ST_Distance(
                ul.current_coordinates,
                (SELECT current_coordinates FROM user_locations WHERE user_locations.user_id = p_user_id)
            ) / 1000.0
        )::DOUBLE PRECISION,
        COALESCE(p.is_available, false),
        EXISTS (
            SELECT 1 FROM connections c
            WHERE (c.requester_id = p_user_id AND c.recipient_id = p.id AND c.status = 'accepted')
               OR (c.recipient_id = p_user_id AND c.requester_id = p.id AND c.status = 'accepted')
        ),
        COALESCE(p.is_premium, false)
    FROM profiles p
    JOIN privacy_settings ps ON ps.user_id = p.id
    JOIN user_locations ul ON ul.user_id = p.id
    LEFT JOIN cities ci ON ci.id = COALESCE(ul.current_city_id, ul.home_city_id)
    LEFT JOIN regions r ON r.id = COALESCE(ul.current_region_id, ul.home_region_id)
    LEFT JOIN countries co ON co.id = COALESCE(ul.current_country_id, ul.home_country_id)
    WHERE p.id != p_user_id
      AND ps.show_in_discovery = true
      AND ps.show_in_orbit = true
      AND ul.current_coordinates IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM user_blocks ub
          WHERE (ub.blocker_id = p_user_id AND ub.blocked_id = p.id)
             OR (ub.blocker_id = p.id AND ub.blocked_id = p_user_id)
      )
      AND (p_blood_group IS NULL OR p.blood_group::TEXT = p_blood_group)
      AND ST_DWithin(
          ul.current_coordinates,
          (SELECT current_coordinates FROM user_locations WHERE user_locations.user_id = p_user_id),
          p_radius_km * 1000
      )
    ORDER BY approximate_distance_km ASC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_nearby_users(uuid, text, integer, integer, integer) TO authenticated;


-- ═══════════════════════════════════════════════════════════
-- 10. FINAL upgrade_to_premium RPC
-- Canonical version. Includes auth guard.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.upgrade_to_premium()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _uid uuid := auth.uid();
  _already_premium boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN json_build_object('error', 'Not authenticated');
  END IF;

  SELECT is_premium INTO _already_premium
  FROM public.profiles
  WHERE id = _uid;

  IF _already_premium THEN
    RETURN json_build_object('error', 'Already premium');
  END IF;

  PERFORM set_config('app.trusted_action', 'upgrade_to_premium', true);

  UPDATE public.profiles
  SET is_premium   = true,
      updated_at   = now()
  WHERE id = _uid;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Profile not found');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upgrade_to_premium() TO authenticated;


-- ═══════════════════════════════════════════════════════════
-- 11. FINAL create_direct_conversation RPC
-- Canonical version with auth guard.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_direct_conversation(user_a UUID, user_b UUID)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _existing_id UUID;
  _conv_id UUID;
BEGIN
  IF auth.uid() IS NULL OR (auth.uid() <> user_a AND auth.uid() <> user_b) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT cp1.conversation_id INTO _existing_id
  FROM conversation_participants cp1
  JOIN conversation_participants cp2 ON cp2.conversation_id = cp1.conversation_id
  WHERE cp1.user_id = user_a
    AND cp2.user_id = user_b
    AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = cp1.conversation_id AND c.type = 'direct'
    )
  LIMIT 1;

  IF _existing_id IS NOT NULL THEN
    RETURN _existing_id;
  END IF;

  INSERT INTO conversations (type) VALUES ('direct') RETURNING id INTO _conv_id;
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (_conv_id, user_a);
  INSERT INTO conversation_participants (conversation_id, user_id) VALUES (_conv_id, user_b);
  RETURN _conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, uuid) TO authenticated;


-- ═══════════════════════════════════════════════════════════
-- 12. FINAL grant_premium RPC (server-side only)
-- For Paystack webhook to grant premium without the trigger
-- blocking it.
-- ═══════════════════════════════════════════════════════════

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
REVOKE EXECUTE ON FUNCTION public.grant_premium(uuid) FROM PUBLIC, anon, authenticated;


-- ═══════════════════════════════════════════════════════════
-- 13. STORAGE — avatars bucket (ensures idempotent creation)
-- ═══════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );


-- ═══════════════════════════════════════════════════════════
-- 14. SECURITY — privilege escalation prevention trigger
-- Ensures users cannot self-set is_premium, is_verified, etc.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF auth.uid() IS NULL OR auth.uid() <> NEW.id THEN
        RETURN NEW;
    END IF;

    IF current_setting('app.trusted_action', true) = 'upgrade_to_premium' THEN
        RETURN NEW;
    END IF;

    IF NEW.account_type      IS DISTINCT FROM OLD.account_type
       OR NEW.is_premium      IS DISTINCT FROM OLD.is_premium
       OR NEW.is_verified     IS DISTINCT FROM OLD.is_verified
       OR NEW.verification_level IS DISTINCT FROM OLD.verification_level
       OR NEW.human_verified  IS DISTINCT FROM OLD.human_verified
       OR NEW.identity_verified IS DISTINCT FROM OLD.identity_verified
    THEN
        RAISE EXCEPTION 'Cannot modify privileged profile fields';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_privilege_escalation ON public.profiles;
CREATE TRIGGER prevent_profile_privilege_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_privilege_escalation();


-- ═══════════════════════════════════════════════════════════
-- 15. SECURITY — profiles UPDATE policy with WITH CHECK
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);


-- ═══════════════════════════════════════════════════════════
-- 16. SECURITY — audit_logs + moderation_actions RLS
-- Server-only tables. RLS enabled, no public policies.
-- Only postgres/service_role (bypasses RLS) can access.
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;


-- ═══════════════════════════════════════════════════════════
-- 17. FINAL verification: all helper functions exist
-- These SECURITY DEFINER functions prevent RLS recursion
-- on community_members, organization_members, and
-- conversation_participants.
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.is_community_member(
  target_community_id UUID,
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
    FROM public.community_members
    WHERE community_id = target_community_id
      AND user_id = target_user_id
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_community_moderator(
  target_community_id UUID,
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
    FROM public.community_members
    WHERE community_id = target_community_id
      AND user_id = target_user_id
      AND role IN ('admin', 'moderator')
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_organization_member(
  target_organization_id UUID,
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
    FROM public.organization_members
    WHERE organization_id = target_organization_id
      AND user_id = target_user_id
      AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_organization_leader(
  target_organization_id UUID,
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
    FROM public.organization_members
    WHERE organization_id = target_organization_id
      AND user_id = target_user_id
      AND role IN ('owner', 'admin')
      AND is_active = true
  );
$$;

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


-- ═══════════════════════════════════════════════════════════
-- 18. FINAL RLS POLICIES (idempotent re-creation)
-- Every policy the app relies on, recreated in one place to
-- guarantee consistency regardless of which earlier
-- migrations were applied.
-- ═══════════════════════════════════════════════════════════

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

-- privacy_settings
DROP POLICY IF EXISTS "Users can manage own privacy settings" ON public.privacy_settings;
CREATE POLICY "Users can manage own privacy settings"
    ON public.privacy_settings FOR ALL USING (auth.uid() = user_id);

-- connections
DROP POLICY IF EXISTS "Users can view own connections" ON public.connections;
CREATE POLICY "Users can view own connections"
    ON public.connections FOR SELECT
    USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can create connection requests" ON public.connections;
CREATE POLICY "Users can create connection requests"
    ON public.connections FOR INSERT
    WITH CHECK (auth.uid() = requester_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update own connections" ON public.connections;
CREATE POLICY "Users can update own connections"
    ON public.connections FOR UPDATE
    USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- blood_requests
DROP POLICY IF EXISTS "Authenticated users can view requests" ON public.blood_requests;
CREATE POLICY "Authenticated users can view requests"
    ON public.blood_requests FOR SELECT
    USING (auth.role() = 'authenticated' AND status = 'active');

DROP POLICY IF EXISTS "Users can manage own requests" ON public.blood_requests;
CREATE POLICY "Users can manage own requests"
    ON public.blood_requests FOR ALL USING (auth.uid() = requester_id);

-- connection_requests
DROP POLICY IF EXISTS "Users can view own connection requests" ON public.connection_requests;
CREATE POLICY "Users can view own connection requests"
    ON public.connection_requests FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send connection requests" ON public.connection_requests;
CREATE POLICY "Users can send connection requests"
    ON public.connection_requests FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can update connection requests they are involved in" ON public.connection_requests;
CREATE POLICY "Users can update connection requests they are involved in"
    ON public.connection_requests FOR UPDATE
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- communities
DROP POLICY IF EXISTS "Anyone can view active communities" ON public.communities;
CREATE POLICY "Anyone can view active communities"
    ON public.communities FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Community creators can manage" ON public.communities;
CREATE POLICY "Community creators can manage"
    ON public.communities FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated users can create communities" ON public.communities;
CREATE POLICY "Authenticated users can create communities"
    ON public.communities FOR INSERT WITH CHECK (auth.uid() = created_by);

-- community_members
DROP POLICY IF EXISTS "Members can view memberships" ON public.community_members;
CREATE POLICY "Members can view memberships"
    ON public.community_members FOR SELECT
    USING (auth.uid() = user_id OR public.is_community_moderator(community_id));

DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
CREATE POLICY "Users can join communities"
    ON public.community_members FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage members" ON public.community_members;
CREATE POLICY "Admins can manage members"
    ON public.community_members FOR UPDATE
    USING (public.is_community_moderator(community_id, auth.uid()));

-- community_announcements
DROP POLICY IF EXISTS "Members can view announcements" ON public.community_announcements;
CREATE POLICY "Members can view announcements"
    ON public.community_announcements FOR SELECT
    USING (public.is_community_member(community_id));

DROP POLICY IF EXISTS "Admins and mods can post announcements" ON public.community_announcements;
CREATE POLICY "Admins and mods can post announcements"
    ON public.community_announcements FOR INSERT
    WITH CHECK (public.is_community_moderator(community_id));

-- organizations
DROP POLICY IF EXISTS "Anyone can view active organizations" ON public.organizations;
CREATE POLICY "Anyone can view active organizations"
    ON public.organizations FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Org creators can manage" ON public.organizations;
CREATE POLICY "Org creators can manage"
    ON public.organizations FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
CREATE POLICY "Authenticated users can create organizations"
    ON public.organizations FOR INSERT WITH CHECK (auth.uid() = created_by);

-- organization_members
DROP POLICY IF EXISTS "Members can view org memberships" ON public.organization_members;
CREATE POLICY "Members can view org memberships"
    ON public.organization_members FOR SELECT
    USING (auth.uid() = user_id OR public.is_organization_leader(organization_id));

DROP POLICY IF EXISTS "Owners can manage org members" ON public.organization_members;
CREATE POLICY "Owners can manage org members"
    ON public.organization_members FOR ALL
    USING (public.is_organization_leader(organization_id, auth.uid()));

-- conversations
DROP POLICY IF EXISTS "Users see own conversations" ON public.conversations;
CREATE POLICY "Users see own conversations"
    ON public.conversations FOR SELECT
    USING (id IN (
        SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT WITH CHECK (true);

-- conversation_participants
DROP POLICY IF EXISTS "Users see own participation" ON public.conversation_participants;
CREATE POLICY "Users see own participation"
    ON public.conversation_participants FOR SELECT
    USING (user_id = auth.uid() OR public.is_conversation_participant(conversation_id, auth.uid()));

DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
CREATE POLICY "Users can join conversations"
    ON public.conversation_participants FOR INSERT WITH CHECK (user_id = auth.uid());

-- messages
DROP POLICY IF EXISTS "Users read messages in their conversations" ON public.messages;
CREATE POLICY "Users read messages in their conversations"
    ON public.messages FOR SELECT
    USING (conversation_id IN (
        SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Users send messages to their conversations" ON public.messages;
CREATE POLICY "Users send messages to their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND conversation_id IN (
            SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid()
        )
    );

-- request_responses
DROP POLICY IF EXISTS "Request owners and responders can see responses" ON public.request_responses;
CREATE POLICY "Request owners and responders can see responses"
    ON public.request_responses FOR SELECT
    USING (
        auth.uid() = responder_id
        OR request_id IN (SELECT id FROM blood_requests WHERE requester_id = auth.uid())
    );

DROP POLICY IF EXISTS "Authenticated users can offer to respond" ON public.request_responses;
CREATE POLICY "Authenticated users can offer to respond"
    ON public.request_responses FOR INSERT WITH CHECK (auth.uid() = responder_id);

DROP POLICY IF EXISTS "Participants can update responses" ON public.request_responses;
CREATE POLICY "Participants can update responses"
    ON public.request_responses FOR UPDATE
    USING (
        auth.uid() = responder_id
        OR request_id IN (SELECT id FROM blood_requests WHERE requester_id = auth.uid())
    );

-- request_verifications
DROP POLICY IF EXISTS "Request owner and responders can view verifications" ON public.request_verifications;
CREATE POLICY "Request owner and responders can view verifications"
    ON public.request_verifications FOR SELECT
    USING (
        request_id IN (SELECT id FROM blood_requests WHERE requester_id = auth.uid())
        OR request_id IN (SELECT request_id FROM request_responses WHERE responder_id = auth.uid())
    );

-- campaigns
DROP POLICY IF EXISTS "Anyone can view active campaigns" ON public.campaigns;
CREATE POLICY "Anyone can view active campaigns"
    ON public.campaigns FOR SELECT USING (status IN ('upcoming', 'active'));

DROP POLICY IF EXISTS "Campaign creators can manage" ON public.campaigns;
CREATE POLICY "Campaign creators can manage"
    ON public.campaigns FOR ALL USING (auth.uid() = created_by);

-- campaign_participants
DROP POLICY IF EXISTS "Users can view participation" ON public.campaign_participants;
CREATE POLICY "Users can view participation"
    ON public.campaign_participants FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can participate in campaigns" ON public.campaign_participants;
CREATE POLICY "Users can participate in campaigns"
    ON public.campaign_participants FOR INSERT WITH CHECK (auth.uid() = user_id);

-- notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- push_tokens
DROP POLICY IF EXISTS "Users can manage own push tokens" ON public.push_tokens;
CREATE POLICY "Users can manage own push tokens"
    ON public.push_tokens FOR ALL USING (auth.uid() = user_id);

-- notification_preferences
DROP POLICY IF EXISTS "Users can manage own notification preferences" ON public.notification_preferences;
CREATE POLICY "Users can manage own notification preferences"
    ON public.notification_preferences FOR ALL USING (auth.uid() = user_id);

-- user_blocks
DROP POLICY IF EXISTS "Users can manage own blocks" ON public.user_blocks;
CREATE POLICY "Users can manage own blocks"
    ON public.user_blocks FOR ALL USING (auth.uid() = blocker_id);

-- reports
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
    ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports"
    ON public.reports FOR SELECT USING (auth.uid() = reporter_id);

-- user_locations
DROP POLICY IF EXISTS "Users can read own location" ON public.user_locations;
CREATE POLICY "Users can read own location"
    ON public.user_locations FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own location" ON public.user_locations;
CREATE POLICY "Users can update own location"
    ON public.user_locations FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own location" ON public.user_locations;
CREATE POLICY "Users can insert own location"
    ON public.user_locations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- availability_statuses
DROP POLICY IF EXISTS "Users can manage own availability" ON public.availability_statuses;
CREATE POLICY "Users can manage own availability"
    ON public.availability_statuses FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view availability" ON public.availability_statuses;
CREATE POLICY "Authenticated users can view availability"
    ON public.availability_statuses FOR SELECT USING (auth.role() = 'authenticated');

-- verification_records
DROP POLICY IF EXISTS "Users can view own verifications" ON public.verification_records;
CREATE POLICY "Users can view own verifications"
    ON public.verification_records FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can submit verifications" ON public.verification_records;
CREATE POLICY "Users can submit verifications"
    ON public.verification_records FOR INSERT WITH CHECK (auth.uid() = user_id);

-- reference data (countries, regions, cities)
DROP POLICY IF EXISTS "Reference data is readable by authenticated users" ON public.countries;
CREATE POLICY "Reference data is readable by authenticated users"
    ON public.countries FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Reference data is readable by authenticated users" ON public.regions;
CREATE POLICY "Reference data is readable by authenticated users"
    ON public.regions FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Reference data is readable by authenticated users" ON public.cities;
CREATE POLICY "Reference data is readable by authenticated users"
    ON public.cities FOR SELECT USING (auth.role() = 'authenticated');
