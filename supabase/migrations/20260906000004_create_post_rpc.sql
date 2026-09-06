-- BloodLink — Secure post creation RPC
-- Use auth.uid() at the database boundary instead of trusting a client author_id.

CREATE OR REPLACE FUNCTION public.create_post(
    p_purpose TEXT,
    p_content TEXT,
    p_visibility TEXT DEFAULT 'public',
    p_blood_group TEXT DEFAULT NULL,
    p_community_id UUID DEFAULT NULL,
    p_shared_from_post_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_post_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF p_content IS NULL OR char_length(btrim(p_content)) < 1 OR char_length(p_content) > 5000 THEN
        RAISE EXCEPTION 'Post content must be between 1 and 5000 characters';
    END IF;

    IF p_visibility = 'community' THEN
        IF p_community_id IS NULL OR NOT EXISTS (
            SELECT 1
            FROM public.community_members cm
            WHERE cm.community_id = p_community_id
              AND cm.user_id = auth.uid()
              AND cm.status = 'active'
        ) THEN
            RAISE EXCEPTION 'You must be an active community member to post there';
        END IF;
    END IF;

    INSERT INTO public.posts (
        author_id,
        purpose,
        content,
        visibility,
        blood_group,
        community_id,
        shared_from_post_id
    )
    VALUES (
        auth.uid(),
        p_purpose,
        btrim(p_content),
        p_visibility,
        NULLIF(p_blood_group, '')::public.blood_group,
        p_community_id,
        p_shared_from_post_id
    )
    RETURNING id INTO new_post_id;

    RETURN new_post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_post(text, text, text, text, uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_post(text, text, text, text, uuid, uuid) TO authenticated;
