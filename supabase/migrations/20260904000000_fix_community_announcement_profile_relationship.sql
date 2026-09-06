-- Align community announcement authors with public.profiles so PostgREST can join them.
DO $$
BEGIN
  ALTER TABLE public.community_announcements
    DROP CONSTRAINT IF EXISTS community_announcements_author_id_fkey;

  ALTER TABLE public.community_announcements
    ADD CONSTRAINT community_announcements_author_id_fkey
    FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;
