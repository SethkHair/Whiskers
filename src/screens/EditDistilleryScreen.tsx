import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Distillery, Whisky, RootStackParamList } from '../types';
import { WHISKY_COUNTRIES, COUNTRY_REGIONS } from '../constants/badges';
import Toast from '../components/Toast';

function OptionGroup({ label, options, value, onChange }: {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={{ marginBottom: 20 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionWrap}>
        {options.map(o => (
          <TouchableOpacity
            key={o}
            style={[styles.option, value === o && styles.optionActive]}
            onPress={() => onChange(o)}
          >
            <Text style={[styles.optionText, value === o && styles.optionTextActive]}>{o}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

type Props = NativeStackScreenProps<RootStackParamList, 'EditDistillery'>;

export default function EditDistilleryScreen({ route, navigation }: Props) {
  const { distilleryId } = route.params;
  const isEditing = !!distilleryId;

  const [name, setName] = useState('');
  const [country, setCountry] = useState(WHISKY_COUNTRIES[0]);
  const [region, setRegion] = useState('Other');

  function handleCountryChange(c: string) {
    setCountry(c);
    const allowed = COUNTRY_REGIONS[c] ?? COUNTRY_REGIONS['Other'];
    if (!allowed.includes(region)) setRegion(allowed[0]);
  }
  const [foundedYear, setFoundedYear] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [parentId, setParentId] = useState<string | null>(null);
  const [parentName, setParentName] = useState('');

  const [parentSearch, setParentSearch] = useState('');
  const [parentResults, setParentResults] = useState<Distillery[]>([]);
  const [showParentPicker, setShowParentPicker] = useState(false);
  const parentTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [unlinkableWhiskies, setUnlinkableWhiskies] = useState<Whisky[]>([]);
  const [linking, setLinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ title: isEditing ? 'Edit Distillery' : 'New Distillery' });
    if (isEditing) loadExisting();
  }, [distilleryId]);

  async function loadExisting() {
    const { data } = await supabase.from('distilleries').select('*').eq('id', distilleryId!).single();
    if (!data) { setLoading(false); return; }
    const d = data as Distillery;
    setName(d.name);
    const c = WHISKY_COUNTRIES.includes(d.country ?? '') ? (d.country ?? WHISKY_COUNTRIES[0]) : 'Other';
    setCountry(c);
    const allowedRegions = COUNTRY_REGIONS[c] ?? COUNTRY_REGIONS['Other'];
    const r = d.region ?? 'Other';
    setRegion(allowedRegions.includes(r) ? r : allowedRegions[0]);
    setFoundedYear(d.founded_year ? String(d.founded_year) : '');
    setDescription(d.description ?? '');
    setWebsite(d.website ?? '');
    setParentId(d.parent_id);

    if (d.parent_id) {
      const { data: par } = await supabase.from('distilleries').select('name').eq('id', d.parent_id).single();
      if (par) setParentName((par as any).name);
    }

    // Find whiskies matching by name but not yet linked
    const { data: unlinkable } = await supabase
      .from('whiskies')
      .select('id, name, type, age_statement')
      .ilike('distillery', d.name)
      .is('distillery_id', null)
      .eq('status', 'approved')
      .order('name');
    setUnlinkableWhiskies((unlinkable ?? []) as Whisky[]);

    setLoading(false);
  }

  function handleParentSearch(text: string) {
    setParentSearch(text);
    if (parentTimeout.current) clearTimeout(parentTimeout.current);
    if (!text.trim()) { setParentResults([]); return; }
    parentTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('distilleries')
        .select('id, name, country')
        .ilike('name', `%${text.trim()}%`)
        .neq('id', distilleryId ?? '')
        .limit(8);
      setParentResults((data ?? []) as Distillery[]);
    }, 300);
  }

  function selectParent(d: Distillery) {
    setParentId(d.id);
    setParentName(d.name);
    setParentSearch('');
    setParentResults([]);
    setShowParentPicker(false);
  }

  function clearParent() {
    setParentId(null);
    setParentName('');
    setParentSearch('');
    setParentResults([]);
  }

  async function save() {
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      country: country || null,
      region: region === 'Other' ? null : region || null,
      founded_year: foundedYear ? parseInt(foundedYear) : null,
      description: description.trim() || null,
      website: website.trim() || null,
      parent_id: parentId,
    };

    let savedId = distilleryId;
    if (isEditing) {
      const { error: e } = await supabase.from('distilleries').update(payload).eq('id', distilleryId!);
      if (e) { setError(e.message); setSaving(false); return; }
    } else {
      const { data, error: e } = await supabase.from('distilleries').insert(payload).select('id').single();
      if (e || !data) { setError(e?.message ?? 'Failed to create'); setSaving(false); return; }
      savedId = (data as any).id;
    }

    setSaving(false);
    setToast(isEditing ? 'Saved!' : 'Distillery created!');
    setTimeout(() => navigation.goBack(), 1500);
  }

  async function autoLinkWhiskies() {
    if (!distilleryId || unlinkableWhiskies.length === 0) return;
    setLinking(true);

    const ids = unlinkableWhiskies.map(w => w.id);
    const { error: e } = await supabase
      .from('whiskies')
      .update({ distillery_id: distilleryId })
      .in('id', ids);

    if (!e) {
      setUnlinkableWhiskies([]);
      setToast(`Linked ${ids.length} whisky${ids.length !== 1 ? 'ies' : ''}!`);
    } else {
      setError(e.message);
    }
    setLinking(false);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        <Text style={styles.label}>Name *</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Distillery name" placeholderTextColor="#6b7280" autoCapitalize="words" />

        <OptionGroup label="Country" options={WHISKY_COUNTRIES} value={country} onChange={handleCountryChange} />
        <OptionGroup label="Region" options={COUNTRY_REGIONS[country] ?? COUNTRY_REGIONS['Other']} value={region} onChange={setRegion} />

        <Text style={styles.label}>Founded Year</Text>
        <TextInput style={styles.input} value={foundedYear} onChangeText={setFoundedYear} placeholder="e.g. 1881" placeholderTextColor="#6b7280" keyboardType="number-pad" maxLength={4} />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.inputTall]}
          value={description}
          onChangeText={setDescription}
          placeholder="History, character, notable expressions…"
          placeholderTextColor="#6b7280"
          multiline
        />

        <Text style={styles.label}>Website</Text>
        <TextInput style={styles.input} value={website} onChangeText={setWebsite} placeholder="https://…" placeholderTextColor="#6b7280" autoCapitalize="none" keyboardType="url" />

        {/* Parent company picker */}
        <Text style={styles.label}>Parent / Umbrella Company</Text>
        {parentId ? (
          <View style={styles.parentSelected}>
            <Text style={styles.parentSelectedText}>{parentName}</Text>
            <TouchableOpacity onPress={clearParent}>
              <Text style={styles.clearParent}>✕ Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.parentPickerBtn} onPress={() => setShowParentPicker(!showParentPicker)}>
              <Text style={styles.parentPickerText}>
                {showParentPicker ? '▲ Close picker' : '▼ Set parent company'}
              </Text>
            </TouchableOpacity>
            {showParentPicker && (
              <View style={styles.parentPickerPanel}>
                <TextInput
                  style={styles.parentSearchInput}
                  value={parentSearch}
                  onChangeText={handleParentSearch}
                  placeholder="Search distilleries…"
                  placeholderTextColor="#6b7280"
                  autoFocus
                />
                {parentResults.map(d => (
                  <TouchableOpacity key={d.id} style={styles.parentResultRow} onPress={() => selectParent(d)}>
                    <Text style={styles.parentResultName}>{d.name}</Text>
                    {d.country && <Text style={styles.parentResultMeta}>{d.country}</Text>}
                  </TouchableOpacity>
                ))}
                {parentSearch.length > 0 && parentResults.length === 0 && (
                  <Text style={styles.noResults}>No matching distilleries</Text>
                )}
              </View>
            )}
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Create Distillery'}</Text>}
        </TouchableOpacity>

        {/* Auto-link unlinked whiskies (edit mode only) */}
        {isEditing && unlinkableWhiskies.length > 0 && (
          <View style={styles.linkSection}>
            <Text style={styles.linkTitle}>Unlinked whiskies matching "{name}"</Text>
            <Text style={styles.linkSub}>These whiskies have "{name}" as their distillery text but aren't formally linked yet.</Text>
            {unlinkableWhiskies.map(w => (
              <View key={w.id} style={styles.linkRow}>
                <Text style={styles.linkWhiskyName}>{w.name}</Text>
                <Text style={styles.linkWhiskyMeta}>{w.type?.replace('_', ' ')}{w.age_statement ? ` · ${w.age_statement}yr` : ''}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.autoLinkBtn} onPress={autoLinkWhiskies} disabled={linking}>
              {linking
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.autoLinkBtnText}>Link All {unlinkableWhiskies.length} Whisk{unlinkableWhiskies.length !== 1 ? 'ies' : 'y'}</Text>
              }
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  content: { padding: 20, paddingBottom: 48 },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#374151', backgroundColor: '#1f2937' },
  optionActive: { backgroundColor: '#b45309', borderColor: '#b45309' },
  optionText: { color: '#9ca3af', fontSize: 13 },
  optionTextActive: { color: '#fff', fontWeight: '600' },
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
  inputTall: { minHeight: 100, marginBottom: 20 },
  parentSelected: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#b45309', marginBottom: 20 },
  parentSelectedText: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  clearParent: { color: '#f87171', fontSize: 13 },
  parentPickerBtn: { marginBottom: 8 },
  parentPickerText: { color: '#b45309', fontSize: 14, fontWeight: '600' },
  parentPickerPanel: { backgroundColor: '#1f2937', borderRadius: 12, borderWidth: 1, borderColor: '#374151', marginBottom: 20, overflow: 'hidden' },
  parentSearchInput: { color: '#f9fafb', fontSize: 15, padding: 14, borderBottomWidth: 1, borderBottomColor: '#374151' },
  parentResultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#374151' },
  parentResultName: { color: '#f9fafb', fontSize: 15 },
  parentResultMeta: { color: '#6b7280', fontSize: 13 },
  noResults: { color: '#6b7280', fontSize: 13, padding: 14, textAlign: 'center' },
  error: { color: '#f87171', fontSize: 14, marginBottom: 12 },
  saveBtn: { backgroundColor: '#b45309', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 32 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  linkSection: { borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 24 },
  linkTitle: { color: '#f9fafb', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  linkSub: { color: '#9ca3af', fontSize: 13, lineHeight: 18, marginBottom: 16 },
  linkRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  linkWhiskyName: { color: '#f9fafb', fontSize: 14, fontWeight: '600' },
  linkWhiskyMeta: { color: '#6b7280', fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  autoLinkBtn: { backgroundColor: '#374151', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 16 },
  autoLinkBtnText: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
});
