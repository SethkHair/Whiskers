import { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { CollectionStatus } from '../types';

const OPTIONS: { value: CollectionStatus; label: string; emoji: string }[] = [
  { value: 'have', label: 'Have',  emoji: '🍾' },
  { value: 'want', label: 'Want',  emoji: '🤩' },
  { value: 'had',  label: 'Had',   emoji: '✅' },
];

export default function CollectionButton({ whiskyId }: { whiskyId: string }) {
  const [status, setStatus] = useState<CollectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data } = await supabase
        .from('collection')
        .select('status')
        .eq('user_id', user.id)
        .eq('whisky_id', whiskyId)
        .maybeSingle();

      setStatus((data?.status as CollectionStatus) ?? null);
      setLoading(false);
    }
    load();
  }, [whiskyId]);

  async function select(value: CollectionStatus) {
    if (!userId) return;
    setLoading(true);

    if (status === value) {
      // Deselect
      await supabase.from('collection').delete()
        .eq('user_id', userId).eq('whisky_id', whiskyId);
      setStatus(null);
    } else {
      await supabase.from('collection').upsert({
        user_id: userId,
        whisky_id: whiskyId,
        status: value,
      }, { onConflict: 'user_id,whisky_id' });
      setStatus(value);
    }
    setLoading(false);
  }

  if (loading) return <ActivityIndicator color="#b45309" style={{ marginVertical: 12 }} />;

  return (
    <View style={styles.row}>
      {OPTIONS.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.btn, status === opt.value && styles.btnActive]}
          onPress={() => select(opt.value)}
        >
          <Text style={styles.emoji}>{opt.emoji}</Text>
          <Text style={[styles.label, status === opt.value && styles.labelActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#1f2937',
  },
  btnActive: { borderColor: '#b45309', backgroundColor: '#451a03' },
  emoji: { fontSize: 20, marginBottom: 3 },
  label: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  labelActive: { color: '#fb923c' },
});
