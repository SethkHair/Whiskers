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
import { supabase } from '../lib/supabase';
import { Whisky } from '../types';

export default function AdminApprovalScreen() {
  const [whiskies, setWhiskies] = useState<Whisky[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase
      .from('whiskies')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (data) setWhiskies(data as Whisky[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    setActing(id);
    await supabase.from('whiskies').update({ status: 'approved' }).eq('id', id);
    setWhiskies(w => w.filter(x => x.id !== id));
    setActing(null);
  }

  async function reject(id: string, name: string) {
    Alert.alert(`Reject "${name}"?`, 'This will permanently delete the submission.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setActing(id);
          await supabase.from('whiskies').delete().eq('id', id);
          setWhiskies(w => w.filter(x => x.id !== id));
          setActing(null);
        },
      },
    ]);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={whiskies}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No pending submissions 🎉</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>{item.distillery} · {item.country}</Text>
            <View style={styles.tags}>
              <Text style={styles.tag}>{item.type.replace('_', ' ')}</Text>
              {item.region && <Text style={styles.tag}>{item.region}</Text>}
              {item.age_statement && <Text style={styles.tag}>{item.age_statement} yr</Text>}
              {item.abv && <Text style={styles.tag}>{item.abv}% ABV</Text>}
            </View>
            {item.description && <Text style={styles.description}>{item.description}</Text>}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => approve(item.id)}
                disabled={acting === item.id}
              >
                {acting === item.id
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.approveBtnText}>✓ Approve</Text>
                }
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => reject(item.id, item.name)}
                disabled={acting === item.id}
              >
                <Text style={styles.rejectBtnText}>✕ Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 60, fontSize: 15 },
  card: { backgroundColor: '#1f2937', margin: 12, marginBottom: 0, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#374151' },
  name: { color: '#f9fafb', fontSize: 17, fontWeight: '700', marginBottom: 3 },
  meta: { color: '#9ca3af', fontSize: 13, marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: { color: '#b45309', fontSize: 11, backgroundColor: '#111827', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#374151', textTransform: 'capitalize' },
  description: { color: '#d1d5db', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  approveBtn: { flex: 1, backgroundColor: '#b45309', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  approveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  rejectBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  rejectBtnText: { color: '#9ca3af', fontWeight: '600', fontSize: 14 },
});
