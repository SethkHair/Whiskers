import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { WhiskyType } from '../types';
import { WHISKY_REGIONS, WHISKY_COUNTRIES } from '../constants/badges';

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
  const navigation = useNavigation();
  const [name, setName] = useState('');
  const [distillery, setDistillery] = useState('');
  const [country, setCountry] = useState<string>(WHISKY_COUNTRIES[0]);
  const [region, setRegion] = useState<string>('None');
  const [type, setType] = useState<WhiskyType>('single_malt');
  const [age, setAge] = useState('');
  const [abv, setAbv] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!name.trim() || !distillery.trim()) {
      Alert.alert('Required', 'Name and distillery are required');
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('whiskies').insert({
      name: name.trim(),
      distillery: distillery.trim(),
      country,
      region: region === 'None' ? null : region,
      type,
      age_statement: age ? parseInt(age, 10) : null,
      abv: abv ? parseFloat(abv) : null,
      description: description || null,
      status: 'pending',
      submitted_by: user?.id ?? null,
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Submitted!', 'Your whisky will appear after review.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Name *</Text>
      <TextInput style={styles.input} placeholder="e.g. Lagavulin 16" placeholderTextColor="#6b7280" value={name} onChangeText={setName} />

      <Text style={styles.label}>Distillery *</Text>
      <TextInput style={styles.input} placeholder="e.g. Lagavulin" placeholderTextColor="#6b7280" value={distillery} onChangeText={setDistillery} />

      <OptionGroup label="Type" options={WHISKY_TYPES} value={type} onChange={setType} />

      <OptionGroup
        label="Country"
        options={WHISKY_COUNTRIES}
        value={country}
        onChange={setCountry}
      />

      <OptionGroup
        label="Region"
        options={['None', ...WHISKY_REGIONS]}
        value={region}
        onChange={setRegion}
      />

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
  option: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#1f2937',
  },
  optionActive: { backgroundColor: '#b45309', borderColor: '#b45309' },
  optionText: { color: '#9ca3af', fontSize: 13 },
  optionTextActive: { color: '#fff', fontWeight: '600' },
  row: { flexDirection: 'row' },
  submitBtn: { backgroundColor: '#b45309', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
