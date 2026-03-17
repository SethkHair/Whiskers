import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Notification, RootStackParamList } from '../types';
import { timeAgo } from '../lib/utils';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function notificationText(n: Notification): string {
  const actor = n.actor?.username ? `@${n.actor.username}` : 'Someone';
  if (n.type === 'follow') return `${actor} started following you`;
  if (n.type === 'like') {
    const whisky = n.checkin?.whisky?.name;
    return whisky ? `${actor} liked your dram of ${whisky}` : `${actor} liked your dram`;
  }
  if (n.type === 'comment') {
    const whisky = n.checkin?.whisky?.name;
    return whisky ? `${actor} commented on your dram of ${whisky}` : `${actor} commented on your dram`;
  }
  return `${actor} interacted with you`;
}

export default function NotificationsScreen() {
  const navigation = useNavigation<Nav>();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('notifications')
        .select('*, actor:profiles!actor_id(id, username), checkin:checkins(whisky_id, whisky:whiskies(name))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) setNotifications(data as Notification[]);

      // Mark all as read
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      setLoading(false);
    }
    load();
  }, []);

  function handlePress(n: Notification) {
    if (n.type === 'follow') {
      navigation.navigate('UserProfile', { userId: n.actor_id });
    } else if (n.checkin_id) {
      navigation.navigate('Comments', { checkinId: n.checkin_id, checkinUserId: n.actor_id });
    }
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notifications</Text>
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>No notifications yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, !item.read && styles.rowUnread]}
            onPress={() => handlePress(item)}
          >
            <View style={styles.iconWrap}>
              <Text style={styles.icon}>
                {item.type === 'follow' ? '👤' : item.type === 'like' ? '❤️' : '💬'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.text}>{notificationText(item)}</Text>
              <Text style={styles.time}>{timeAgo(item.created_at)}</Text>
            </View>
            {!item.read && <View style={styles.dot} />}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
  header: { fontSize: 24, fontWeight: '700', color: '#f9fafb', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 60 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: 12,
  },
  rowUnread: { backgroundColor: '#1a2435' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 16 },
  text: { color: '#f9fafb', fontSize: 14, lineHeight: 20 },
  time: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#b45309',
  },
});
