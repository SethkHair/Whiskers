import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Whisky, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type TabMode = 'pending' | 'approved';

export default function AdminApprovalScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<TabMode>('pending');
  const [whiskies, setWhiskies] = useState<Whisky[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load(mode: TabMode) {
    setLoading(true);
    const { data } = await supabase
      .from('whiskies')
      .select('*')
      .eq('status', mode)
      .order('created_at', { ascending: mode === 'pending' });
    if (data) setWhiskies(data as Whisky[]);
    setLoading(false);
  }

  useEffect(() => { load(tab); }, [tab]);

  async function approve(id: string) {
    setActing(id);
    await supabase.from('whiskies').update({ status: 'approved' }).eq('id', id);
    setWhiskies(w => w.filter(x => x.id !== id));
    setActing(null);
  }

  async function confirmReject(id: string) {
    setActing(id);
    await supabase.from('whiskies').delete().eq('id', id);
    setWhiskies(w => w.filter(x => x.id !== id));
    setActing(null);
    setConfirmDelete(null);
  }

  return (
    <View style={styles.container}>
      {/* Tab toggle */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'pending' && styles.tabBtnActive]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>Pending</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'approved' && styles.tabBtnActive]}
          onPress={() => setTab('approved')}
        >
          <Text style={[styles.tabText, tab === 'approved' && styles.tabTextActive]}>Approved</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>
      ) : (
        <FlatList
          data={whiskies}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {tab === 'pending' ? 'No pending submissions 🎉' : 'No approved whiskies yet.'}
            </Text>
          }
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

              {tab === 'pending' ? (
                confirmDelete === item.id ? (
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmText}>Delete this submission?</Text>
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => setConfirmDelete(null)}>
                        <Text style={styles.rejectBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmReject(item.id)} disabled={acting === item.id}>
                        {acting === item.id
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={styles.deleteBtnText}>Delete</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => approve(item.id)} disabled={acting === item.id}>
                      {acting === item.id
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={styles.approveBtnText}>✓ Approve</Text>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => setConfirmDelete(item.id)}>
                      <Text style={styles.rejectBtnText}>✕ Reject</Text>
                    </TouchableOpacity>
                  </View>
                )
              ) : (
                confirmDelete === item.id ? (
                  <View style={styles.confirmRow}>
                    <Text style={styles.confirmText}>Delete this whisky? This cannot be undone.</Text>
                    <View style={styles.actions}>
                      <TouchableOpacity style={styles.rejectBtn} onPress={() => setConfirmDelete(null)}>
                        <Text style={styles.rejectBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmReject(item.id)} disabled={acting === item.id}>
                        {acting === item.id
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={styles.deleteBtnText}>Delete</Text>
                        }
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('EditWhisky', { whiskyId: item.id })}>
                      <Text style={styles.editBtnText}>✎ Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => setConfirmDelete(item.id)}>
                      <Text style={styles.rejectBtnText}>✕ Delete</Text>
                    </TouchableOpacity>
                  </View>
                )
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', margin: 12, backgroundColor: '#1f2937', borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#b45309' },
  tabText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff' },
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
  editBtn: { flex: 1, backgroundColor: '#374151', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  editBtnText: { color: '#f9fafb', fontWeight: '700', fontSize: 14 },
  rejectBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  rejectBtnText: { color: '#9ca3af', fontWeight: '600', fontSize: 14 },
  confirmRow: { marginTop: 4 },
  confirmText: { color: '#f87171', fontSize: 13, marginBottom: 8 },
  deleteBtn: { flex: 1, backgroundColor: '#dc2626', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
