-- Project LifeOrbit — Complete Database Schema
-- Migration: 20260831000001_complete_schema.sql
-- This migration builds on top of the initial schema and adds all missing tables
-- required by the full implementation plan.

-- ═══════════════════════════════════════════════════════════
-- 1. HIERARCHICAL LOCATION SYSTEM
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.countries (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code CHAR(2) NOT NULL UNIQUE,  -- ISO 3166-1 alpha-2
    phone_code TEXT
);

CREATE TABLE IF NOT EXISTS public.regions (
    id SERIAL PRIMARY KEY,
    country_id INTEGER NOT NULL REFERENCES countries(id),
    name TEXT NOT NULL,
    UNIQUE(country_id, name)
);

CREATE TABLE IF NOT EXISTS public.cities (
    id SERIAL PRIMARY KEY,
    region_id INTEGER NOT NULL REFERENCES regions(id),
    name TEXT NOT NULL,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    UNIQUE(region_id, name)
);

-- Seed Ghana data (MVP first market)
INSERT INTO public.countries (name, code, phone_code) VALUES ('Ghana', 'GH', '+233');

INSERT INTO public.regions (country_id, name) VALUES
    ((SELECT id FROM countries WHERE code = 'GH'), 'Greater Accra'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Ashanti'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Northern'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Western'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Central'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Eastern'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Volta'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Upper East'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Upper West'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Bono'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Bono East'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Ahafo'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Western North'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Oti'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'North East'),
    ((SELECT id FROM countries WHERE code = 'GH'), 'Savannah');

INSERT INTO public.cities (region_id, name, latitude, longitude) VALUES
    ((SELECT id FROM regions WHERE name = 'Greater Accra'), 'Accra', 5.6037, -0.1870),
    ((SELECT id FROM regions WHERE name = 'Greater Accra'), 'Tema', 5.6698, -0.0166),
    ((SELECT id FROM regions WHERE name = 'Greater Accra'), 'Madina', 5.6800, -0.1700),
    ((SELECT id FROM regions WHERE name = 'Ashanti'), 'Kumasi', 6.6885, -1.6244),
    ((SELECT id FROM regions WHERE name = 'Ashanti'), 'Obuasi', 6.2026, -1.6613),
    ((SELECT id FROM regions WHERE name = 'Northern'), 'Tamale', 9.4008, -0.8393),
    ((SELECT id FROM regions WHERE name = 'Western'), 'Takoradi', 4.8826, -1.7554),
    ((SELECT id FROM regions WHERE name = 'Central'), 'Cape Coast', 5.1036, -1.2466),
    ((SELECT id FROM regions WHERE name = 'Eastern'), 'Koforidua', 6.0941, -0.2573),
    ((SELECT id FROM regions WHERE name = 'Volta'), 'Ho', 6.6000, 0.4710);


-- ═══════════════════════════════════════════════════════════
-- 2. USER LOCATIONS (Separate table — security isolation)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_locations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    home_country_id INTEGER REFERENCES countries(id),
    home_region_id INTEGER REFERENCES regions(id),
    home_city_id INTEGER REFERENCES cities(id),
    home_coordinates GEOGRAPHY(POINT, 4326),
    current_country_id INTEGER REFERENCES countries(id),
    current_region_id INTEGER REFERENCES regions(id),
    current_city_id INTEGER REFERENCES cities(id),
    current_coordinates GEOGRAPHY(POINT, 4326),
    is_temporarily_elsewhere BOOLEAN DEFAULT false,
    coordinates_updated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_locations_home_geo ON user_locations USING GIST (home_coordinates);
CREATE INDEX IF NOT EXISTS idx_user_locations_current_geo ON user_locations USING GIST (current_coordinates);

ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own location"
    ON public.user_locations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own location"
    ON public.user_locations FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own location"
    ON public.user_locations FOR INSERT
    WITH CHECK (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- 3. AVAILABILITY STATUS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.availability_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_available BOOLEAN DEFAULT true,
    available_until TIMESTAMPTZ,
    note TEXT CHECK (char_length(note) <= 200),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.availability_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own availability"
    ON public.availability_statuses FOR ALL
    USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- 4. VERIFICATION SYSTEM
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.verification_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL CHECK (verification_type IN (
        'human', 'identity', 'community', 'organization', 'medical_donor'
    )),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'approved', 'rejected', 'expired', 'revoked'
    )),
    verified_by UUID REFERENCES auth.users(id),
    evidence_url TEXT,
    notes TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verifications"
    ON public.verification_records FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can submit verifications"
    ON public.verification_records FOR INSERT
    WITH CHECK (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- 5. CONNECTION REQUESTS (Separate from active connections)
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.connection_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'declined', 'cancelled'
    )),
    message TEXT CHECK (char_length(message) <= 300),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(sender_id, receiver_id),
    CHECK (sender_id != receiver_id)
);

