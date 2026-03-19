import { supabase } from './supabase';
import { BADGE_DEFINITIONS } from '../constants/badges';

export async function checkAndAwardBadges(userId: string) {
  // Fetch all checkins for this user with whisky info
  const { data: checkins } = await supabase
    .from('checkins')
    .select('*, whisky:whiskies(type, region, country)')
    .eq('user_id', userId);

  if (!checkins) return;

  // Fetch already-earned badges
  const { data: earned } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);

  const earnedIds = new Set((earned ?? []).map(b => b.badge_id));

  // Fetch approved submission count
  const { count: submittedCount } = await supabase
    .from('whiskies')
    .select('*', { count: 'exact', head: true })
    .eq('submitted_by', userId)
    .eq('status', 'approved');

  // Compute stats
  const checkinCount = checkins.length;
  const islayCount = checkins.filter(c => c.whisky?.region === 'Islay').length;
  const bourbonCount = checkins.filter(c => c.whisky?.type === 'bourbon').length;
  const uniqueCountries = new Set(checkins.map(c => c.whisky?.country).filter(Boolean)).size;
  const uniqueRegions = new Set(checkins.map(c => c.whisky?.region).filter(Boolean)).size;

  const stats: Record<string, number> = {
    checkin_count: checkinCount,
    region_count: islayCount,
    bourbon_count: bourbonCount,
    country_count: uniqueCountries,
    region_variety: uniqueRegions,
    submitted_count: submittedCount ?? 0,
  };

  // Award any newly earned badges
  const toAward = BADGE_DEFINITIONS.filter(
    b => !earnedIds.has(b.id) && (stats[b.criteria_type] ?? 0) >= b.criteria_value
  );

  if (toAward.length === 0) return;

  await supabase.from('user_badges').insert(
    toAward.map(b => ({ user_id: userId, badge_id: b.id }))
  );

  return toAward;
}
