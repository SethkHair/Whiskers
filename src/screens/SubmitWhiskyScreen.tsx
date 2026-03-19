import { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { Whisky, WhiskyType, RootStackParamList } from '../types';
import { WHISKY_COUNTRIES, COUNTRY_TYPES, COUNTRY_REGIONS } from '../constants/badges';
import Toast from '../components/Toast';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;

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

export default function SubmitWhiskyScreen() {
  const navigation = useNavigation<Nav>();

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Duplicate detection
  const [duplicates, setDuplicates] = useState<Whisky[]>([]);
  const [checkingDups, setCheckingDups] = useState(false);
  const dupTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pending submissions
  const [pending, setPending] = useState<Whisky[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);

  useEffect(() => {
    async function loadPending() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadingPending(false); return; }
      const { data } = await supabase
        .from('whiskies')
        .select('*')
        .eq('submitted_by', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (data) setPending(data as Whisky[]);
      setLoadingPending(false);
    }
    loadPending();
  }, []);

  // Debounced duplicate check when name + distillery are filled
  const checkDuplicates = useCallback(() => {
    if (dupTimeout.current) clearTimeout(dupTimeout.current);
    if (name.trim().length < 3 && distillery.trim().length < 2) {
      setDuplicates([]);
      return;
    }
    setCheckingDups(true);
    dupTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('whiskies')
        .select('id, name, distillery, type, age_statement, status')
        .or(`name.ilike.%${name.trim()}%,distillery.ilike.%${distillery.trim()}%`)
        .limit(5);
      setDuplicates((data ?? []) as Whisky[]);
      setCheckingDups(false);
    }, 600);
  }, [name, distillery]);

  useEffect(() => {
    checkDuplicates();
  }, [name, distillery]);

  async function submit() {
    if (!name.trim() || !distillery.trim()) {
      setError('Name and distillery are required');
      return;
    }
    setError(null);
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from('whiskies').insert({
      name: name.trim(),
      distillery: distillery.trim(),
      country,
      region: region === 'None' ? null : region,
      type,
      age_statement: age ? parseInt(age, 10) : null,
      abv: abv ? parseFloat(abv) : null,
      description: description.trim() || null,
      status: 'pending',
      submitted_by: user?.id ?? null,
    });

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
    } else {
      setToast('Submitted! Your whisky will appear after review.');
      setTimeout(() => navigation.goBack(), 2000);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Pending submissions */}
      {!loadingPending && pending.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>Your pending submissions</Text>
          {pending.map(w => (
            <View key={w.id} style={styles.pendingRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingName}>{w.name}</Text>
                <Text style={styles.pendingMeta}>{w.distillery} · {w.type.replace('_', ' ')}</Text>
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingBadgeText}>Pending</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.label}>Name *</Text>
      <TextInput style={styles.input} placeholder="e.g. Lagavulin 16" placeholderTextColor="#6b7280" value={name} onChangeText={setName} />

      <Text style={styles.label}>Distillery *</Text>
      <TextInput style={styles.input} placeholder="e.g. Lagavulin" placeholderTextColor="#6b7280" value={distillery} onChangeText={setDistillery} />

      {/* Duplicate warning */}
      {(checkingDups || duplicates.length > 0) && (name.trim().length >= 3 || distillery.trim().length >= 2) && (
        <View style={styles.dupSection}>
          {checkingDups ? (
            <ActivityIndicator color="#f59e0b" size="small" />
          ) : (
            <>
              <Text style={styles.dupTitle}>⚠️ Similar whiskies already in the database</Text>
              {duplicates.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={styles.dupRow}
                  onPress={() => navigation.navigate('WhiskyDetail', { whiskyId: d.id })}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dupName}>{d.name}</Text>
                    <Text style={styles.dupMeta}>{d.distillery} · {d.type.replace('_', ' ')}{d.age_statement ? ` · ${d.age_statement}yr` : ''}</Text>
                  </View>
                  <View style={[styles.statusBadge, d.status === 'approved' ? styles.statusApproved : styles.statusPending]}>
                    <Text style={styles.statusText}>{d.status}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <Text style={styles.dupNote}>Check these before submitting to avoid duplicates.</Text>
            </>
          )}
        </View>
      )}

      <OptionGroup label="Country" options={WHISKY_COUNTRIES} value={country} onChange={handleCountryChange} />
      <OptionGroup label="Type" options={WHISKY_TYPES.filter(t => (COUNTRY_TYPES[country] ?? COUNTRY_TYPES['Other']).includes(t.value))} value={type} onChange={setType} />
      <OptionGroup label="Region" options={['None', ...(COUNTRY_REGIONS[country] ?? COUNTRY_REGIONS['Other'])]} value={region} onChange={setRegion} />

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={styles.label}>Age</Text>
          <TextInput style={styles.input} placeholder="e.g. 16" placeholderTextColor="#6b7280" keyboardType="numeric" value={age} onChangeText={setAge} />
        </View>
        <View style={{ flex: 1, marginLeft: 8 }}>
          <Text style={styles.label}>ABV %</Text>
          <TextInput style={styles.input} placeholder="e.g. 43" placeholderTextColor="#6b7280" keyboardType="decimal-pad" value={abv} onChangeText={setAbv} />
        </View>
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, { minHeight: 80 }]}
        placeholder="Optional tasting notes or background..."
        placeholderTextColor="#6b7280"
        value={description}
        onChangeText={setDescription}
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}

      <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit for Review</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
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
  submitBtn: { backgroundColor: '#b45309', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  // Pending submissions
  pendingSection: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#374151',
  },
  pendingTitle: { color: '#6b7280', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 },
  pendingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#374151' },
  pendingName: { color: '#f9fafb', fontSize: 14, fontWeight: '600' },
  pendingMeta: { color: '#9ca3af', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  pendingBadge: { backgroundColor: '#374151', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  pendingBadgeText: { color: '#f59e0b', fontSize: 11, fontWeight: '600' },
  // Duplicate detection
  dupSection: {
    backgroundColor: '#1f1a0e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#92400e',
  },
  dupTitle: { color: '#f59e0b', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  dupRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#374151' },
  dupName: { color: '#f9fafb', fontSize: 14, fontWeight: '600' },
  dupMeta: { color: '#9ca3af', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  dupNote: { color: '#92400e', fontSize: 12, marginTop: 10, fontStyle: 'italic' },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusApproved: { backgroundColor: '#064e3b' },
  statusPending: { backgroundColor: '#374151' },
  statusText: { color: '#f9fafb', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
