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
import { Whisky, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SearchScreen() {
  const navigation = useNavigation<Nav>();
  const [query, setQuery] = useState('');
  const [whiskies, setWhiskies] = useState<Whisky[]>([]);
  const [results, setResults] = useState<Whisky[]>([]);
  const [loading, setLoading] = useState(true);
  const [fuse, setFuse] = useState<Fuse<Whisky> | null>(null);

  useEffect(() => {
    supabase
      .from('whiskies')
      .select('*')
      .eq('status', 'approved')
      .order('name')
      .then(({ data }) => {
        if (data) {
          setWhiskies(data as Whisky[]);
          setResults(data as Whisky[]);
          setFuse(new Fuse(data as Whisky[], {
            keys: ['name', 'distillery', 'region', 'country'],
            threshold: 0.35,
          }));
        }
        setLoading(false);
      });
  }, []);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (!text.trim() || !fuse) {
      setResults(whiskies);
    } else {
      setResults(fuse.search(text).map(r => r.item));
    }
  }, [fuse, whiskies]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Search</Text>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Whisky, distillery, region..."
          placeholderTextColor="#6b7280"
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
        />
      </View>

      {loading
        ? <View style={styles.center}><ActivityIndicator color="#b45309" /></View>
        : (
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            ListEmptyComponent={<Text style={styles.empty}>No whiskies found</Text>}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.row}
                onPress={() => navigation.navigate('WhiskyDetail', { whiskyId: item.id })}
              >
                <View style={styles.rowMain}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{item.distillery} · {item.country}</Text>
                  {item.region && <Text style={styles.region}>{item.region}</Text>}
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.type.replace('_', ' ')}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )
      }

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('SubmitWhisky')}
      >
        <Text style={styles.fabText}>+ Submit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { fontSize: 24, fontWeight: '700', color: '#f9fafb', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  rowMain: { flex: 1 },
  name: { color: '#f9fafb', fontSize: 16, fontWeight: '600' },
  meta: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  region: { color: '#6b7280', fontSize: 12, marginTop: 1 },
  badge: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#374151',
  },
  badgeText: { color: '#b45309', fontSize: 11, textTransform: 'capitalize' },
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    backgroundColor: '#b45309',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  fabText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
