-- Migration: Create the public "avatars" storage bucket and its RLS policies.
--
-- The app uploads profile photos to a public 'avatars' bucket and reads them
-- back via getPublicUrl(). This ensures the bucket exists and that
-- authenticated users may only manage files inside their own folder.

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Allow any authenticated user (and anon) to read publicly-visible avatars.
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow a user to upload an avatar into their own folder.
CREATE POLICY "Users can upload their own avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow a user to update/overwrite their own avatar.
CREATE POLICY "Users can update their own avatars"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow a user to delete their own avatar.
CREATE POLICY "Users can delete their own avatars"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
