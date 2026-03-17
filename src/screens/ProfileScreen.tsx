import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Checkin, Profile, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: prof }, { data: cks }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('checkins')
          .select('*, whisky:whiskies(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (prof) setProfile(prof as Profile);
      if (cks) setCheckins(cks as Checkin[]);
      setLoading(false);
    }
    load();
  }, []);

  function signOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.username}>@{profile?.username ?? 'you'}</Text>
          {profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
        </View>
        <TouchableOpacity onPress={signOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{checkins.length}</Text>
          <Text style={styles.statLabel}>Drams</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>
            {new Set(checkins.map(c => c.whisky_id)).size}
          </Text>
          <Text style={styles.statLabel}>Unique</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>
            {checkins.length
              ? (checkins.reduce((s, c) => s + c.rating, 0) / checkins.length).toFixed(1)
              : '—'}
          </Text>
          <Text style={styles.statLabel}>Avg rating</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Recent drams</Text>
      <FlatList
        data={checkins}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No check-ins yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('WhiskyDetail', { whiskyId: item.whisky_id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.whiskyName}>{item.whisky?.name ?? item.whisky_id}</Text>
              <Text style={styles.meta}>{item.whisky?.distillery} · {new Date(item.date).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.ratingText}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
  },
  username: { fontSize: 22, fontWeight: '700', color: '#f9fafb' },
  bio: { color: '#9ca3af', fontSize: 14, marginTop: 4, maxWidth: 220 },
  signOutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#374151' },
  signOutText: { color: '#9ca3af', fontSize: 13 },
  stats: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 20, gap: 24 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 24, fontWeight: '700', color: '#f9fafb' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', paddingHorizontal: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  whiskyName: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  meta: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  ratingText: { color: '#f59e0b', fontSize: 13 },
});
