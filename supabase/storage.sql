-- Avatar storage bucket setup
-- Run this in the Supabase SQL Editor after creating the 'avatars' bucket
-- in Storage > New bucket (toggle "Public bucket" ON)

-- Allow any authenticated user to upload/update their own avatar
-- Path convention: avatars/{user_id}/avatar.{ext}
create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars' and
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Public read (bucket is already public, but this makes it explicit)
create policy "Avatar images are publicly accessible"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');
