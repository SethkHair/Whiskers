import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { Profile, RootStackParamList } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'FollowList'>;

export default function FollowListScreen({ route, navigation }: Props) {
  const { userId, mode } = route.params;
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: mode === 'followers' ? 'Followers' : 'Following' });

    async function load() {
      let data: Profile[] = [];

      if (mode === 'followers') {
        // People who follow userId
        const { data: rows } = await supabase
          .from('follows')
          .select('profile:profiles!follower_id(*)')
          .eq('following_id', userId);
        data = (rows ?? []).map((r: any) => r.profile).filter(Boolean);
      } else {
        // People userId is following
        const { data: rows } = await supabase
          .from('follows')
          .select('profile:profiles!following_id(*)')
          .eq('follower_id', userId);
        data = (rows ?? []).map((r: any) => r.profile).filter(Boolean);
      }

      setUsers(data);
      setLoading(false);
    }
    load();
  }, [userId, mode]);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#b45309" size="large" /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={users}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nobody here yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.username?.[0] ?? '?').toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.username}>@{item.username}</Text>
              {item.bio ? <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text> : null}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111827' },
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#f9fafb', fontSize: 16, fontWeight: '700' },
  username: { color: '#f9fafb', fontSize: 15, fontWeight: '600' },
  bio: { color: '#9ca3af', fontSize: 13, marginTop: 2, maxWidth: 260 },
});
