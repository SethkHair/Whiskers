import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Checkin, Whisky, RootStackParamList } from '../types';
import { timeAgo } from '../lib/utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const RATING_LABELS: Record<number, string> = {
  1: '★☆☆☆☆', 2: '★★☆☆☆', 3: '★★★☆☆', 4: '★★★★☆', 5: '★★★★★',
};

type LikeInfo = { count: number; liked: boolean };
type TrendingItem = { whisky: Whisky; count: number };

const PAGE_SIZE = 20;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likesMap, setLikesMap] = useState<Record<string, LikeInfo>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [trending, setTrending] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [feedTab, setFeedTab] = useState<'following' | 'all'>('following');
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [hasFollows, setHasFollows] = useState(false);
  const [error, setError] = useState(false);

  async function fetchTrending() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('checkins')
      .select('whisky_id, whisky:whiskies(id, name, distillery, type)')
      .gte('created_at', weekAgo)
      .not('whisky_id', 'is', null);

    if (!data || data.length === 0) return;

    const counts: Record<string, { count: number; whisky: Whisky }> = {};
    for (const row of data) {
      if (!row.whisky_id || !row.whisky) continue;
      if (!counts[row.whisky_id]) {
        counts[row.whisky_id] = { count: 0, whisky: row.whisky as unknown as Whisky };
      }
      counts[row.whisky_id].count++;
    }

    const sorted = Object.values(counts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
    setTrending(sorted);
  }

  async function fetchCheckins(pageNum = 0, append = false) {
    setError(false);
    const { data: { user } } = await supabase.auth.getUser();
    const myId = user?.id ?? null;
    if (!append) setCurrentUserId(myId);

    let ids: string[] = followedIds;
    if (!append) {
      if (myId) {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', myId);
        ids = follows && follows.length > 0 ? [...follows.map(f => f.following_id), myId] : [myId];
        setFollowedIds(ids);
        setHasFollows(follows ? follows.length > 0 : false);
      } else {
        ids = [];
        setHasFollows(false);
      }
    }

    let query = supabase
      .from('checkins')
      .select('*, whisky:whiskies(*), profile:profiles(*)')
      .order('created_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (feedTab === 'following' && ids.length > 0) query = query.in('user_id', ids);

    const { data, error: fetchError } = await query;
    if (fetchError) { setError(true); return; }

    const rows = (data ?? []) as Checkin[];
    setHasMore(rows.length === PAGE_SIZE);

    const newRows = append ? [...checkins, ...rows] : rows;
    setCheckins(newRows);

    if (rows.length === 0) return;
    const checkinIds = rows.map(c => c.id);

    const [{ data: likesData }, { data: commentsData }] = await Promise.all([
      supabase.from('likes').select('user_id, checkin_id').in('checkin_id', checkinIds),
      supabase.from('comments').select('checkin_id').in('checkin_id', checkinIds),
    ]);

    const newLikesMap: Record<string, LikeInfo> = append ? { ...likesMap } : {};
    for (const id of checkinIds) {
      const forCheckin = (likesData ?? []).filter(l => l.checkin_id === id);
      newLikesMap[id] = { count: forCheckin.length, liked: myId ? forCheckin.some(l => l.user_id === myId) : false };
    }
    setLikesMap(newLikesMap);

    const newCommentCounts: Record<string, number> = append ? { ...commentCounts } : {};
    for (const id of checkinIds) {
      newCommentCounts[id] = (commentsData ?? []).filter(c => c.checkin_id === id).length;
    }
    setCommentCounts(newCommentCounts);
  }

  async function fetchMore() {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchCheckins(nextPage, true);
    setLoadingMore(false);
  }

  useEffect(() => {
    setPage(0);
    setHasMore(true);
    Promise.all([fetchCheckins(0, false), fetchTrending()]).finally(() => setLoading(false));
  }, [feedTab]);

  async function onRefresh() {
    setRefreshing(true);
    setPage(0);
    await Promise.all([fetchCheckins(0, false), fetchTrending()]);
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
      <View style={styles.headerRow}>
        <Text style={styles.header}>Activity</Text>
        <View style={styles.feedTabs}>
          <TouchableOpacity
            style={[styles.feedTab, feedTab === 'following' && styles.feedTabActive]}
            onPress={() => setFeedTab('following')}
          >
            <Text style={[styles.feedTabText, feedTab === 'following' && styles.feedTabTextActive]}>Following</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.feedTab, feedTab === 'all' && styles.feedTabActive]}
            onPress={() => setFeedTab('all')}
          >
            <Text style={[styles.feedTabText, feedTab === 'all' && styles.feedTabTextActive]}>All</Text>
          </TouchableOpacity>
        </View>
      </View>
      <FlatList
        data={checkins}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#b45309" />}
        ListHeaderComponent={trending.length > 0 ? (
          <View style={styles.trendingSection}>
            <Text style={styles.trendingTitle}>🔥 Trending this week</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingRow}>
              {trending.map(({ whisky, count }) => (
                <TouchableOpacity
                  key={whisky.id}
                  style={styles.trendingCard}
                  onPress={() => navigation.navigate('WhiskyDetail', { whiskyId: whisky.id })}
                >
                  <Text style={styles.trendingName} numberOfLines={2}>{whisky.name}</Text>
                  <Text style={styles.trendingDistillery} numberOfLines={1}>{whisky.distillery}</Text>
                  <Text style={styles.trendingCount}>{count} dram{count !== 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}
        onEndReached={fetchMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={loadingMore ? (
          <View style={styles.footerLoader}><ActivityIndicator color="#b45309" /></View>
        ) : null}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {feedTab === 'following' && !hasFollows
              ? 'Follow people to see their drams here.'
              : feedTab === 'following'
              ? 'No activity from people you follow yet.'
              : 'No check-ins yet. Be the first!'}
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
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  header: { fontSize: 24, fontWeight: '700', color: '#f9fafb' },
  feedTabs: { flexDirection: 'row', backgroundColor: '#1f2937', borderRadius: 10, padding: 3, gap: 2 },
  feedTab: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  feedTabActive: { backgroundColor: '#b45309' },
  feedTabText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
  feedTabTextActive: { color: '#fff' },
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
  trendingSection: { paddingBottom: 4 },
  trendingTitle: { color: '#6b7280', fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, paddingHorizontal: 16, paddingBottom: 10 },
  trendingRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 12 },
  trendingCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    width: 130,
    borderWidth: 1,
    borderColor: '#374151',
  },
  trendingName: { color: '#f9fafb', fontSize: 13, fontWeight: '700', marginBottom: 3, lineHeight: 17 },
  trendingDistillery: { color: '#9ca3af', fontSize: 11, marginBottom: 6 },
  trendingCount: { color: '#b45309', fontSize: 11, fontWeight: '600' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});
