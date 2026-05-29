-- Avatar fix — run this in Supabase SQL Editor.

-- Ensure avatar_url columns exist
ALTER TABLE public.users  ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS avatar_url text;

-- Ensure bucket exists and is public; set allowed_mime_types to NULL (no restriction — client validates)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 1048576, NULL)
ON CONFLICT (id) DO UPDATE
  SET public = true,
      file_size_limit = 1048576,
      allowed_mime_types = NULL;

-- Recreate policies with explicit TO public so anon role is covered
DROP POLICY IF EXISTS "avatars_select" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update" ON storage.objects;
DROP POLICY IF EXISTS "avatars_delete" ON storage.objects;

CREATE POLICY "avatars_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'avatars');

CREATE POLICY "avatars_insert" ON storage.objects
  FOR INSERT TO public WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_update" ON storage.objects
  FOR UPDATE TO public USING (bucket_id = 'avatars');

CREATE POLICY "avatars_delete" ON storage.objects
  FOR DELETE TO public USING (bucket_id = 'avatars');
