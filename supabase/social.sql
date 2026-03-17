-- Likes on check-ins
CREATE TABLE public.likes (
  user_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  checkin_id uuid REFERENCES public.checkins(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, checkin_id)
);
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes viewable by everyone"     ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users can manage own likes"     ON public.likes FOR ALL    USING (auth.uid() = user_id);

-- Comments on check-ins
CREATE TABLE public.comments (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES public.profiles(id)  ON DELETE CASCADE NOT NULL,
  checkin_id uuid REFERENCES public.checkins(id)  ON DELETE CASCADE NOT NULL,
  body       text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments viewable by everyone"     ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can insert own comments"     ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments"     ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Notifications
CREATE TABLE public.notifications (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES public.profiles(id)   ON DELETE CASCADE NOT NULL,
  actor_id   uuid REFERENCES public.profiles(id)   ON DELETE CASCADE NOT NULL,
  type       text NOT NULL CHECK (type IN ('follow', 'like', 'comment')),
  checkin_id uuid REFERENCES public.checkins(id)   ON DELETE CASCADE,
  comment_id uuid REFERENCES public.comments(id)   ON DELETE CASCADE,
  read       boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications"   ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Auth users can insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = actor_id);
