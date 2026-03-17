import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Comment, RootStackParamList } from '../types';
import { timeAgo } from '../lib/utils';

type Props = NativeStackScreenProps<RootStackParamList, 'Comments'>;

export default function CommentsScreen({ route, navigation }: Props) {
  const { checkinId, checkinUserId } = route.params;
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id ?? null);

      const { data } = await supabase
        .from('comments')
        .select('*, profile:profiles(*)')
        .eq('checkin_id', checkinId)
        .order('created_at', { ascending: true });

      if (data) setComments(data as Comment[]);
      setLoading(false);
    }
    load();
  }, [checkinId]);

  async function submitComment() {
    if (!body.trim() || !currentUserId) return;
    setSubmitting(true);

    const { data, error } = await supabase
      .from('comments')
      .insert({ user_id: currentUserId, checkin_id: checkinId, body: body.trim() })
      .select('*, profile:profiles(*)')
      .single();

    if (!error && data) {
      setComments(prev => [...prev, data as Comment]);
      setBody('');

      // Notify checkin owner (skip if own checkin)
      if (checkinUserId !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id: checkinUserId,
          actor_id: currentUserId,
          type: 'comment',
          checkin_id: checkinId,
          comment_id: (data as Comment).id,
        });
      }
    }
    setSubmitting(false);
  }

  async function deleteComment(commentId: string) {
    await supabase.from('comments').delete().eq('id', commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
    setConfirmDeleteId(null);
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#b45309" /></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={comments}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No comments yet. Be the first!</Text>}
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <View style={styles.commentHeader}>
              <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.user_id })}>
                <Text style={styles.commentUser}>@{item.profile?.username ?? 'unknown'}</Text>
              </TouchableOpacity>
              <Text style={styles.commentTime}>{timeAgo(item.created_at)}</Text>
            </View>
            <Text style={styles.commentBody}>{item.body}</Text>
            {item.user_id === currentUserId && (
              confirmDeleteId === item.id ? (
                <View style={styles.deleteRow}>
                  <TouchableOpacity onPress={() => deleteComment(item.id)} style={styles.deleteConfirmBtn}>
                    <Text style={styles.deleteConfirmText}>Delete</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setConfirmDeleteId(null)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity onPress={() => setConfirmDeleteId(item.id)}>
                  <Text style={styles.deleteHint}>Delete</Text>
                </TouchableOpacity>
              )
            )}
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Add a comment…"
          placeholderTextColor="#6b7280"
          value={body}
          onChangeText={setBody}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!body.trim() || submitting) && styles.sendBtnDisabled]}
          onPress={submitComment}
          disabled={!body.trim() || submitting}
        >
          {submitting
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.sendText}>Send</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  list: { padding: 16, paddingBottom: 8 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
  comment: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  commentUser: { color: '#b45309', fontWeight: '600', fontSize: 13 },
  commentTime: { color: '#6b7280', fontSize: 12 },
  commentBody: { color: '#f9fafb', fontSize: 15, lineHeight: 20 },
  deleteRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  deleteConfirmBtn: { backgroundColor: '#dc2626', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 },
  deleteConfirmText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  cancelText: { color: '#6b7280', fontSize: 12, paddingVertical: 4 },
  deleteHint: { color: '#6b7280', fontSize: 12, marginTop: 6 },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    backgroundColor: '#111827',
  },
  input: {
    flex: 1,
    backgroundColor: '#1f2937',
    color: '#f9fafb',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#374151',
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: '#b45309',
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
