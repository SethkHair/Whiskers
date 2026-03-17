import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';
import AuthScreen from '../screens/AuthScreen';
import MainTabs from './MainTabs';
import WhiskyDetailScreen from '../screens/WhiskyDetailScreen';
import LogDramScreen from '../screens/LogDramScreen';
import SubmitWhiskyScreen from '../screens/SubmitWhiskyScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import DistilleryScreen from '../screens/DistilleryScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AdminApprovalScreen from '../screens/AdminApprovalScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
});

export default function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#b45309" />
    </View>
  );

  return (
    <Stack.Navigator>
      {session ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="WhiskyDetail" component={WhiskyDetailScreen} options={{ title: 'Whisky' }} />
          <Stack.Screen name="LogDram" component={LogDramScreen} options={{ title: 'Log a Dram' }} />
          <Stack.Screen name="SubmitWhisky" component={SubmitWhiskyScreen} options={{ title: 'Submit Whisky' }} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="Distillery" component={DistilleryScreen} options={({ route }) => ({ title: route.params.distillery })} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
          <Stack.Screen name="AdminApproval" component={AdminApprovalScreen} options={{ title: 'Pending Whiskies' }} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
