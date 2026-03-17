import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SectionList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Checkin, Collection, Profile, RootStackParamList } from '../types';
import AvatarImage from '../components/AvatarImage';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type ProfileTab = 'drams' | 'collection';

const COLLECTION_SECTIONS = [
  { key: 'have', label: '🍾 Have' },
  { key: 'want', label: '🤩 Want' },
  { key: 'had',  label: '✅ Had' },
];

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [collection, setCollection] = useState<Collection[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [tab, setTab] = useState<ProfileTab>('drams');
  const [isAdmin, setIsAdmin] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [
        { data: prof },
        { data: cks },
        { data: col },
        { count: followers },
        { count: following },
        { count: unread },
      ] = await Promise.all([
        supabase.from('profiles').select('*, is_admin').eq('id', user.id).single(),
        supabase.from('checkins').select('*, whisky:whiskies(*)').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('collection').select('*, whisky:whiskies(*)').eq('user_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
        supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
      ]);

      if (prof) { setProfile(prof as Profile); setIsAdmin(!!(prof as any).is_admin); }
      if (cks) setCheckins(cks as Checkin[]);
      if (col) setCollection(col as Collection[]);
      setFollowerCount(followers ?? 0);
      setFollowingCount(following ?? 0);
      setUnreadCount(unread ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  function signOut() {
    supabase.auth.signOut();
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;
  }

  const collectionSections = COLLECTION_SECTIONS.map(s => ({
    title: s.label,
    data: collection.filter(c => c.status === s.key),
  })).filter(s => s.data.length > 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <AvatarImage uri={profile?.avatar_url} name={profile?.username ?? 'you'} size={56} />
        <View style={styles.headerText}>
          <Text style={styles.username}>@{profile?.username ?? 'you'}</Text>
          {profile?.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
        </View>
        <View style={styles.headerActions}>
          {/* Notifications bell */}
          <TouchableOpacity style={styles.bellBtn} onPress={() => navigation.navigate('Notifications')}>
            <Text style={styles.bellIcon}>🔔</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          {isAdmin && (
            <>
              <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('AdminApproval')}>
                <Text style={styles.adminBtnText}>Whiskies</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('AdminDistillery')}>
                <Text style={styles.adminBtnText}>Distilleries</Text>
              </TouchableOpacity>
            </>
          )}
          {confirmSignOut ? (
            <View style={styles.signOutConfirm}>
              <TouchableOpacity onPress={signOut} style={styles.signOutConfirmBtn}>
                <Text style={styles.signOutConfirmText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setConfirmSignOut(false)} style={styles.signOutBtn}>
                <Text style={styles.signOutText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setConfirmSignOut(true)} style={styles.signOutBtn}>
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{checkins.length}</Text>
          <Text style={styles.statLabel}>Drams</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNum}>{new Set(checkins.map(c => c.whisky_id)).size}</Text>
          <Text style={styles.statLabel}>Unique</Text>
        </View>
        <TouchableOpacity
          style={styles.stat}
          onPress={() => userId && navigation.navigate('FollowList', { userId, mode: 'followers' })}
        >
          <Text style={styles.statNum}>{followerCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stat}
          onPress={() => userId && navigation.navigate('FollowList', { userId, mode: 'following' })}
        >
          <Text style={styles.statNum}>{followingCount}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
        <View style={styles.stat}>
          <Text style={styles.statNum}>
            {checkins.length ? (checkins.reduce((s, c) => s + c.rating, 0) / checkins.length).toFixed(1) : '—'}
          </Text>
          <Text style={styles.statLabel}>Avg</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'drams' && styles.tabBtnActive]} onPress={() => setTab('drams')}>
          <Text style={[styles.tabText, tab === 'drams' && styles.tabTextActive]}>Drams</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'collection' && styles.tabBtnActive]} onPress={() => setTab('collection')}>
          <Text style={[styles.tabText, tab === 'collection' && styles.tabTextActive]}>Collection</Text>
        </TouchableOpacity>
      </View>

      {tab === 'drams' ? (
        <FlatList
          data={checkins}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.empty}>No check-ins yet</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => confirmDeleteId === item.id ? setConfirmDeleteId(null) : navigation.navigate('WhiskyDetail', { whiskyId: item.whisky_id })}
              onLongPress={() => setConfirmDeleteId(item.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.whiskyName}>{item.whisky?.name ?? item.whisky_id}</Text>
                <Text style={styles.meta}>{item.whisky?.distillery} · {new Date(item.date).toLocaleDateString()}</Text>
              </View>
              {confirmDeleteId === item.id ? (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={async () => {
                    await supabase.from('checkins').delete().eq('id', item.id);
                    setCheckins(c => c.filter(x => x.id !== item.id));
                    setConfirmDeleteId(null);
                  }}
                >
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.ratingText}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</Text>
              )}
            </TouchableOpacity>
          )}
        />
      ) : (
        <SectionList
          sections={collectionSections}
          keyExtractor={item => item.id}
          ListEmptyComponent={<Text style={styles.empty}>Nothing in your collection yet{'\n'}Add whiskies from their detail page</Text>}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('WhiskyDetail', { whiskyId: item.whisky_id })}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.whiskyName}>{item.whisky?.name ?? item.whisky_id}</Text>
                <Text style={styles.meta}>{item.whisky?.distillery} · {item.whisky?.country}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12, gap: 12 },
  headerText: { flex: 1 },
  username: { fontSize: 20, fontWeight: '700', color: '#f9fafb' },
  bio: { color: '#9ca3af', fontSize: 14, marginTop: 4, maxWidth: 200 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  bellBtn: { position: 'relative', padding: 4 },
  bellIcon: { fontSize: 20 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#b45309', borderRadius: 8, minWidth: 16, paddingHorizontal: 3, alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  editBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#b45309' },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  adminBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#374151' },
  adminBtnText: { color: '#f9fafb', fontSize: 13, fontWeight: '600' },
  signOutConfirm: { flexDirection: 'row', gap: 8 },
  signOutConfirmBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#dc2626' },
  signOutConfirmText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  signOutBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#374151' },
  signOutText: { color: '#9ca3af', fontSize: 13 },
  stats: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 16, gap: 16, flexWrap: 'wrap' },
  stat: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '700', color: '#f9fafb' },
  statLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  tabs: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1f2937', borderRadius: 10, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#b45309' },
  tabText: { color: '#6b7280', fontWeight: '600', fontSize: 14 },
  tabTextActive: { color: '#fff' },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 40, lineHeight: 22 },
  sectionHeader: { fontSize: 13, fontWeight: '700', color: '#6b7280', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#111827' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' },
  whiskyName: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  meta: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  ratingText: { color: '#f59e0b', fontSize: 13 },
  deleteBtn: { backgroundColor: '#dc2626', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  deleteBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
