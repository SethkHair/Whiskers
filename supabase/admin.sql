-- Add is_admin flag to profiles
alter table public.profiles add column if not exists is_admin boolean default false;

-- Allow admins to update whisky status
create policy "Admins can update whiskies" on public.whiskies
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Allow admins to delete whiskies
create policy "Admins can delete whiskies" on public.whiskies
  for delete using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- Set yourself as admin (replace with your actual user ID from Supabase Auth dashboard)
-- update public.profiles set is_admin = true where id = 'your-user-id-here';
