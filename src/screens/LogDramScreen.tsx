import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { checkAndAwardBadges } from '../lib/checkBadges';
import { RootStackParamList, ServingType } from '../types';
import Toast from '../components/Toast';
import FlavorWheel from '../components/FlavorWheel';

type Props = NativeStackScreenProps<RootStackParamList, 'LogDram'>;

const SERVING_OPTIONS: ServingType[] = ['neat', 'rocks', 'water', 'cocktail'];

export default function LogDramScreen({ route, navigation }: Props) {
  const { whiskyId, whiskyName, checkinId } = route.params;
  const isEditing = !!checkinId;
  const [rating, setRating] = useState(3);
  const [serving, setServing] = useState<ServingType>('neat');
  const [nose, setNose] = useState('');
  const [palate, setPalate] = useState('');
  const [finish, setFinish] = useState('');
  const [notes, setNotes] = useState('');
  const [flavorTags, setFlavorTags] = useState<string[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!checkinId) return;
    supabase.from('checkins').select('*').eq('id', checkinId).single().then(({ data }) => {
      if (!data) return;
      setRating(data.rating);
      setServing(data.serving_type);
      setNose(data.nose ?? '');
      setPalate(data.palate ?? '');
      setFinish(data.finish ?? '');
      setNotes(data.overall_notes ?? '');
      setFlavorTags(data.flavor_tags ?? []);
      setDate(data.date);
    });
  }, [checkinId]);

  async function submit() {
    setError(null);
    setLoading(true);

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setError('Not signed in — please sign in again');
        setLoading(false);
        return;
      }

      // Ensure profile exists (handles accounts created before the trigger)
      await supabase.from('profiles').upsert(
        { id: user.id, username: user.email?.split('@')[0] ?? user.id.slice(0, 8) },
        { onConflict: 'id', ignoreDuplicates: true }
      );

      const payload = {
        rating,
        serving_type: serving,
        nose: nose || null,
        palate: palate || null,
        finish: finish || null,
        overall_notes: notes || null,
        flavor_tags: flavorTags,
        date,
      };

      const { error: saveError } = isEditing
        ? await supabase.from('checkins').update(payload).eq('id', checkinId!)
        : await supabase.from('checkins').insert({ ...payload, user_id: user.id, whisky_id: whiskyId });

      if (saveError) {
        setError(saveError.message);
      } else {
        if (!isEditing) await checkAndAwardBadges(user.id);
        setToast(isEditing ? 'Dram updated!' : 'Dram logged!');
        setTimeout(() => navigation.goBack(), 1500);
      }
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    }

    setLoading(false);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.whiskyName}>{whiskyName}</Text>

      <Text style={styles.label}>Rating</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map(n => (
          <TouchableOpacity key={n} onPress={() => setRating(n)}>
            <Text style={[styles.star, n <= rating && styles.starFilled]}>{n <= rating ? '★' : '☆'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Serving</Text>
      <View style={styles.servingRow}>
        {SERVING_OPTIONS.map(s => (
          <TouchableOpacity
            key={s}
            style={[styles.servingBtn, serving === s && styles.servingBtnActive]}
            onPress={() => setServing(s)}
          >
            <Text style={[styles.servingText, serving === s && styles.servingTextActive]}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Nose</Text>
      <TextInput style={styles.input} placeholder="What do you smell?" placeholderTextColor="#6b7280" value={nose} onChangeText={setNose} multiline />

      <Text style={styles.label}>Palate</Text>
      <TextInput style={styles.input} placeholder="What do you taste?" placeholderTextColor="#6b7280" value={palate} onChangeText={setPalate} multiline />

      <Text style={styles.label}>Finish</Text>
      <TextInput style={styles.input} placeholder="How does it end?" placeholderTextColor="#6b7280" value={finish} onChangeText={setFinish} multiline />

      <Text style={styles.label}>Overall notes</Text>
      <TextInput style={[styles.input, styles.inputTall]} placeholder="Any other thoughts?" placeholderTextColor="#6b7280" value={notes} onChangeText={setNotes} multiline />

      <Text style={styles.label}>Flavor Profile</Text>
      <Text style={styles.flavorHint}>What flavors do you taste? Tap a category to pick.</Text>
      <FlavorWheel
        selected={flavorTags}
        onToggle={tag => setFlavorTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
      />
      <View style={styles.flavorSpacer} />

      <Text style={styles.label}>Date</Text>
      <TextInput
        style={styles.input}
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#6b7280"
        maxLength={10}
      />

      {error && <Text style={styles.error}>{error}</Text>}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{isEditing ? 'Save Changes' : 'Log Dram'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { padding: 20, paddingBottom: 48 },
  whiskyName: { fontSize: 20, fontWeight: '700', color: '#f9fafb', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  stars: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  star: { fontSize: 36, color: '#374151' },
  starFilled: { color: '#f59e0b' },
  servingRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  servingBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#374151' },
  servingBtnActive: { backgroundColor: '#b45309', borderColor: '#b45309' },
  servingText: { color: '#9ca3af', fontSize: 13 },
  servingTextActive: { color: '#fff', fontWeight: '600' },
  input: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 20,
    minHeight: 48,
  },
  inputTall: { minHeight: 80 },
  flavorHint: { color: '#6b7280', fontSize: 12, marginBottom: 10, marginTop: -4 },
  flavorSpacer: { height: 24 },
  error: { color: '#f87171', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  submitBtn: { backgroundColor: '#b45309', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
