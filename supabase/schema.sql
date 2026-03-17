-- Profiles (auto-created on signup via trigger)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text,
  bio text,
  created_at timestamptz default now()
);

-- Whiskies
create table if not exists public.whiskies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  distillery text not null,
  region text,
  country text not null,
  type text not null check (type in ('single_malt','blended','bourbon','rye','irish','japanese','other')),
  age_statement integer,
  abv numeric(5,2),
  description text,
  status text not null default 'pending' check (status in ('approved','pending')),
  submitted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now()
);

-- Check-ins
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  whisky_id uuid not null references public.whiskies(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  nose text,
  palate text,
  finish text,
  overall_notes text,
  serving_type text not null check (serving_type in ('neat','rocks','water','cocktail')),
  date date not null default current_date,
  created_at timestamptz default now()
);

-- Badges
create table if not exists public.badges (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  criteria_type text not null,
  criteria_value integer not null
);

-- User badges (earned)
create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id text not null references public.badges(id) on delete cascade,
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);

-- Collection
create table if not exists public.collection (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  whisky_id uuid not null references public.whiskies(id) on delete cascade,
  status text not null check (status in ('have','want','had')),
  created_at timestamptz default now(),
  unique(user_id, whisky_id)
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.whiskies enable row level security;
alter table public.checkins enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.collection enable row level security;

create policy "Profiles are public" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Approved whiskies are public" on public.whiskies for select using (status = 'approved' or submitted_by = auth.uid());
create policy "Authenticated users can submit whiskies" on public.whiskies for insert with check (auth.role() = 'authenticated');

create policy "Checkins are public" on public.checkins for select using (true);
create policy "Users can insert own checkins" on public.checkins for insert with check (auth.uid() = user_id);
create policy "Users can delete own checkins" on public.checkins for delete using (auth.uid() = user_id);

create policy "Badges are public" on public.badges for select using (true);
create policy "User badges are public" on public.user_badges for select using (true);
create policy "Users can earn badges" on public.user_badges for insert with check (auth.uid() = user_id);

create policy "Collection is public" on public.collection for select using (true);
create policy "Users manage own collection" on public.collection for all using (auth.uid() = user_id);

-- Seed popular whiskies
insert into public.whiskies (name, distillery, country, region, type, age_statement, abv, description, status) values
  ('Jim Beam White Label', 'Jim Beam', 'USA', 'Kentucky', 'bourbon', 4, 40.0, 'The world''s best-selling bourbon. Light and approachable with notes of vanilla, oak, and a hint of sweetness.', 'approved'),
  ('Jack Daniel''s Old No. 7', 'Jack Daniel''s', 'USA', 'Tennessee', 'other', null, 40.0, 'Tennessee whiskey filtered through sugar maple charcoal. Smooth and mellow with notes of caramel, vanilla, and toasted oak.', 'approved'),
  ('Wild Turkey 101', 'Wild Turkey', 'USA', 'Kentucky', 'bourbon', null, 50.5, 'A high-proof Kentucky bourbon with bold flavors of spice, caramel, vanilla, and a long peppery finish.', 'approved'),
  ('Buffalo Trace', 'Buffalo Trace', 'USA', 'Kentucky', 'bourbon', null, 40.0, 'Rich and complex with notes of vanilla, mint, molasses, and brown sugar. One of the most awarded distilleries in the world.', 'approved')
on conflict do nothing;
