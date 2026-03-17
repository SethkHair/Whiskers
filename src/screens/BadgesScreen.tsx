import { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabase';
import { BADGE_DEFINITIONS } from '../constants/badges';
import { UserBadge } from '../types';

export default function BadgesScreen() {
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('user_badges')
        .select('badge_id')
        .eq('user_id', user.id);

      if (data) setEarned(new Set((data as Pick<UserBadge, 'badge_id'>[]).map(b => b.badge_id)));
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
          return (
            <View style={[styles.card, !isEarned && styles.cardLocked]}>
              <Text style={[styles.icon, !isEarned && styles.iconLocked]}>{item.icon}</Text>
              <Text style={[styles.name, !isEarned && styles.textLocked]}>{item.name}</Text>
              <Text style={[styles.desc, !isEarned && styles.textLocked]}>{item.description}</Text>
              {isEarned && <Text style={styles.earnedBadge}>Earned</Text>}
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
  cardLocked: { borderColor: '#374151', opacity: 0.5 },
  icon: { fontSize: 36, marginBottom: 8 },
  iconLocked: { opacity: 0.4 },
  name: { color: '#f9fafb', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  desc: { color: '#9ca3af', fontSize: 12, textAlign: 'center', lineHeight: 16 },
  textLocked: { color: '#6b7280' },
  earnedBadge: { marginTop: 8, color: '#b45309', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
});
