import { useEffect, useState, useMemo } from 'react';
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

export default function QuickLogScreen() {
  const navigation = useNavigation<Nav>();
  const [whiskies, setWhiskies] = useState<Whisky[]>([]);
  const [fuse, setFuse] = useState<Fuse<Whisky> | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('whiskies').select('*').eq('status', 'approved').order('name').then(({ data }) => {
      if (data) {
        setWhiskies(data as Whisky[]);
        setFuse(new Fuse(data as Whisky[], { keys: ['name', 'distillery'], threshold: 0.35 }));
      }
      setLoading(false);
    });
  }, []);

  const results = useMemo(() => {
    if (!query.trim() || !fuse) return whiskies.slice(0, 30);
    return fuse.search(query.trim()).map(r => r.item);
  }, [query, fuse, whiskies]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        value={query}
        onChangeText={setQuery}
        placeholder="Search whiskies…"
        placeholderTextColor="#6b7280"
        autoFocus
        clearButtonMode="while-editing"
      />
      {loading ? (
        <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.empty}>No whiskies found.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.replace('LogDram', { whiskyId: item.id, whiskyName: item.name })}
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.distillery} · {item.type.replace('_', ' ')}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  search: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 40, fontSize: 15 },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  name: { color: '#f9fafb', fontSize: 16, fontWeight: '600' },
  meta: { color: '#9ca3af', fontSize: 13, marginTop: 2, textTransform: 'capitalize' },
});
