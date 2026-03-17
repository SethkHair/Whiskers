import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Profile, Checkin, RootStackParamList } from '../types';
import { BADGE_DEFINITIONS } from '../constants/badges';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

export default function UserProfileScreen({ route, navigation }: Props) {
  const { userId } = route.params;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    load();
  }, [userId]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    const myId = user?.id ?? null;
    setCurrentUserId(myId);

    const [
      { data: prof },
      { data: cks },
      { count: followers },
      { count: following },
      { data: followRow },
      { data: badgeRows },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.from('checkins').select('*, whisky:whiskies(*)').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
      myId ? supabase.from('follows').select('follower_id').eq('follower_id', myId).eq('following_id', userId) : Promise.resolve({ data: [] }),
      supabase.from('user_badges').select('badge_id').eq('user_id', userId),
    ]);

    if (prof) setProfile(prof as Profile);
    if (cks) setCheckins(cks as Checkin[]);
    setFollowerCount(followers ?? 0);
    setFollowingCount(following ?? 0);
    setIsFollowing((followRow?.length ?? 0) > 0);
    if (badgeRows) setEarnedBadgeIds(new Set(badgeRows.map((b: any) => b.badge_id)));
    setLoading(false);
  }

  async function toggleFollow() {
    if (!currentUserId) return;
    setFollowLoading(true);

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', currentUserId).eq('following_id', userId);
      setIsFollowing(false);
      setFollowerCount(c => c - 1);
    } else {
      await supabase.from('follows').insert({ follower_id: currentUserId, following_id: userId });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
      // Notify the followed user
      await supabase.from('notifications').insert({
        user_id: userId,
        actor_id: currentUserId,
        type: 'follow',
      });
    }
    setFollowLoading(false);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;
  }

  const isOwnProfile = currentUserId === userId || !currentUserId;
  const earnedBadges = BADGE_DEFINITIONS.filter(b => earnedBadgeIds.has(b.id));

  return (
    <FlatList
      style={styles.container}
      data={checkins}
      keyExtractor={item => item.id}
      ListEmptyComponent={<Text style={styles.empty}>No check-ins yet</Text>}
      ListHeaderComponent={(
        <>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.username}>@{profile?.username ?? 'unknown'}</Text>
              {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
            </View>
            {!isOwnProfile && (
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followingBtn]}
                onPress={toggleFollow}
                disabled={followLoading}
              >
                {followLoading
                  ? <ActivityIndicator color={isFollowing ? '#b45309' : '#fff'} size="small" />
                  : <Text style={[styles.followBtnText, isFollowing && styles.followingBtnText]}>
                      {isFollowing ? 'Following' : 'Follow'}
                    </Text>
                }
              </TouchableOpacity>
            )}
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statNum}>{checkins.length}</Text>
              <Text style={styles.statLabel}>Drams</Text>
            </View>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigation.navigate('FollowList', { userId, mode: 'followers' })}
            >
              <Text style={styles.statNum}>{followerCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.stat}
              onPress={() => navigation.navigate('FollowList', { userId, mode: 'following' })}
            >
              <Text style={styles.statNum}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>

          {/* Earned badges */}
          {earnedBadges.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesRow} contentContainerStyle={styles.badgesContent}>
              {earnedBadges.map(b => (
                <View key={b.id} style={styles.badgePill}>
                  <Text style={styles.badgeIcon}>{b.icon}</Text>
                  <Text style={styles.badgeName}>{b.name}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          <Text style={styles.sectionTitle}>Recent drams</Text>
        </>
      )}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate('WhiskyDetail', { whiskyId: item.whisky_id })}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.whiskyName}>{item.whisky?.name ?? item.whisky_id}</Text>
            <Text style={styles.meta}>{item.whisky?.distillery} · {new Date(item.date).toLocaleDateString()}</Text>
          </View>
          <Text style={styles.rating}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, paddingTop: 20 },
  username: { fontSize: 22, fontWeight: '700', color: '#f9fafb' },
  bio: { color: '#9ca3af', fontSize: 14, marginTop: 4, maxWidth: 220 },
  followBtn: { backgroundColor: '#b45309', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 8, minWidth: 90, alignItems: 'center' },
  followingBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#b45309' },
  followBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  followingBtnText: { color: '#b45309' },
  stats: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, gap: 24 },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '700', color: '#f9fafb' },
  statLabel: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  badgesRow: { paddingBottom: 12 },
  badgesContent: { paddingHorizontal: 16, gap: 8 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1f2937',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#b45309',
  },
  badgeIcon: { fontSize: 14 },
  badgeName: { color: '#f9fafb', fontSize: 12, fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#6b7280', paddingHorizontal: 16, paddingBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  whiskyName: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  meta: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  rating: { color: '#f59e0b', fontSize: 13 },
});
