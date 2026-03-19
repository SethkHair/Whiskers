import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { BADGE_DEFINITIONS } from '../constants/badges';
import { UserBadge } from '../types';

type Stats = Record<string, number>;

function getProgress(badge: typeof BADGE_DEFINITIONS[number], stats: Stats): number {
  return stats[badge.criteria_type] ?? 0;
}

export default function BadgesScreen() {
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [
        { data: badgeRows },
        { data: checkinRows },
        { count: submittedCount },
        { count: followingCount },
        { data: likesData },
        { data: collection },
      ] = await Promise.all([
        supabase.from('user_badges').select('badge_id').eq('user_id', user.id),
        supabase.from('checkins').select('rating, overall_notes, whisky:whiskies(type, region, country, age_statement, abv, flavor_tags)').eq('user_id', user.id),
        supabase.from('whiskies').select('*', { count: 'exact', head: true }).eq('submitted_by', user.id).eq('status', 'approved'),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('likes').select('checkin_id, checkins!inner(user_id)').eq('checkins.user_id', user.id),
        supabase.from('collection').select('status').eq('user_id', user.id),
      ]);

      if (badgeRows) setEarned(new Set((badgeRows as Pick<UserBadge, 'badge_id'>[]).map(b => b.badge_id)));

      if (checkinRows) {
        const whiskies = checkinRows.map((c: any) => c.whisky).filter(Boolean);
        const flavorTagSet = new Set<string>();
        for (const w of whiskies) for (const t of (w.flavor_tags ?? [])) flavorTagSet.add(t);

        setStats({
          checkin_count:       checkinRows.length,
          region_count:        whiskies.filter((w: any) => w.region === 'Islay').length,
          bourbon_count:       whiskies.filter((w: any) => w.type === 'bourbon').length,
          country_count:       new Set(whiskies.map((w: any) => w.country).filter(Boolean)).size,
          region_variety:      new Set(whiskies.map((w: any) => w.region).filter(Boolean)).size,
          submitted_count:     submittedCount ?? 0,
          rye_count:           whiskies.filter((w: any) => w.type === 'rye').length,
          japanese_count:      whiskies.filter((w: any) => w.type === 'japanese').length,
          irish_count:         whiskies.filter((w: any) => w.type === 'irish').length,
          speyside_count:      whiskies.filter((w: any) => w.region === 'Speyside').length,
          highlands_count:     whiskies.filter((w: any) => w.region === 'Highlands').length,
          single_malt_count:   whiskies.filter((w: any) => w.type === 'single_malt').length,
          age_18_plus:         whiskies.some((w: any) => w.age_statement >= 18) ? 1 : 0,
          age_25_plus:         whiskies.some((w: any) => w.age_statement >= 25) ? 1 : 0,
          high_abv:            whiskies.some((w: any) => w.abv >= 55) ? 1 : 0,
          five_star_count:     checkinRows.filter((c: any) => c.rating === 5).length,
          noted_checkin_count: checkinRows.filter((c: any) => c.overall_notes?.trim()).length,
          following_count:     followingCount ?? 0,
          likes_received:      (likesData ?? []).length,
          collection_count:    (collection ?? []).length,
          want_count:          (collection ?? []).filter((c: any) => c.status === 'want').length,
          flavor_variety:      flavorTagSet.size,
        });
      }

      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Badges</Text>
      <Text style={styles.sub}>{earned.size} of {BADGE_DEFINITIONS.length} earned</Text>
      <FlatList
        data={BADGE_DEFINITIONS}
        keyExtractor={item => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => {
          const isEarned = earned.has(item.id);
          const progress = getProgress(item, stats);
          const pct = Math.min(progress / item.criteria_value, 1);

          return (
            <View style={[styles.card, !isEarned && styles.cardLocked]}>
              <Text style={[styles.icon, !isEarned && styles.iconLocked]}>{item.icon}</Text>
              <Text style={[styles.name, !isEarned && styles.textLocked]}>{item.name}</Text>
              <Text style={[styles.desc, !isEarned && styles.textLocked]}>{item.description}</Text>
              {isEarned ? (
                <Text style={styles.earnedBadge}>Earned ✓</Text>
              ) : (
                <View style={styles.progressWrap}>
                  <View style={styles.progressTrack}>
                    <View style={[styles.progressFill, { width: `${pct * 100}%` as any }]} />
                  </View>
                  <Text style={styles.progressLabel}>{progress}/{item.criteria_value}</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  header: { fontSize: 24, fontWeight: '700', color: '#f9fafb', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 4 },
  sub: { color: '#6b7280', fontSize: 14, paddingHorizontal: 16, paddingBottom: 16 },
  row: { paddingHorizontal: 12, gap: 12, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#b45309',
  },
  cardLocked: { borderColor: '#374151' },
  icon: { fontSize: 36, marginBottom: 8 },
  iconLocked: { opacity: 0.4 },
  name: { color: '#f9fafb', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  desc: { color: '#9ca3af', fontSize: 12, textAlign: 'center', lineHeight: 16, marginBottom: 8 },
  textLocked: { color: '#6b7280' },
  earnedBadge: { marginTop: 4, color: '#b45309', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  progressWrap: { width: '100%', alignItems: 'center', gap: 4 },
  progressTrack: { width: '100%', height: 4, backgroundColor: '#374151', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#b45309', borderRadius: 2 },
  progressLabel: { color: '#6b7280', fontSize: 11 },
});
