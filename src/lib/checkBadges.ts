import { supabase } from './supabase';
import { BADGE_DEFINITIONS } from '../constants/badges';

export async function checkAndAwardBadges(userId: string) {
  const [
    { data: checkins },
    { data: earned },
    { count: submittedCount },
    { count: followingCount },
    { data: likesData },
    { data: collection },
  ] = await Promise.all([
    supabase
      .from('checkins')
      .select('rating, overall_notes, whisky:whiskies(type, region, country, age_statement, abv, flavor_tags)')
      .eq('user_id', userId),
    supabase.from('user_badges').select('badge_id').eq('user_id', userId),
    supabase.from('whiskies').select('*', { count: 'exact', head: true }).eq('submitted_by', userId).eq('status', 'approved'),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
    supabase.from('likes').select('checkin_id, checkins!inner(user_id)').eq('checkins.user_id', userId),
    supabase.from('collection').select('status').eq('user_id', userId),
  ]);

  if (!checkins) return;

  const earnedIds = new Set((earned ?? []).map((b: any) => b.badge_id));
  const whiskies = checkins.map((c: any) => c.whisky).filter(Boolean);

  const flavorTagSet = new Set<string>();
  for (const w of whiskies) {
    for (const tag of (w.flavor_tags ?? [])) flavorTagSet.add(tag);
  }

  const stats: Record<string, number> = {
    checkin_count:      checkins.length,
    region_count:       whiskies.filter((w: any) => w.region === 'Islay').length,
    bourbon_count:      whiskies.filter((w: any) => w.type === 'bourbon').length,
    country_count:      new Set(whiskies.map((w: any) => w.country).filter(Boolean)).size,
    region_variety:     new Set(whiskies.map((w: any) => w.region).filter(Boolean)).size,
    submitted_count:    submittedCount ?? 0,
    rye_count:          whiskies.filter((w: any) => w.type === 'rye').length,
    japanese_count:     whiskies.filter((w: any) => w.type === 'japanese').length,
    irish_count:        whiskies.filter((w: any) => w.type === 'irish').length,
    speyside_count:     whiskies.filter((w: any) => w.region === 'Speyside').length,
    highlands_count:    whiskies.filter((w: any) => w.region === 'Highlands').length,
    single_malt_count:  whiskies.filter((w: any) => w.type === 'single_malt').length,
    age_18_plus:        whiskies.some((w: any) => w.age_statement >= 18) ? 1 : 0,
    age_25_plus:        whiskies.some((w: any) => w.age_statement >= 25) ? 1 : 0,
    high_abv:           whiskies.some((w: any) => w.abv >= 55) ? 1 : 0,
    five_star_count:    checkins.filter((c: any) => c.rating === 5).length,
    noted_checkin_count: checkins.filter((c: any) => c.overall_notes?.trim()).length,
    following_count:    followingCount ?? 0,
    likes_received:     (likesData ?? []).length,
    collection_count:   (collection ?? []).length,
    want_count:         (collection ?? []).filter((c: any) => c.status === 'want').length,
    flavor_variety:     flavorTagSet.size,
  };

  const toAward = BADGE_DEFINITIONS.filter(
    b => !earnedIds.has(b.id) && (stats[b.criteria_type] ?? 0) >= b.criteria_value
  );

  if (toAward.length === 0) return;

  await supabase.from('user_badges').insert(
    toAward.map(b => ({ user_id: userId, badge_id: b.id }))
  );

  return toAward;
}
