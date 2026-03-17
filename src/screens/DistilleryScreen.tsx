import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Distillery, Whisky, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Distillery'>;

export default function DistilleryScreen({ route, navigation }: Props) {
  const { distillery: distilleryName, distilleryId: paramId } = route.params;

  const [profile, setProfile] = useState<Distillery | null>(null);
  const [parent, setParent] = useState<Distillery | null>(null);
  const [children, setChildren] = useState<Distillery[]>([]);
  const [linkedWhiskies, setLinkedWhiskies] = useState<Whisky[]>([]);
  const [nameWhiskies, setNameWhiskies] = useState<Whisky[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: distilleryName });
    load();
  }, [paramId, distilleryName]);

  async function load() {
    setLoading(true);

    // Check admin status
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
      setIsAdmin(!!(prof as any)?.is_admin);
    }

    let distilleryId = paramId;

    // If no distilleryId passed, try to find one by name
    if (!distilleryId) {
      const { data: found } = await supabase
        .from('distilleries')
        .select('*')
        .ilike('name', distilleryName)
        .limit(1)
        .maybeSingle();
      if (found) distilleryId = found.id;
    }

    if (distilleryId) {
      const [{ data: dist }, { data: childRows }, { data: linked }] = await Promise.all([
        supabase.from('distilleries').select('*').eq('id', distilleryId).single(),
        supabase.from('distilleries').select('*').eq('parent_id', distilleryId),
        supabase.from('whiskies').select('*').eq('distillery_id', distilleryId).eq('status', 'approved').order('name'),
      ]);

      if (dist) {
        const d = dist as Distillery;
        setProfile(d);

        if (d.parent_id) {
          const { data: par } = await supabase.from('distilleries').select('*').eq('id', d.parent_id).single();
          if (par) setParent(par as Distillery);
        }
      }
      if (childRows) setChildren(childRows as Distillery[]);
      if (linked) setLinkedWhiskies(linked as Whisky[]);

      // Whiskies matching by name that aren't formally linked yet
      const { data: byName } = await supabase
        .from('whiskies')
        .select('*')
        .ilike('distillery', distilleryName)
        .is('distillery_id', null)
        .eq('status', 'approved')
        .order('name');
      setNameWhiskies((byName ?? []) as Whisky[]);
    } else {
      // No profile record — just show whiskies by name
      const { data: byName } = await supabase
        .from('whiskies')
        .select('*')
        .ilike('distillery', distilleryName)
        .eq('status', 'approved')
        .order('age_statement', { ascending: true, nullsFirst: false });
      setNameWhiskies((byName ?? []) as Whisky[]);
    }

    setLoading(false);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;

  const allWhiskies = [...linkedWhiskies, ...nameWhiskies];

  return (
    <FlatList
      style={styles.container}
      data={allWhiskies}
      keyExtractor={item => item.id}
      ListEmptyComponent={<Text style={styles.empty}>No whiskies found for this distillery</Text>}
      ListHeaderComponent={(
        <>
          {profile ? (
            <View style={styles.profileCard}>
              <View style={styles.profileHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.profileName}>{profile.name}</Text>
                  {(profile.country || profile.region) && (
                    <Text style={styles.profileMeta}>
                      {[profile.region, profile.country].filter(Boolean).join(', ')}
                    </Text>
                  )}
                  {profile.founded_year ? (
                    <Text style={styles.profileMeta}>Est. {profile.founded_year}</Text>
                  ) : null}
                </View>
                {isAdmin && (
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => navigation.navigate('EditDistillery', { distilleryId: profile.id })}
                  >
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {profile.description ? (
                <Text style={styles.description}>{profile.description}</Text>
              ) : null}

              {parent && (
                <TouchableOpacity
                  style={styles.parentRow}
                  onPress={() => navigation.navigate('Distillery', { distillery: parent.name, distilleryId: parent.id })}
                >
                  <Text style={styles.parentLabel}>Part of</Text>
                  <Text style={styles.parentName}>{parent.name} ›</Text>
                </TouchableOpacity>
              )}

              {children.length > 0 && (
                <View style={styles.childrenSection}>
                  <Text style={styles.sectionLabel}>Under this umbrella</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.childrenRow}>
                    {children.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={styles.childPill}
                        onPress={() => navigation.navigate('Distillery', { distillery: c.name, distilleryId: c.id })}
                      >
                        <Text style={styles.childPillText}>{c.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.noProfileCard}>
              <Text style={styles.noProfileName}>{distilleryName}</Text>
              {isAdmin && (
                <TouchableOpacity
                  style={styles.createBtn}
                  onPress={() => navigation.navigate('EditDistillery', {})}
                >
                  <Text style={styles.createBtnText}>+ Create Profile</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.whiskyHeader}>
            <Text style={styles.sectionTitle}>
              Whiskies · {allWhiskies.length}
            </Text>
            {nameWhiskies.length > 0 && linkedWhiskies.length > 0 && isAdmin && (
              <Text style={styles.unlinkedNote}>{nameWhiskies.length} unlinked</Text>
            )}
          </View>
        </>
      )}
      renderItem={({ item }) => {
        const isUnlinked = !item.distillery_id;
        return (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('WhiskyDetail', { whiskyId: item.id })}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.whiskyName}>{item.name}</Text>
              <Text style={styles.whiskyMeta}>
                {[
                  item.type.replace('_', ' '),
                  item.age_statement ? `${item.age_statement} yr` : null,
                  item.abv ? `${item.abv}%` : null,
                ].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {isUnlinked && isAdmin ? (
              <Text style={styles.unlinkedTag}>unlinked</Text>
            ) : (
              <Text style={styles.chevron}>›</Text>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  profileCard: {
    backgroundColor: '#1f2937',
    margin: 16,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#374151',
  },
  profileHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  profileName: { fontSize: 22, fontWeight: '700', color: '#f9fafb', marginBottom: 2 },
  profileMeta: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  editBtn: { backgroundColor: '#374151', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  editBtnText: { color: '#f9fafb', fontSize: 13, fontWeight: '600' },
  description: { color: '#d1d5db', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  parentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#374151' },
  parentLabel: { color: '#6b7280', fontSize: 13 },
  parentName: { color: '#b45309', fontSize: 13, fontWeight: '600' },
  childrenSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#374151' },
  sectionLabel: { color: '#6b7280', fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  childrenRow: { gap: 8 },
  childPill: {
    backgroundColor: '#374151',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  childPillText: { color: '#f9fafb', fontSize: 13, fontWeight: '600' },
  noProfileCard: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noProfileName: { fontSize: 24, fontWeight: '700', color: '#f9fafb' },
  createBtn: { backgroundColor: '#b45309', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  createBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  whiskyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  unlinkedNote: { color: '#6b7280', fontSize: 12 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 40, paddingHorizontal: 32 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  whiskyName: { color: '#f9fafb', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  whiskyMeta: { color: '#9ca3af', fontSize: 12, textTransform: 'capitalize' },
  unlinkedTag: { color: '#6b7280', fontSize: 11, fontStyle: 'italic' },
  chevron: { color: '#4b5563', fontSize: 22, marginLeft: 8 },
});
