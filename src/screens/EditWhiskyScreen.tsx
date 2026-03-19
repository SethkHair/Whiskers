import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Whisky, WhiskyType, RootStackParamList } from '../types';
import { WHISKY_COUNTRIES, COUNTRY_TYPES, COUNTRY_REGIONS, FLAVOR_TAGS } from '../constants/badges';
import Toast from '../components/Toast';

type Props = NativeStackScreenProps<RootStackParamList, 'EditWhisky'>;

const WHISKY_TYPES: { value: WhiskyType; label: string }[] = [
  { value: 'single_malt', label: 'Single Malt' },
  { value: 'blended', label: 'Blended' },
  { value: 'bourbon', label: 'Bourbon' },
  { value: 'rye', label: 'Rye' },
  { value: 'irish', label: 'Irish' },
  { value: 'japanese', label: 'Japanese' },
  { value: 'other', label: 'Other' },
];

function OptionGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[] | string[];
  value: T;
  onChange: (v: T) => void;
}) {
  const normalized = (options as (string | { value: T; label: string })[]).map(o =>
    typeof o === 'string' ? { value: o as T, label: o } : o
  );
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionWrap}>
        {normalized.map(o => (
          <TouchableOpacity
            key={o.value}
            style={[styles.option, value === o.value && styles.optionActive]}
            onPress={() => onChange(o.value)}
          >
            <Text style={[styles.optionText, value === o.value && styles.optionTextActive]}>
              {o.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function EditWhiskyScreen({ route, navigation }: Props) {
  const { whiskyId } = route.params;

  const [name, setName] = useState('');
  const [distillery, setDistillery] = useState('');
  const [country, setCountry] = useState<string>(WHISKY_COUNTRIES[0]);
  const [region, setRegion] = useState<string>('None');
  const [type, setType] = useState<WhiskyType>(COUNTRY_TYPES[WHISKY_COUNTRIES[0]][0]);

  function handleCountryChange(c: string) {
    setCountry(c);
    const allowedTypes = COUNTRY_TYPES[c] ?? COUNTRY_TYPES['Other'];
    if (!allowedTypes.includes(type)) setType(allowedTypes[0]);
    const allowedRegions = COUNTRY_REGIONS[c] ?? COUNTRY_REGIONS['Other'];
    if (!allowedRegions.includes(region)) setRegion('None');
  }
  const [age, setAge] = useState('');
  const [abv, setAbv] = useState('');
  const [description, setDescription] = useState('');
  const [flavorTags, setFlavorTags] = useState<string[]>([]);

  const [loading, setLoading] = useState(true);

  function toggleFlavor(tag: string) {
    setFlavorTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('whiskies').select('*').eq('id', whiskyId).single();
      if (!data) { setLoading(false); return; }
      const w = data as Whisky;
      setName(w.name);
      setDistillery(w.distillery);
      setCountry(w.country);
      setRegion(w.region ?? 'None');
      setType(w.type);
      setAge(w.age_statement ? String(w.age_statement) : '');
      setAbv(w.abv ? String(w.abv) : '');
      setDescription(w.description ?? '');
      setFlavorTags(w.flavor_tags ?? []);
      setLoading(false);
    }
    load();
  }, [whiskyId]);

  async function save() {
    if (!name.trim() || !distillery.trim()) {
      setError('Name and distillery are required');
      return;
    }
    setSaving(true);
    setError(null);
    const { error: e } = await supabase.from('whiskies').update({
      name: name.trim(),
      distillery: distillery.trim(),
      country,
      region: region === 'None' ? null : region,
      type,
      age_statement: age ? parseInt(age, 10) : null,
      abv: abv ? parseFloat(abv) : null,
      description: description.trim() || null,
      flavor_tags: flavorTags,
    }).eq('id', whiskyId);
    setSaving(false);
    if (e) { setError(e.message); return; }
    setToast('Saved!');
    setTimeout(() => navigation.goBack(), 1500);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Lagavulin 16" placeholderTextColor="#6b7280" />

        <Text style={styles.label}>Distillery *</Text>
        <TextInput style={styles.input} value={distillery} onChangeText={setDistillery} placeholder="e.g. Lagavulin" placeholderTextColor="#6b7280" />

        <OptionGroup label="Country" options={WHISKY_COUNTRIES} value={country} onChange={handleCountryChange} />
        <OptionGroup label="Type" options={WHISKY_TYPES.filter(t => (COUNTRY_TYPES[country] ?? COUNTRY_TYPES['Other']).includes(t.value))} value={type} onChange={setType} />
        <OptionGroup label="Region" options={['None', ...(COUNTRY_REGIONS[country] ?? COUNTRY_REGIONS['Other'])]} value={region} onChange={setRegion} />

        <View style={styles.row}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.label}>Age</Text>
            <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="e.g. 16" placeholderTextColor="#6b7280" keyboardType="number-pad" maxLength={2} />
          </View>
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.label}>ABV %</Text>
            <TextInput style={styles.input} value={abv} onChangeText={setAbv} placeholder="e.g. 43" placeholderTextColor="#6b7280" keyboardType="decimal-pad" />
          </View>
        </View>

        <Text style={styles.label}>Flavor Profile</Text>
        <View style={styles.optionWrap}>
          {FLAVOR_TAGS.map(tag => (
            <TouchableOpacity
              key={tag}
              style={[styles.option, flavorTags.includes(tag) && styles.optionActive]}
              onPress={() => toggleFlavor(tag)}
            >
              <Text style={[styles.optionText, flavorTags.includes(tag) && styles.optionTextActive]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
        <TextInput
          style={[styles.input, { minHeight: 80 }]}
          value={description}
          onChangeText={setDescription}
          placeholder="Tasting notes or background…"
          placeholderTextColor="#6b7280"
          multiline
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  content: { padding: 20, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  input: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 20,
  },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#374151', backgroundColor: '#1f2937' },
  optionActive: { backgroundColor: '#b45309', borderColor: '#b45309' },
  optionText: { color: '#9ca3af', fontSize: 13 },
  optionTextActive: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row' },
  error: { color: '#f87171', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  saveBtn: { backgroundColor: '#b45309', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
