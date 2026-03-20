-- Add per-checkin flavor tags so community radar charts can be built from individual perceptions
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS flavor_tags text[] DEFAULT '{}';
