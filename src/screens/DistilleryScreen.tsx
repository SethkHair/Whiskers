import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Whisky, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Distillery'>;

export default function DistilleryScreen({ route, navigation }: Props) {
  const { distillery } = route.params;
  const [whiskies, setWhiskies] = useState<Whisky[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('whiskies')
      .select('*')
      .eq('distillery', distillery)
      .eq('status', 'approved')
      .order('age_statement', { ascending: true, nullsFirst: false })
      .then(({ data }) => {
        if (data) setWhiskies(data as Whisky[]);
        setLoading(false);
      });
  }, [distillery]);

  const country = whiskies[0]?.country;
  const region = whiskies[0]?.region;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{distillery}</Text>
        <Text style={styles.location}>
          {[region, country].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.count}>{whiskies.length} expression{whiskies.length !== 1 ? 's' : ''}</Text>
      </View>

      <FlatList
        data={whiskies}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No approved whiskies yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('WhiskyDetail', { whiskyId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.whiskyName}>{item.name}</Text>
              <View style={styles.tags}>
                <Text style={styles.tag}>{item.type.replace('_', ' ')}</Text>
                {item.age_statement && <Text style={styles.tag}>{item.age_statement} yr</Text>}
                {item.abv && <Text style={styles.tag}>{item.abv}% ABV</Text>}
              </View>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  header: { padding: 20, paddingTop: 24, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  name: { fontSize: 26, fontWeight: '700', color: '#f9fafb', marginBottom: 4 },
  location: { fontSize: 15, color: '#9ca3af', marginBottom: 6 },
  count: { fontSize: 13, color: '#6b7280' },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 60 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  whiskyName: { color: '#f9fafb', fontSize: 16, fontWeight: '600', marginBottom: 6 },
  tags: { flexDirection: 'row', gap: 6 },
  tag: {
    color: '#b45309',
    fontSize: 12,
    backgroundColor: '#1f2937',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#374151',
    textTransform: 'capitalize',
  },
  chevron: { color: '#4b5563', fontSize: 22, marginLeft: 8 },
});
