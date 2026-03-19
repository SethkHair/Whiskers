insert into public.badges (id, name, description, icon, criteria_type, criteria_value) values
  ('first_dram',    'First Dram',    'Log your very first whisky check-in',       '🥃', 'checkin_count',  1),
  ('ten_drams',     'Ten Drams',     'Log 10 whisky check-ins',                   '🔟', 'checkin_count',  10),
  ('fifty_drams',   'Fifty Drams',   'Log 50 whisky check-ins',                   '🏅', 'checkin_count',  50),
  ('peat_head',     'Peat Head',     'Try 5 whiskies from the Islay region',      '💨', 'region_count',   5),
  ('bourbon_trail', 'Bourbon Trail', 'Try 5 different Bourbons',                  '🌽', 'bourbon_count',  5),
  ('globe_trotter', 'Globe Trotter', 'Try whiskies from 5 different countries',   '🌍', 'country_count',  5),
  ('explorer',         'Explorer',           'Try whiskies from 3 different regions',         '🧭', 'region_variety',  3),
  ('first_drop',       'First Drop',         'Get your first whisky submission approved',      '💧', 'submitted_count', 1),
  ('nosing_around',    'Nosing Around',      'Get 5 whisky submissions approved',              '👃', 'submitted_count', 5),
  ('whisky_scout',     'Whisky Scout',       'Get 10 whisky submissions approved',             '🔍', 'submitted_count', 10),
  ('curator',          'Curator',            'Get 25 whisky submissions approved',             '📚', 'submitted_count', 25),
  ('cellar_master',    'Cellar Master',      'Get 50 whisky submissions approved',             '🗝️', 'submitted_count', 50),
  ('distillers_choice',    'Distiller''s Choice',  'Get 100 whisky submissions approved',            '🏆', 'submitted_count',    100),
  -- Logging milestones
  ('century_dram',         'Century Dram',         'Log 100 check-ins',                              '🎯', 'checkin_count',      100),
  ('quarter_master',       'Quarter Master',       'Log 250 check-ins',                              '🏅', 'checkin_count',      250),
  ('five_hundred_club',    '500 Club',             'Log 500 check-ins',                              '🔥', 'checkin_count',      500),
  -- Style explorer
  ('rye_not',              'Rye Not?',             'Try 10 rye whiskies',                            '🌾', 'rye_count',          10),
  ('rising_sun',           'Rising Sun',           'Try 5 Japanese whiskies',                        '🌸', 'japanese_count',     5),
  ('emerald_isle',         'Emerald Isle',         'Try 5 Irish whiskies',                           '☘️', 'irish_count',        5),
  ('speyside_scholar',     'Speyside Scholar',     'Try 5 Speyside whiskies',                        '🎓', 'speyside_count',     5),
  ('highland_hero',        'Highland Hero',        'Try 5 Highland whiskies',                        '🏔️', 'highlands_count',    5),
  ('malt_devotee',         'Malt Devotee',         'Try 20 single malts',                            '🥃', 'single_malt_count',  20),
  ('bourbon_connoisseur',  'Bourbon Connoisseur',  'Try 25 different bourbons',                      '🌽', 'bourbon_count',      25),
  -- Connoisseur
  ('old_faithful',         'Old Faithful',         'Try a whisky aged 18+ years',                    '⏳', 'age_18_plus',        1),
  ('ancient_one',          'Ancient One',          'Try a whisky aged 25+ years',                    '🏛️', 'age_25_plus',        1),
  ('cask_strength',        'Cask Strength',        'Try a whisky over 55% ABV',                      '💪', 'high_abv',           1),
  ('world_tour',           'World Tour',           'Try whiskies from all 8 countries',              '🌐', 'country_count',      8),
  -- Social & quality
  ('five_star_general',    'Five Star General',    'Give out 10 five-star ratings',                  '⭐', 'five_star_count',    10),
  ('critic',               'Critic',               'Write tasting notes on 20 check-ins',            '📝', 'noted_checkin_count',20),
  ('social_dram',          'Social Dram',          'Follow 10 other users',                          '👥', 'following_count',    10),
  ('crowd_favorite',       'Crowd Favorite',       'Receive 25 likes on your check-ins',             '❤️', 'likes_received',     25),
  -- Collection
  ('collector',            'Collector',            'Add 20 whiskies to your collection',             '📦', 'collection_count',   20),
  ('wish_lister',          'Wish Lister',          'Add 10 whiskies to your want list',              '🌠', 'want_count',         10),
  ('flavor_chaser',        'Flavor Chaser',        'Try whiskies covering 10 different flavor tags', '🌈', 'flavor_variety',     10)
on conflict (id) do nothing;
