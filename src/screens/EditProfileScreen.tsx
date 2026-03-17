import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const currentUserId = useRef<string | null>(null);
  const originalUsername = useRef<string>('');
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      currentUserId.current = user.id;
      const { data } = await supabase.from('profiles').select('username, bio').eq('id', user.id).single();
      if (data) {
        setUsername(data.username ?? '');
        setBio(data.bio ?? '');
        originalUsername.current = data.username ?? '';
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleUsernameChange(value: string) {
    setUsername(value);
    setUsernameStatus('idle');
    if (checkTimeout.current) clearTimeout(checkTimeout.current);
    if (!value.trim() || value.trim() === originalUsername.current) return;

    setUsernameStatus('checking');
    checkTimeout.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', value.trim())
        .neq('id', currentUserId.current ?? '')
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
  }

  async function save() {
    if (!username.trim()) { setError('Username cannot be empty'); return; }
    if (usernameStatus === 'taken') { setError('Username is already taken'); return; }
    if (usernameStatus === 'checking') { setError('Still checking username, please wait'); return; }

    setSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: username.trim(), bio: bio.trim() || null })
      .eq('id', user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setToast('Profile saved!');
      setTimeout(() => navigation.goBack(), 1500);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#b45309" /></View>;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>Username</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#6b7280"
          />
          {usernameStatus === 'checking' && <ActivityIndicator color="#b45309" style={styles.inputIcon} />}
          {usernameStatus === 'available' && <Text style={[styles.inputIcon, styles.available]}>✓</Text>}
          {usernameStatus === 'taken' && <Text style={[styles.inputIcon, styles.taken]}>✗</Text>}
        </View>
        {usernameStatus === 'taken' && <Text style={styles.takenText}>Username already taken</Text>}

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={[styles.input, styles.inputTall]}
          value={bio}
          onChangeText={setBio}
          placeholder="Tell people a bit about yourself..."
          placeholderTextColor="#6b7280"
          multiline
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}

        <TouchableOpacity style={styles.saveBtn} onPress={save} disabled={saving || usernameStatus === 'taken' || usernameStatus === 'checking'}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  content: { padding: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  input: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
  },
  inputTall: { minHeight: 100, marginBottom: 20 },
  inputIcon: { marginLeft: 10, fontSize: 18 },
  available: { color: '#22c55e' },
  taken: { color: '#f87171' },
  takenText: { color: '#f87171', fontSize: 13, marginTop: -14, marginBottom: 16 },
  error: { color: '#f87171', fontSize: 14, marginBottom: 12 },
  saveBtn: { backgroundColor: '#b45309', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