CREATE TRIGGER update_connection_requests_updated_at
    BEFORE UPDATE ON connection_requests
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

ALTER TABLE public.connection_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own connection requests"
    ON public.connection_requests FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send connection requests"
    ON public.connection_requests FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update connection requests they are involved in"
    ON public.connection_requests FOR UPDATE
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);


-- ═══════════════════════════════════════════════════════════
-- 6. COMMUNITIES
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 100),
    slug TEXT NOT NULL UNIQUE,
    description TEXT CHECK (char_length(description) <= 2000),
    logo_url TEXT,
    cover_url TEXT,
    country_id INTEGER REFERENCES countries(id),
    region_id INTEGER REFERENCES regions(id),
    city_id INTEGER REFERENCES cities(id),
    join_policy TEXT DEFAULT 'request' CHECK (join_policy IN (
        'open', 'request', 'invite_only'
    )),
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    member_count INTEGER DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER update_communities_updated_at
    BEFORE UPDATE ON communities
    FOR EACH ROW EXECUTE PROCEDURE handle_updated_at();

CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN (
        'admin', 'moderator', 'member'
    )),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'pending', 'active', 'suspended', 'left'
    )),
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(community_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.community_announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES auth.users(id),
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
    content TEXT NOT NULL CHECK (char_length(content) <= 5000),
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active communities"
    ON public.communities FOR SELECT
    USING (is_active = true);

CREATE POLICY "Community creators can manage"
    ON public.communities FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create communities"
    ON public.communities FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view memberships"
    ON public.community_members FOR SELECT
    USING (
        auth.uid() = user_id
        OR community_id IN (
            SELECT community_id FROM community_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );

CREATE POLICY "Users can join communities"
    ON public.community_members FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage members"
    ON public.community_members FOR UPDATE
    USING (
        community_id IN (
            SELECT community_id FROM community_members
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Members can view announcements"
    ON public.community_announcements FOR SELECT
    USING (
        community_id IN (
            SELECT community_id FROM community_members
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "Admins and mods can post announcements"
    ON public.community_announcements FOR INSERT
    WITH CHECK (
        community_id IN (
            SELECT community_id FROM community_members
            WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
        )
    );


-- ═══════════════════════════════════════════════════════════
-- 7. ORGANIZATIONS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL CHECK (char_length(name) BETWEEN 3 AND 150),
    slug TEXT NOT NULL UNIQUE,
    description TEXT CHECK (char_length(description) <= 3000),
    org_type TEXT NOT NULL CHECK (org_type IN (
        'hospital', 'blood_bank', 'ngo', 'medical_institution', 'other'
    )),
    logo_url TEXT,
    website_url TEXT,
    country_id INTEGER REFERENCES countries(id),
    region_id INTEGER REFERENCES regions(id),
    city_id INTEGER REFERENCES cities(id),
    coordinates GEOGRAPHY(POINT, 4326),
    verification_level TEXT DEFAULT 'unverified' CHECK (verification_level IN (
        'unverified', 'basic', 'verified', 'premium'
    )),
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN (
        'owner', 'admin', 'staff'
    )),
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(organization_id, user_id)
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active organizations"
    ON public.organizations FOR SELECT
    USING (is_active = true);

CREATE POLICY "Org creators can manage"
    ON public.organizations FOR UPDATE
    USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create organizations"
    ON public.organizations FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view org memberships"
    ON public.organization_members FOR SELECT
    USING (auth.uid() = user_id OR organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    ));

CREATE POLICY "Owners can manage org members"
    ON public.organization_members FOR ALL
    USING (organization_id IN (
        SELECT organization_id FROM organization_members
        WHERE user_id = auth.uid() AND role = 'owner'
    ));


-- ═══════════════════════════════════════════════════════════
-- 8. MESSAGING SYSTEM
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'request')),
    created_at TIMESTAMPTZ DEFAULT now(),
    last_message_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    last_read_at TIMESTAMPTZ DEFAULT now(),
    is_muted BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
    is_system_message BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user ON conversation_participants(user_id);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own conversations"
    ON public.conversations FOR SELECT
    USING (id IN (
        SELECT conversation_id FROM conversation_participants
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users can create conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (true);  -- Participant check is enforced at app layer

CREATE POLICY "Users see own participation"
    ON public.conversation_participants FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can join conversations"
    ON public.conversation_participants FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read messages in their conversations"
    ON public.messages FOR SELECT
    USING (conversation_id IN (
        SELECT conversation_id FROM conversation_participants
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Users send messages to their conversations"
    ON public.messages FOR INSERT
    WITH CHECK (
        sender_id = auth.uid()
        AND conversation_id IN (
            SELECT conversation_id FROM conversation_participants
            WHERE user_id = auth.uid()
        )
    );


-- ═══════════════════════════════════════════════════════════
-- 9. BLOOD REQUEST RESPONSES & VERIFICATIONS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.request_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'offered' CHECK (status IN (
        'offered', 'accepted', 'declined', 'completed', 'cancelled'
    )),
    message TEXT CHECK (char_length(message) <= 1000),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(request_id, responder_id)
);

CREATE TABLE IF NOT EXISTS public.request_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES blood_requests(id) ON DELETE CASCADE,
    verified_by_org_id UUID REFERENCES organizations(id),
    verified_by_community_id UUID REFERENCES communities(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'verified', 'rejected'
    )),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.request_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Request owners and responders can see responses"
    ON public.request_responses FOR SELECT
    USING (
        auth.uid() = responder_id
        OR request_id IN (
            SELECT id FROM blood_requests WHERE requester_id = auth.uid()
        )
    );

CREATE POLICY "Authenticated users can offer to respond"
    ON public.request_responses FOR INSERT
    WITH CHECK (auth.uid() = responder_id);

CREATE POLICY "Participants can update responses"
    ON public.request_responses FOR UPDATE
    USING (
        auth.uid() = responder_id
        OR request_id IN (
            SELECT id FROM blood_requests WHERE requester_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can view request verifications"
    ON public.request_verifications FOR SELECT
    USING (true);


-- ═══════════════════════════════════════════════════════════
-- 10. CAMPAIGNS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
    description TEXT CHECK (char_length(description) <= 5000),
    campaign_type TEXT DEFAULT 'donation_drive' CHECK (campaign_type IN (
        'donation_drive', 'awareness', 'registration', 'other'
    )),
    community_id UUID REFERENCES communities(id),
    organization_id UUID REFERENCES organizations(id),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    country_id INTEGER REFERENCES countries(id),
    region_id INTEGER REFERENCES regions(id),
    city_id INTEGER REFERENCES cities(id),
    venue TEXT,
    coordinates GEOGRAPHY(POINT, 4326),
    cover_image_url TEXT,
    max_participants INTEGER,
    status TEXT DEFAULT 'upcoming' CHECK (status IN (
        'draft', 'upcoming', 'active', 'completed', 'cancelled'
    )),
    safety_info TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'interested' CHECK (status IN (
        'interested', 'registered', 'attended', 'cancelled'
    )),
    registered_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(campaign_id, user_id)
);

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaign_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active campaigns"
    ON public.campaigns FOR SELECT
    USING (status IN ('upcoming', 'active'));

CREATE POLICY "Campaign creators can manage"
    ON public.campaigns FOR ALL
    USING (auth.uid() = created_by);

CREATE POLICY "Users can view own participation"
    ON public.campaign_participants FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can participate in campaigns"
    ON public.campaign_participants FOR INSERT
    WITH CHECK (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- 11. NOTIFICATIONS & PUSH TOKENS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN (
        'connection_request', 'connection_accepted',
        'message', 'message_request',
        'blood_request', 'request_response',
        'community_invite', 'community_announcement',
        'campaign_reminder',
        'verification_update',
        'system'
    )),
    title TEXT NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS public.push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    push_messages BOOLEAN DEFAULT true,
    push_connections BOOLEAN DEFAULT true,
    push_blood_requests BOOLEAN DEFAULT true,
    push_community BOOLEAN DEFAULT true,
    push_campaigns BOOLEAN DEFAULT true,
    push_security BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own push tokens"
    ON public.push_tokens FOR ALL
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own notification preferences"
    ON public.notification_preferences FOR ALL
    USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- 12. MODERATION & SAFETY
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(blocker_id, blocked_id),
    CHECK (blocker_id != blocked_id)
);

CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES auth.users(id),
    reported_user_id UUID REFERENCES auth.users(id),
    reported_community_id UUID REFERENCES communities(id),
    reported_request_id UUID REFERENCES blood_requests(id),
    reported_message_id UUID REFERENCES messages(id),
    reason TEXT NOT NULL CHECK (reason IN (
        'spam', 'harassment', 'fake_account', 'misinformation',
        'inappropriate_content', 'suspicious_request', 'other'
    )),
    description TEXT CHECK (char_length(description) <= 2000),
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'reviewing', 'resolved', 'dismissed'
    )),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.moderation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id),
    moderator_id UUID NOT NULL REFERENCES auth.users(id),
    action_type TEXT NOT NULL CHECK (action_type IN (
        'warning', 'content_removed', 'suspended', 'banned', 'dismissed'
    )),
    target_user_id UUID REFERENCES auth.users(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own blocks"
    ON public.user_blocks FOR ALL
    USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create reports"
    ON public.reports FOR INSERT
    WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Users can view own reports"
    ON public.reports FOR SELECT
    USING (auth.uid() = reporter_id);


-- ═══════════════════════════════════════════════════════════
-- 13. PRIVACY-AWARE DISCOVERY FUNCTION
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION find_nearby_users(
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
    is_connected BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
        COALESCE(p.is_verified, false),
        EXISTS (
            SELECT 1 FROM connections c
            WHERE (c.requester_id = p_user_id AND c.recipient_id = p.id AND c.status = 'accepted')
               OR (c.recipient_id = p_user_id AND c.requester_id = p.id AND c.status = 'accepted')
        )
    FROM profiles p
    JOIN privacy_settings ps ON ps.user_id = p.id
    JOIN user_locations ul ON ul.user_id = p.id
    LEFT JOIN cities ci ON ci.id = COALESCE(ul.current_city_id, ul.home_city_id)
    LEFT JOIN regions r ON r.id = COALESCE(ul.current_region_id, ul.home_region_id)
    LEFT JOIN countries co ON co.id = COALESCE(ul.current_country_id, ul.home_country_id)
    WHERE p.id != p_user_id
      AND ps.show_in_discovery = true
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


-- ═══════════════════════════════════════════════════════════
-- 14. UPDATE handle_new_user TRIGGER
-- ═══════════════════════════════════════════════════════════
-- Extend the existing trigger to also create user_locations
-- and notification_preferences rows on signup.

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
