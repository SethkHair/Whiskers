import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { TabParamList, RootStackParamList } from '../types';
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BadgesScreen from '../screens/BadgesScreen';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const Tab = createBottomTabNavigator<TabParamList>();

function TabsWithFAB() {
  const navigation = useNavigation<Nav>();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            const icons: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
              Home: 'home',
              Search: 'search',
              Profile: 'person',
              Badges: 'ribbon',
            };
            return <Ionicons name={icons[route.name]} size={size} color={color} />;
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Search" component={SearchScreen} />
        <Tab.Screen name="Badges" component={BadgesScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('QuickLog')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MainTabs() {
  return <TabsWithFAB />;
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#b45309',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabIcon: { color: '#fff', fontSize: 28, lineHeight: 32, fontWeight: '300' },
});
