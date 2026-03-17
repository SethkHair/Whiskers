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
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import Toast from '../components/Toast';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null); // local preview
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
      const { data } = await supabase.from('profiles').select('username, bio, avatar_url').eq('id', user.id).single();
      if (data) {
        setUsername(data.username ?? '');
        setBio(data.bio ?? '');
        setAvatarUrl(data.avatar_url ?? null);
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

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError('Photo library permission is required to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setAvatarUri(asset.uri);
    setUploadingAvatar(true);
    setError(null);

    try {
      const userId = currentUserId.current!;
      const ext = asset.uri.split('.').pop() ?? 'jpg';
      const path = `${userId}/avatar.${ext}`;

      // Fetch the image as a blob
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, blob, { upsert: true, contentType: `image/${ext}` });

      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        setAvatarUri(null);
      } else {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
        const publicUrl = urlData.publicUrl + `?t=${Date.now()}`; // cache bust
        setAvatarUrl(publicUrl);
        // Save immediately to profile
        await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      }
    } catch (e: any) {
      setError(e.message ?? 'Upload failed');
      setAvatarUri(null);
    }
    setUploadingAvatar(false);
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

  const displayUri = avatarUri ?? avatarUrl;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={pickAvatar}
            disabled={uploadingAvatar}
            accessibilityLabel="Change profile photo"
          >
            {displayUri ? (
              <Image source={{ uri: displayUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(username[0] ?? '?').toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.avatarOverlay}>
              {uploadingAvatar
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.avatarOverlayText}>📷</Text>
              }
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        <Text style={styles.label}>Username</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={username}
            onChangeText={handleUsernameChange}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor="#6b7280"
            accessibilityLabel="Username"
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
          accessibilityLabel="Bio"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {toast ? <Toast message={toast} onDone={() => setToast(null)} /> : null}

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={save}
          disabled={saving || usernameStatus === 'taken' || usernameStatus === 'checking'}
          accessibilityLabel="Save changes"
        >
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
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: { position: 'relative', width: 90, height: 90, marginBottom: 8 },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#f9fafb', fontSize: 36, fontWeight: '700' },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#b45309',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOverlayText: { fontSize: 14 },
  avatarHint: { color: '#6b7280', fontSize: 13 },
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
