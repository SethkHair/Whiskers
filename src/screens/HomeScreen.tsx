import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Checkin, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RATING_LABELS: Record<number, string> = {
  1: '★☆☆☆☆', 2: '★★☆☆☆', 3: '★★★☆☆', 4: '★★★★☆', 5: '★★★★★',
};

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchCheckins() {
    const { data } = await supabase
      .from('checkins')
      .select('*, whisky:whiskies(*), profile:profiles(*)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setCheckins(data as Checkin[]);
  }

  useEffect(() => {
    fetchCheckins().finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await fetchCheckins();
    setRefreshing(false);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Activity</Text>
      <FlatList
        data={checkins}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b45309" />}
        ListEmptyComponent={<Text style={styles.empty}>No check-ins yet. Be the first!</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => item.whisky && navigation.navigate('WhiskyDetail', { whiskyId: item.whisky_id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.username}>@{item.profile?.username ?? 'unknown'}</Text>
              <Text style={styles.rating}>{RATING_LABELS[item.rating] ?? item.rating}</Text>
            </View>
            <Text style={styles.whiskyName}>{item.whisky?.name ?? item.whisky_id}</Text>
            {item.whisky && (
              <Text style={styles.distillery}>{item.whisky.distillery} · {item.whisky.country}</Text>
            )}
            {item.overall_notes && <Text style={styles.notes}>{item.overall_notes}</Text>}
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  header: { fontSize: 24, fontWeight: '700', color: '#f9fafb', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 60, fontSize: 15 },
  card: {
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  username: { color: '#b45309', fontWeight: '600', fontSize: 14 },
  rating: { color: '#f59e0b', fontSize: 13 },
  whiskyName: { color: '#f9fafb', fontSize: 17, fontWeight: '600', marginBottom: 2 },
  distillery: { color: '#9ca3af', fontSize: 13, marginBottom: 6 },
  notes: { color: '#d1d5db', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  date: { color: '#6b7280', fontSize: 12 },
});
