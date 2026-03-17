insert into public.badges (id, name, description, icon, criteria_type, criteria_value) values
  ('first_dram',    'First Dram',    'Log your very first whisky check-in',       '🥃', 'checkin_count',  1),
  ('ten_drams',     'Ten Drams',     'Log 10 whisky check-ins',                   '🔟', 'checkin_count',  10),
  ('fifty_drams',   'Fifty Drams',   'Log 50 whisky check-ins',                   '🏅', 'checkin_count',  50),
  ('peat_head',     'Peat Head',     'Try 5 whiskies from the Islay region',      '💨', 'region_count',   5),
  ('bourbon_trail', 'Bourbon Trail', 'Try 5 different Bourbons',                  '🌽', 'bourbon_count',  5),
  ('globe_trotter', 'Globe Trotter', 'Try whiskies from 5 different countries',   '🌍', 'country_count',  5),
  ('explorer',      'Explorer',      'Try whiskies from 3 different regions',     '🧭', 'region_variety', 3)
on conflict (id) do nothing;
