-- Project LifeOrbit — Posts & Network Feed
-- Migration: 20260902000000_posts_feed.sql
--
-- Adds a purpose-driven network feed so users can:
--   Discover → Connect → Communicate → Post → Mobilize
--
-- Additive only. No existing tables/columns are removed or altered. RLS is
-- enabled on every new table and visibility is enforced at the database level:
--   - public posts        → all authenticated users
--   - connections posts   → accepted connections only
--   - community posts     → active community members only
--   - private posts       → the author only
-- Blocked users never see each other's posts.
--
-- A reported_post_id column is added to the existing reports table so posts
-- can be reported through the existing moderation system.

-- ═══════════════════════════════════════════════════════════
-- 1. POSTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL DEFAULT 'connection' CHECK (purpose IN (
        'connection', 'assistance', 'awareness', 'community', 'campaign', 'organization'
    )),
    visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN (
        'public', 'connections', 'community', 'private'
    )),

    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 5000),
    blood_group blood_group,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    city_id INTEGER REFERENCES cities(id),
    region_id INTEGER REFERENCES regions(id),
    country_id INTEGER REFERENCES countries(id),

    -- Sharing within BloodIn: re-shared posts reference the original post.
    shared_from_post_id UUID REFERENCES posts(id) ON DELETE SET NULL,

    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_posts_feed ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_community ON posts(community_id, created_at DESC);

-- A shared post must not be shared from itself.
ALTER TABLE public.posts
    DROP CONSTRAINT IF EXISTS posts_no_self_share;
ALTER TABLE public.posts
    ADD CONSTRAINT posts_no_self_share
    CHECK (shared_from_post_id IS NULL OR shared_from_post_id <> id);


-- ═══════════════════════════════════════════════════════════
-- 2. POST COMMENTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments(post_id, created_at);


-- ═══════════════════════════════════════════════════════════
-- 3. POST REACTIONS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.post_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL DEFAULT 'support' CHECK (reaction IN (
        'support', 'helpful', 'interested'
    )),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);


-- ═══════════════════════════════════════════════════════════
-- 4. POST ACCESS HELPER
-- ═══════════════════════════════════════════════════════════
-- SECURITY DEFINER so it can consult connections/community_members which are
-- RLS-protected. It only ever returns a boolean about the current caller and
-- never exposes row data. Blocked users are always excluded.

CREATE OR REPLACE FUNCTION public.can_view_post(p_post_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.posts p
        WHERE p.id = p_post_id
          AND p.status = 'active'
          AND (
                p.author_id = auth.uid()
            OR (p.visibility = 'public' AND p.community_id IS NULL)
            OR (p.visibility = 'connections' AND EXISTS (
                    SELECT 1 FROM public.connections c
                    WHERE c.status = 'accepted'
                      AND ((c.requester_id = auth.uid() AND c.recipient_id = p.author_id)
                        OR (c.requester_id = p.author_id AND c.recipient_id = auth.uid()))
                ))
            OR (p.visibility = 'community' AND p.community_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM public.community_members cm
                    WHERE cm.community_id = p.community_id
                      AND cm.user_id = auth.uid()
                      AND cm.status = 'active'
                ))
          )
          AND NOT EXISTS (
                SELECT 1 FROM public.user_blocks ub
                WHERE (ub.blocker_id = auth.uid() AND ub.blocked_id = p.author_id)
                   OR (ub.blocker_id = p.author_id AND ub.blocked_id = auth.uid())
          )
    );
$$;


-- ═══════════════════════════════════════════════════════════
-- 5. RLS — POSTS
-- ═══════════════════════════════════════════════════════════

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read posts they can view" ON public.posts;
CREATE POLICY "Users can read posts they can view"
    ON public.posts FOR SELECT
    USING (public.can_view_post(id));

DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Users can create posts"
    ON public.posts FOR INSERT
    WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own posts" ON public.posts;
CREATE POLICY "Authors can update own posts"
    ON public.posts FOR UPDATE
    USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own posts" ON public.posts;
CREATE POLICY "Authors can delete own posts"
    ON public.posts FOR DELETE
    USING (auth.uid() = author_id);


-- ═══════════════════════════════════════════════════════════
-- 6. RLS — POST COMMENTS
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can read comments on viewable posts" ON public.post_comments;
CREATE POLICY "Users can read comments on viewable posts"
    ON public.post_comments FOR SELECT
    USING (public.can_view_post(post_id));

DROP POLICY IF EXISTS "Users can comment on viewable posts" ON public.post_comments;
CREATE POLICY "Users can comment on viewable posts"
    ON public.post_comments FOR INSERT
    WITH CHECK (auth.uid() = author_id AND public.can_view_post(post_id));

DROP POLICY IF EXISTS "Comment authors can update own comments" ON public.post_comments;
CREATE POLICY "Comment authors can update own comments"
    ON public.post_comments FOR UPDATE
    USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Comment authors can delete own comments" ON public.post_comments;
CREATE POLICY "Comment authors can delete own comments"
    ON public.post_comments FOR DELETE
    USING (auth.uid() = author_id);


-- ═══════════════════════════════════════════════════════════
-- 7. RLS — POST REACTIONS
-- ═══════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "Users can view reactions on viewable posts" ON public.post_reactions;
CREATE POLICY "Users can view reactions on viewable posts"
    ON public.post_reactions FOR SELECT
    USING (public.can_view_post(post_id));

DROP POLICY IF EXISTS "Users can react to viewable posts" ON public.post_reactions;
CREATE POLICY "Users can react to viewable posts"
    ON public.post_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id AND public.can_view_post(post_id));

DROP POLICY IF EXISTS "Users can update own reactions" ON public.post_reactions;
CREATE POLICY "Users can update own reactions"
    ON public.post_reactions FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own reactions" ON public.post_reactions;
CREATE POLICY "Users can delete own reactions"
    ON public.post_reactions FOR DELETE
    USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════
-- 8. REPORTS — allow reporting posts (additive, nullable)
-- ═══════════════════════════════════════════════════════════

DO $$ BEGIN
    ALTER TABLE public.reports ADD COLUMN reported_post_id UUID REFERENCES posts(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;