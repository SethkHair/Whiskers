import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { useAuth } from '../hooks/useAuth';
import { isOnboardingDone } from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import MainTabs from './MainTabs';
import WhiskyDetailScreen from '../screens/WhiskyDetailScreen';
import LogDramScreen from '../screens/LogDramScreen';
import SubmitWhiskyScreen from '../screens/SubmitWhiskyScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import DistilleryScreen from '../screens/DistilleryScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import AdminApprovalScreen from '../screens/AdminApprovalScreen';
import CommentsScreen from '../screens/CommentsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import FollowListScreen from '../screens/FollowListScreen';
import AdminDistilleryScreen from '../screens/AdminDistilleryScreen';
import EditDistilleryScreen from '../screens/EditDistilleryScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();
const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center' },
});

export default function RootNavigator() {
  const { session, loading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    if (!loading && session) {
      isOnboardingDone().then(done => setOnboardingDone(done));
    } else if (!loading && !session) {
      setOnboardingDone(null); // reset so it's checked fresh after next sign-in
    }
  }, [loading, session]);

  if (loading || (session && onboardingDone === null)) return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#b45309" />
    </View>
  );

  return (
    <Stack.Navigator>
      {session ? (
        <>
          {!onboardingDone && (
            <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
          )}
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="WhiskyDetail" component={WhiskyDetailScreen} options={{ title: 'Whisky' }} />
          <Stack.Screen name="LogDram" component={LogDramScreen} options={{ title: 'Log a Dram' }} />
          <Stack.Screen name="SubmitWhisky" component={SubmitWhiskyScreen} options={{ title: 'Submit Whisky' }} />
          <Stack.Screen name="UserProfile" component={UserProfileScreen} options={{ title: 'Profile' }} />
          <Stack.Screen name="Distillery" component={DistilleryScreen} options={({ route }) => ({ title: route.params.distillery })} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: 'Edit Profile' }} />
          <Stack.Screen name="AdminApproval" component={AdminApprovalScreen} options={{ title: 'Pending Whiskies' }} />
          <Stack.Screen name="Comments" component={CommentsScreen} options={{ title: 'Comments' }} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
          <Stack.Screen name="FollowList" component={FollowListScreen} options={{ title: '' }} />
          <Stack.Screen name="AdminDistillery" component={AdminDistilleryScreen} options={{ title: 'Distilleries' }} />
          <Stack.Screen name="EditDistillery" component={EditDistilleryScreen} options={{ title: 'Distillery' }} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
