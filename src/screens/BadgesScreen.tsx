import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { BADGE_DEFINITIONS } from '../constants/badges';
import { UserBadge } from '../types';

type Stats = {
  checkin_count: number;
  region_count: number;   // Islay count
  bourbon_count: number;
  country_count: number;
  region_variety: number;
};

function getProgress(badge: typeof BADGE_DEFINITIONS[number], stats: Stats): number {
  switch (badge.criteria_type) {
    case 'checkin_count':  return stats.checkin_count;
    case 'region_count':   return stats.region_count;
    case 'bourbon_count':  return stats.bourbon_count;
    case 'country_count':  return stats.country_count;
    case 'region_variety': return stats.region_variety;
    default: return 0;
  }
}

export default function BadgesScreen() {
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<Stats>({ checkin_count: 0, region_count: 0, bourbon_count: 0, country_count: 0, region_variety: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const [{ data: badgeRows }, { data: checkinRows }] = await Promise.all([
        supabase.from('user_badges').select('badge_id').eq('user_id', user.id),
        supabase.from('checkins').select('whisky:whiskies(type, region, country)').eq('user_id', user.id),
      ]);

      if (badgeRows) setEarned(new Set((badgeRows as Pick<UserBadge, 'badge_id'>[]).map(b => b.badge_id)));

      if (checkinRows) {
        const whiskies = checkinRows.map((c: any) => c.whisky).filter(Boolean);
        const islayCount = whiskies.filter((w: any) => w.region === 'Islay').length;
        const bourbonCount = whiskies.filter((w: any) => w.type === 'bourbon').length;
        const countries = new Set(whiskies.map((w: any) => w.country).filter(Boolean));
        const regions = new Set(whiskies.map((w: any) => w.region).filter(Boolean));
        setStats({
          checkin_count: checkinRows.length,
          region_count: islayCount,
          bourbon_count: bourbonCount,
          country_count: countries.size,
          region_variety: regions.size,
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
