-- Distillery profiles with parent/umbrella company support
CREATE TABLE public.distilleries (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,
  country       text,
  region        text,
  founded_year  int,
  description   text,
  website       text,
  parent_id     uuid REFERENCES public.distilleries(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE public.distilleries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Distilleries viewable by everyone"
  ON public.distilleries FOR SELECT USING (true);

CREATE POLICY "Admins can manage distilleries"
  ON public.distilleries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND is_admin = true
  ));

-- Link whiskies to distillery records (non-destructive, nullable)
ALTER TABLE public.whiskies ADD COLUMN IF NOT EXISTS distillery_id uuid REFERENCES public.distilleries(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS whiskies_distillery_id_idx ON public.whiskies(distillery_id);

-- Allow admins to update distillery_id on whiskies
-- (Admin update policy already exists from admin.sql; this is a reminder comment)
-- If needed, run: CREATE POLICY "Admins can update whiskies" ON public.whiskies
--   FOR UPDATE USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
