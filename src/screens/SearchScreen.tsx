import { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Fuse from 'fuse.js';
import { supabase } from '../lib/supabase';
import { Whisky, Profile, WhiskyType, RootStackParamList } from '../types';
import { WHISKY_REGIONS, WHISKY_COUNTRIES } from '../constants/badges';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'whiskies' | 'people';

const WHISKY_TYPES: { value: WhiskyType; label: string }[] = [
  { value: 'single_malt', label: 'Single Malt' },
  { value: 'blended', label: 'Blended' },
  { value: 'bourbon', label: 'Bourbon' },
  { value: 'rye', label: 'Rye' },
  { value: 'irish', label: 'Irish' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'other', label: 'Other' },
];

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('whiskies');
  const [query, setQuery] = useState('');

  const [whiskies, setWhiskies] = useState<Whisky[]>([]);
  const [whiskyFuse, setWhiskyFuse] = useState<Fuse<Whisky> | null>(null);

  const [filterType, setFilterType] = useState<WhiskyType | null>(null);
  const [filterCountry, setFilterCountry] = useState<string | null>(null);
  const [filterRegion, setFilterRegion] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [people, setPeople] = useState<Profile[]>([]);
  const [peopleFuse, setPeopleFuse] = useState<Fuse<Profile> | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('whiskies').select('*').eq('status', 'approved').order('name'),
      supabase.from('profiles').select('*').order('username'),
    ]).then(([{ data: w }, { data: p }]) => {
      if (w) {
        setWhiskies(w as Whisky[]);
        setWhiskyFuse(new Fuse(w as Whisky[], { keys: ['name', 'distillery', 'region', 'country'], threshold: 0.35 }));
      }
      if (p) {
        setPeople(p as Profile[]);
        setPeopleFuse(new Fuse(p as Profile[], { keys: ['username', 'bio'], threshold: 0.35 }));
      }
      setLoading(false);
    });
  }, []);

  const displayedWhiskies = useMemo(() => {
    let results = query.trim()
      ? (whiskyFuse ? whiskyFuse.search(query).map(r => r.item) : whiskies)
      : whiskies;
    if (filterType) results = results.filter(w => w.type === filterType);
    if (filterCountry) results = results.filter(w => w.country === filterCountry);
    if (filterRegion) results = results.filter(w => w.region === filterRegion);
    return results;
  }, [query, whiskies, whiskyFuse, filterType, filterCountry, filterRegion]);

  const displayedPeople = useMemo(() => {
    if (!query.trim()) return people;
    return peopleFuse ? peopleFuse.search(query).map(r => r.item) : people;
  }, [query, people, peopleFuse]);

  const activeFilterCount = [filterType, filterCountry, filterRegion].filter(Boolean).length;

  function clearFilters() {
    setFilterType(null);
    setFilterCountry(null);
    setFilterRegion(null);
  }

  function switchTab(t: Tab) {
    setTab(t);
    setQuery('');
    clearFilters();
    setShowFilters(false);
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

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder={tab === 'whiskies' ? 'Whisky, distillery, region...' : 'Search by username...'}
          placeholderTextColor="#6b7280"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
        {tab === 'whiskies' && (
          <TouchableOpacity
            style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Text style={[styles.filterBtnText, activeFilterCount > 0 && styles.filterBtnTextActive]}>
              {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filter'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {tab === 'whiskies' && showFilters && (
        <View style={styles.filterPanel}>
          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {WHISKY_TYPES.map(t => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, filterType === t.value && styles.chipActive]}
                  onPress={() => setFilterType(filterType === t.value ? null : t.value)}
                >
                  <Text style={[styles.chipText, filterType === t.value && styles.chipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Country</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {WHISKY_COUNTRIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, filterCountry === c && styles.chipActive]}
                  onPress={() => setFilterCountry(filterCountry === c ? null : c)}
                >
                  <Text style={[styles.chipText, filterCountry === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterRow}>
            <Text style={styles.filterLabel}>Region</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {WHISKY_REGIONS.map(r => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, filterRegion === r && styles.chipActive]}
                  onPress={() => setFilterRegion(filterRegion === r ? null : r)}
                >
                  <Text style={[styles.chipText, filterRegion === r && styles.chipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {activeFilterCount > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
              <Text style={styles.clearBtnText}>Clear all filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#b45309" /></View>
      ) : tab === 'whiskies' ? (
        <FlatList
          data={displayedWhiskies}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No whiskies found</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('WhiskyDetail', { whiskyId: item.id })}
            >
              <View style={styles.rowMain}>
                <Text style={styles.name}>{item.name}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Distillery', {
                  distillery: item.distillery,
                  distilleryId: item.distillery_id ?? undefined,
                })}>
                  <Text style={styles.meta}>{item.distillery} · {item.country}</Text>
                </TouchableOpacity>
                {item.region ? <Text style={styles.region}>{item.region}</Text> : null}
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.type.replace('_', ' ')}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={displayedPeople}
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
                {item.bio ? <Text style={styles.meta}>{item.bio}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      )}

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
  searchRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  filterBtn: { justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#374151', backgroundColor: '#1f2937' },
  filterBtnActive: { borderColor: '#b45309' },
  filterBtnText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  filterBtnTextActive: { color: '#b45309' },
  filterPanel: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1f2937', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#374151' },
  filterRow: { marginBottom: 10 },
  filterLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  chipRow: { gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: '#374151', backgroundColor: '#111827' },
  chipActive: { backgroundColor: '#b45309', borderColor: '#b45309' },
  chipText: { color: '#9ca3af', fontSize: 12 },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  clearBtn: { marginTop: 4, alignItems: 'center' },
  clearBtnText: { color: '#b45309', fontSize: 13, fontWeight: '600' },
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
