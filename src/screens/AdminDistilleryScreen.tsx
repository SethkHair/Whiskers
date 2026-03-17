import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Distillery, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function AdminDistilleryScreen() {
  const navigation = useNavigation<Nav>();
  const [distilleries, setDistilleries] = useState<Distillery[]>([]);
  const [parentNames, setParentNames] = useState<Record<string, string>>({});
  const [whiskyCountMap, setWhiskyCountMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data } = await supabase
      .from('distilleries')
      .select('*')
      .order('name');

    const rows = (data ?? []) as Distillery[];
    setDistilleries(rows);

    // Build parent name map
    const nameMap: Record<string, string> = {};
    for (const d of rows) {
      if (d.parent_id) {
        const par = rows.find(r => r.id === d.parent_id);
        if (par) nameMap[d.id] = par.name;
      }
    }
    setParentNames(nameMap);

    // Fetch whisky counts per distillery
    const { data: countData } = await supabase
      .from('whiskies')
      .select('distillery_id')
      .not('distillery_id', 'is', null);

    const countMap: Record<string, number> = {};
    for (const w of (countData ?? [])) {
      if (w.distillery_id) {
        countMap[w.distillery_id] = (countMap[w.distillery_id] ?? 0) + 1;
      }
    }
    setWhiskyCountMap(countMap);

    setLoading(false);
    setRefreshing(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await load();
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;

  // Separate top-level from subsidiaries
  const topLevel = distilleries.filter(d => !d.parent_id);
  const subsidiaries = distilleries.filter(d => !!d.parent_id);

  return (
    <View style={styles.container}>
      <FlatList
        data={distilleries}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b45309" />}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>No distilleries yet.</Text>
            <Text style={styles.emptySub}>Create one to start building profiles.</Text>
          </View>
        )}
        ListHeaderComponent={(
          <View style={styles.listHeader}>
            <Text style={styles.count}>{distilleries.length} distilleries · {subsidiaries.length} subsidiaries</Text>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => navigation.navigate('EditDistillery', {})}
            >
              <Text style={styles.addBtnText}>+ New</Text>
            </TouchableOpacity>
          </View>
        )}
        renderItem={({ item }) => {
          const parentName = parentNames[item.id];
          const whiskyCount = whiskyCountMap[item.id] ?? 0;
          const isParent = distilleries.some(d => d.parent_id === item.id);

          return (
            <TouchableOpacity
              style={[styles.row, !!item.parent_id && styles.rowSubsidiary]}
              onPress={() => navigation.navigate('EditDistillery', { distilleryId: item.id })}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.rowTop}>
                  {!!item.parent_id && <Text style={styles.indent}>↳ </Text>}
                  <Text style={styles.name}>{item.name}</Text>
                  {isParent && <Text style={styles.umbrellaTag}>umbrella</Text>}
                </View>
                <Text style={styles.meta}>
                  {[
                    parentName ? `Part of ${parentName}` : null,
                    item.country,
                    item.region,
                    item.founded_year ? `Est. ${item.founded_year}` : null,
                  ].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <View style={styles.rowRight}>
                {whiskyCount > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{whiskyCount}</Text>
                  </View>
                )}
                <Text style={styles.chevron}>›</Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  count: { color: '#6b7280', fontSize: 13 },
  addBtn: { backgroundColor: '#b45309', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  emptyWrap: { paddingTop: 60, alignItems: 'center' },
  empty: { color: '#9ca3af', fontSize: 16, marginBottom: 6 },
  emptySub: { color: '#6b7280', fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  rowSubsidiary: { paddingLeft: 28 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  indent: { color: '#6b7280', fontSize: 14 },
  name: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  umbrellaTag: {
    backgroundColor: '#374151',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: 10,
    color: '#9ca3af',
  },
  meta: { color: '#6b7280', fontSize: 12 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countBadge: { backgroundColor: '#374151', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  countBadgeText: { color: '#f9fafb', fontSize: 12, fontWeight: '600' },
  chevron: { color: '#4b5563', fontSize: 20 },
});
