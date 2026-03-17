import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const checkTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleUsernameChange(value: string) {
    setUsername(value);
    setUsernameStatus('idle');
    if (checkTimeout.current) clearTimeout(checkTimeout.current);
    if (!value.trim()) return;
    setUsernameStatus('checking');
    checkTimeout.current = setTimeout(async () => {
      const { data } = await supabase.from('profiles').select('id').eq('username', value.trim()).maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 500);
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      if (!username.trim()) { setError('Username is required'); setLoading(false); return; }
      if (usernameStatus === 'taken') { setError('Username is already taken'); setLoading(false); return; }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username } },
      });
      if (error) setError(error.message);
    }

    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.inner}>
        <Text style={styles.logo}>🥃</Text>
        <Text style={styles.title}>Whiskers</Text>
        <Text style={styles.subtitle}>Track every dram</Text>

        <View style={styles.form}>
          {mode === 'signup' && (
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Username"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                value={username}
                onChangeText={handleUsernameChange}
              />
              {usernameStatus === 'checking' && <ActivityIndicator color="#b45309" style={{ marginLeft: 10 }} />}
              {usernameStatus === 'available' && <Text style={styles.available}>✓</Text>}
              {usernameStatus === 'taken' && <Text style={styles.taken}>✗</Text>}
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.buttonText}>{mode === 'signin' ? 'Sign In' : 'Create Account'}</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toggle}
            onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); }}
          >
            <Text style={styles.toggleText}>
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: '700', color: '#f9fafb', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#9ca3af', marginBottom: 48 },
  form: { width: '100%' },
  input: {
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  button: {
    backgroundColor: '#b45309',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggle: { marginTop: 20, alignItems: 'center' },
  toggleText: { color: '#9ca3af', fontSize: 14 },
  error: { color: '#f87171', fontSize: 14, marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  available: { color: '#22c55e', fontSize: 18, marginLeft: 10 },
  taken: { color: '#f87171', fontSize: 18, marginLeft: 10 },
});
