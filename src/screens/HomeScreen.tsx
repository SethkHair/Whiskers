import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Checkin, RootStackParamList } from '../types';
import { timeAgo } from '../lib/utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RATING_LABELS: Record<number, string> = {
  1: '★☆☆☆☆', 2: '★★☆☆☆', 3: '★★★☆☆', 4: '★★★★☆', 5: '★★★★★',
};

type LikeInfo = { count: number; liked: boolean };

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likesMap, setLikesMap] = useState<Record<string, LikeInfo>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingOnly, setFollowingOnly] = useState(false);
  const [error, setError] = useState(false);

  async function fetchCheckins() {
    setError(false);
    const { data: { user } } = await supabase.auth.getUser();
    const myId = user?.id ?? null;
    setCurrentUserId(myId);

    let query = supabase
      .from('checkins')
      .select('*, whisky:whiskies(*), profile:profiles(*)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (myId) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', myId);

      if (follows && follows.length > 0) {
        const ids = [...follows.map(f => f.following_id), myId];
        query = query.in('user_id', ids);
        setFollowingOnly(true);
      } else {
        setFollowingOnly(false);
      }
    }

    const { data, error: fetchError } = await query;
    if (fetchError) { setError(true); return; }

    const rows = (data ?? []) as Checkin[];
    setCheckins(rows);

    if (rows.length === 0) return;
    const ids = rows.map(c => c.id);

    const [{ data: likesData }, { data: commentsData }] = await Promise.all([
      supabase.from('likes').select('user_id, checkin_id').in('checkin_id', ids),
      supabase.from('comments').select('checkin_id').in('checkin_id', ids),
    ]);

    const newLikesMap: Record<string, LikeInfo> = {};
    for (const id of ids) {
      const forCheckin = (likesData ?? []).filter(l => l.checkin_id === id);
      newLikesMap[id] = { count: forCheckin.length, liked: myId ? forCheckin.some(l => l.user_id === myId) : false };
    }
    setLikesMap(newLikesMap);

    const newCommentCounts: Record<string, number> = {};
    for (const id of ids) {
      newCommentCounts[id] = (commentsData ?? []).filter(c => c.checkin_id === id).length;
    }
    setCommentCounts(newCommentCounts);
  }

  useEffect(() => {
    fetchCheckins().finally(() => setLoading(false));
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    await fetchCheckins();
    setRefreshing(false);
  }

  async function toggleLike(checkin: Checkin) {
    if (!currentUserId) return;
    const info = likesMap[checkin.id] ?? { count: 0, liked: false };
    const nowLiked = !info.liked;

    // Optimistic update
    setLikesMap(prev => ({
      ...prev,
      [checkin.id]: { count: info.count + (nowLiked ? 1 : -1), liked: nowLiked },
    }));

    if (nowLiked) {
      await supabase.from('likes').insert({ user_id: currentUserId, checkin_id: checkin.id });
      // Notify checkin owner (skip if it's own checkin)
      if (checkin.user_id !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id: checkin.user_id,
          actor_id: currentUserId,
          type: 'like',
          checkin_id: checkin.id,
        });
      }
    } else {
      await supabase.from('likes').delete()
        .eq('user_id', currentUserId)
        .eq('checkin_id', checkin.id);
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;
  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>Couldn't load feed</Text>
      <TouchableOpacity onPress={() => { setLoading(true); fetchCheckins().finally(() => setLoading(false)); }}>
        <Text style={styles.retryText}>Tap to retry</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{followingOnly ? 'Following' : 'Activity'}</Text>
      <FlatList
        data={checkins}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b45309" />}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {followingOnly ? 'No activity from people you follow yet.' : 'No check-ins yet. Be the first!'}
          </Text>
        }
        renderItem={({ item }) => {
          const likeInfo = likesMap[item.id] ?? { count: 0, liked: false };
          const commentCount = commentCounts[item.id] ?? 0;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => item.whisky && navigation.navigate('WhiskyDetail', { whiskyId: item.whisky_id })}
            >
              <View style={styles.cardHeader}>
                <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: item.user_id })}>
                  <Text style={styles.username}>@{item.profile?.username ?? 'unknown'}</Text>
                </TouchableOpacity>
                <Text style={styles.rating}>{RATING_LABELS[item.rating] ?? item.rating}</Text>
              </View>
              <Text style={styles.whiskyName}>{item.whisky?.name ?? item.whisky_id}</Text>
              {item.whisky && (
                <Text style={styles.distillery}>{item.whisky.distillery} · {item.whisky.country}</Text>
              )}
              {item.overall_notes ? <Text style={styles.notes}>{item.overall_notes}</Text> : null}
              <View style={styles.cardFooter}>
                <Text style={styles.date}>{timeAgo(item.created_at)}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => toggleLike(item)}>
                    <Text style={[styles.actionIcon, likeInfo.liked && styles.actionIconActive]}>
                      {likeInfo.liked ? '❤️' : '🤍'}
                    </Text>
                    {likeInfo.count > 0 && <Text style={styles.actionCount}>{likeInfo.count}</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('Comments', { checkinId: item.id, checkinUserId: item.user_id })}
                  >
                    <Text style={styles.actionIcon}>💬</Text>
                    {commentCount > 0 && <Text style={styles.actionCount}>{commentCount}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  header: { fontSize: 24, fontWeight: '700', color: '#f9fafb', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 60, fontSize: 15 },
  errorText: { color: '#f87171', fontSize: 16, marginBottom: 12 },
  retryText: { color: '#b45309', fontSize: 15, fontWeight: '600' },
  card: {
    backgroundColor: '#1f2937',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  username: { color: '#b45309', fontWeight: '600', fontSize: 14 },
  rating: { color: '#f59e0b', fontSize: 13 },
  whiskyName: { color: '#f9fafb', fontSize: 17, fontWeight: '600', marginBottom: 2 },
  distillery: { color: '#9ca3af', fontSize: 13, marginBottom: 6 },
  notes: { color: '#d1d5db', fontSize: 14, lineHeight: 20, marginBottom: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  date: { color: '#6b7280', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 16 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionIcon: { fontSize: 16 },
  actionIconActive: { opacity: 1 },
  actionCount: { color: '#9ca3af', fontSize: 13 },
});
