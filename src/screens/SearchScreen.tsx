import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Fuse from 'fuse.js';
import { supabase } from '../lib/supabase';
import { Whisky, Profile, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'whiskies' | 'people';

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('whiskies');
  const [query, setQuery] = useState('');

  // Whiskies
  const [whiskies, setWhiskies] = useState<Whisky[]>([]);
  const [whiskyResults, setWhiskyResults] = useState<Whisky[]>([]);
  const [whiskyFuse, setWhiskyFuse] = useState<Fuse<Whisky> | null>(null);

  // People
  const [people, setPeople] = useState<Profile[]>([]);
  const [peopleResults, setPeopleResults] = useState<Profile[]>([]);
  const [peopleFuse, setPeopleFuse] = useState<Fuse<Profile> | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('whiskies').select('*').eq('status', 'approved').order('name'),
      supabase.from('profiles').select('*').order('username'),
    ]).then(([{ data: w }, { data: p }]) => {
      if (w) {
        setWhiskies(w as Whisky[]);
        setWhiskyResults(w as Whisky[]);
        setWhiskyFuse(new Fuse(w as Whisky[], { keys: ['name', 'distillery', 'region', 'country'], threshold: 0.35 }));
      }
      if (p) {
        setPeople(p as Profile[]);
        setPeopleResults(p as Profile[]);
        setPeopleFuse(new Fuse(p as Profile[], { keys: ['username', 'bio'], threshold: 0.35 }));
      }
      setLoading(false);
    });
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (!text.trim()) {
      setWhiskyResults(whiskies);
      setPeopleResults(people);
    } else {
      if (whiskyFuse) setWhiskyResults(whiskyFuse.search(text).map(r => r.item));
      if (peopleFuse) setPeopleResults(peopleFuse.search(text).map(r => r.item));
    }
  }, [whiskyFuse, peopleFuse, whiskies, people]);

  function switchTab(t: Tab) {
    setTab(t);
    setQuery('');
    setWhiskyResults(whiskies);
    setPeopleResults(people);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Search</Text>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'whiskies' && styles.tabBtnActive]} onPress={() => switchTab('whiskies')}>
          <Text style={[styles.tabText, tab === 'whiskies' && styles.tabTextActive]}>Whiskies</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'people' && styles.tabBtnActive]} onPress={() => switchTab('people')}>
          <Text style={[styles.tabText, tab === 'people' && styles.tabTextActive]}>People</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder={tab === 'whiskies' ? 'Whisky, distillery, region...' : 'Search by username...'}
          placeholderTextColor="#6b7280"
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
      </View>

      {loading
        ? <View style={styles.center}><ActivityIndicator color="#b45309" /></View>
        : tab === 'whiskies'
          ? (
            <FlatList
              data={whiskyResults}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.empty}>No whiskies found</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => navigation.navigate('WhiskyDetail', { whiskyId: item.id })}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.name}>{item.name}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Distillery', { distillery: item.distillery })}>
                      <Text style={styles.meta}>{item.distillery} · {item.country}</Text>
                    </TouchableOpacity>
                    {item.region && <Text style={styles.region}>{item.region}</Text>}
                  </View>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.type.replace('_', ' ')}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          )
          : (
            <FlatList
              data={peopleResults}
              keyExtractor={item => item.id}
              ListEmptyComponent={<Text style={styles.empty}>No users found</Text>}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.username[0].toUpperCase()}</Text>
                  </View>
                  <View style={styles.rowMain}>
                    <Text style={styles.name}>@{item.username}</Text>
                    {item.bio && <Text style={styles.meta}>{item.bio}</Text>}
                  </View>
                </TouchableOpacity>
              )}
            />
          )
      }

      {tab === 'whiskies' && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('SubmitWhisky')}>
          <Text style={styles.fabText}>+ Submit</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 24, fontWeight: '700', color: '#f9fafb', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1f2937', borderRadius: 10, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#b45309' },
  tabText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  searchBar: { paddingHorizontal: 16, marginBottom: 8 },
  input: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 60 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  rowMain: { flex: 1 },
  name: { color: '#f9fafb', fontSize: 16, fontWeight: '600' },
  meta: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  region: { color: '#6b7280', fontSize: 12, marginTop: 1 },
  badge: { backgroundColor: '#1f2937', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#374151' },
  badgeText: { color: '#b45309', fontSize: 11, textTransform: 'capitalize' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#f9fafb', fontWeight: '700', fontSize: 16 },
  fab: { position: 'absolute', bottom: 90, right: 24, backgroundColor: '#b45309', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12 },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
