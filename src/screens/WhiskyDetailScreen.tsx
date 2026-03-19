import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Whisky, Checkin, RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STOP_WORDS = new Set(['with', 'hint', 'hints', 'notes', 'note', 'touch', 'slight', 'some', 'very', 'nice', 'good', 'great', 'little', 'light', 'rich', 'long', 'finish', 'palate', 'nose', 'this', 'that', 'from', 'have', 'been', 'more', 'also']);

function topWords(texts: (string | null)[], n = 5): string[] {
  const counts: Record<string, number> = {};
  for (const t of texts) {
    if (!t) continue;
    for (const word of t.toLowerCase().split(/[\s,;.!?()]+/)) {
      if (word.length > 3 && !STOP_WORDS.has(word)) {
        counts[word] = (counts[word] ?? 0) + 1;
      }
    }
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([w]) => w);
}
import { timeAgo } from '../lib/utils';
import CollectionButton from '../components/CollectionButton';

type Props = NativeStackScreenProps<RootStackParamList, 'WhiskyDetail'>;

export default function WhiskyDetailScreen({ route, navigation }: Props) {
  const nav = useNavigation<Nav>();
  const { whiskyId } = route.params;
  const [whisky, setWhisky] = useState<Whisky | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: w }, { data: cks }] = await Promise.all([
        supabase.from('whiskies').select('*').eq('id', whiskyId).single(),
        supabase
          .from('checkins')
          .select('*, profile:profiles(*)')
          .eq('whisky_id', whiskyId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (w) setWhisky(w as Whisky);
      if (cks) setCheckins(cks as Checkin[]);
      setLoading(false);
    }
    load();
  }, [whiskyId]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;
  }

  if (!whisky) {
    return <View style={styles.center}><Text style={styles.errorText}>Whisky not found</Text></View>;
  }

  const avgRating = checkins.length
    ? (checkins.reduce((s, c) => s + c.rating, 0) / checkins.length).toFixed(1)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.name}>{whisky.name}</Text>
      <TouchableOpacity onPress={() => navigation.navigate('Distillery', {
        distillery: whisky.distillery,
        distilleryId: whisky.distillery_id ?? undefined,
      })}>
        <Text style={styles.distillery}>{whisky.distillery} ›</Text>
      </TouchableOpacity>

      <View style={styles.tags}>
        <Tag label={whisky.country} />
        {whisky.region && <Tag label={whisky.region} />}
        <Tag label={whisky.type.replace('_', ' ')} />
        {whisky.age_statement && <Tag label={`${whisky.age_statement} yr`} />}
        {whisky.abv && <Tag label={`${whisky.abv}% ABV`} />}
      </View>

      {avgRating && (
        <View style={styles.ratingRow}>
          <Text style={styles.ratingNum}>{avgRating}</Text>
          <Text style={styles.ratingLabel}> avg from {checkins.length} dram{checkins.length !== 1 ? 's' : ''}</Text>
        </View>
      )}

      {whisky.description && <Text style={styles.description}>{whisky.description}</Text>}

      <CollectionButton whiskyId={whisky.id} />

      <TouchableOpacity
        style={styles.logBtn}
        onPress={() => navigation.navigate('LogDram', { whiskyId: whisky.id, whiskyName: whisky.name })}
      >
        <Text style={styles.logBtnText}>🥃 Log a Dram</Text>
      </TouchableOpacity>

      {checkins.length >= 3 && (() => {
        const noseWords = topWords(checkins.map(c => c.nose));
        const palateWords = topWords(checkins.map(c => c.palate));
        const finishWords = topWords(checkins.map(c => c.finish));
        const hasAny = noseWords.length > 0 || palateWords.length > 0 || finishWords.length > 0;
        if (!hasAny) return null;
        return (
          <View style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Community tasting notes</Text>
            {noseWords.length > 0 && (
              <View style={styles.notesRow}>
                <Text style={styles.notesCategory}>Nose</Text>
                <View style={styles.notesTags}>
                  {noseWords.map(w => <Text key={w} style={styles.notesTag}>{w}</Text>)}
                </View>
              </View>
            )}
            {palateWords.length > 0 && (
              <View style={styles.notesRow}>
                <Text style={styles.notesCategory}>Palate</Text>
                <View style={styles.notesTags}>
                  {palateWords.map(w => <Text key={w} style={styles.notesTag}>{w}</Text>)}
                </View>
              </View>
            )}
            {finishWords.length > 0 && (
              <View style={styles.notesRow}>
                <Text style={styles.notesCategory}>Finish</Text>
                <View style={styles.notesTags}>
                  {finishWords.map(w => <Text key={w} style={styles.notesTag}>{w}</Text>)}
                </View>
              </View>
            )}
          </View>
        );
      })()}

      {checkins.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Recent check-ins</Text>
          {checkins.map(c => (
            <View key={c.id} style={styles.checkinCard}>
              <View style={styles.checkinHeader}>
                <TouchableOpacity onPress={() => nav.navigate('UserProfile', { userId: c.user_id })}>
                  <Text style={styles.checkinUser}>@{c.profile?.username ?? 'unknown'}</Text>
                </TouchableOpacity>
                <Text style={styles.checkinRating}>{'★'.repeat(c.rating)}{'☆'.repeat(5 - c.rating)}</Text>
              </View>
              {c.overall_notes && <Text style={styles.checkinNotes}>{c.overall_notes}</Text>}
              <Text style={styles.checkinDate}>{timeAgo(c.created_at)}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  errorText: { color: '#9ca3af', fontSize: 16 },
  name: { fontSize: 26, fontWeight: '700', color: '#f9fafb', marginBottom: 4 },
  distillery: { fontSize: 16, color: '#9ca3af', marginBottom: 16 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: { backgroundColor: '#1f2937', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#374151' },
  tagText: { color: '#d1d5db', fontSize: 12, textTransform: 'capitalize' },
  ratingRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 16 },
  ratingNum: { fontSize: 32, fontWeight: '700', color: '#f59e0b' },
  ratingLabel: { color: '#6b7280', fontSize: 14 },
  description: { color: '#d1d5db', fontSize: 15, lineHeight: 22, marginBottom: 24 },
  logBtn: { backgroundColor: '#b45309', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 32 },
  logBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  checkinCard: { backgroundColor: '#1f2937', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#374151' },
  checkinHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  checkinUser: { color: '#b45309', fontWeight: '600', fontSize: 13 },
  checkinRating: { color: '#f59e0b', fontSize: 12 },
  checkinNotes: { color: '#d1d5db', fontSize: 14, lineHeight: 20, marginBottom: 6 },
  checkinDate: { color: '#6b7280', fontSize: 12 },
  notesCard: { backgroundColor: '#1f2937', borderRadius: 12, padding: 14, marginBottom: 24, borderWidth: 1, borderColor: '#374151' },
  notesRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  notesCategory: { color: '#6b7280', fontSize: 12, fontWeight: '600', width: 48, paddingTop: 4 },
  notesTags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  notesTag: { backgroundColor: '#374151', color: '#d1d5db', fontSize: 12, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, textTransform: 'capitalize' },
});
