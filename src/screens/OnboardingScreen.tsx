import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as SecureStore from 'expo-secure-store';
import { RootStackParamList } from '../types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export const ONBOARDING_KEY = 'whiskers_onboarding_done';

export async function markOnboardingDone() {
  if (Platform.OS === 'web') {
    localStorage.setItem(ONBOARDING_KEY, 'true');
  } else {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
  }
}

export async function isOnboardingDone(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(ONBOARDING_KEY) === 'true';
  }
  return (await SecureStore.getItemAsync(ONBOARDING_KEY)) === 'true';
}

const SLIDES = [
  {
    emoji: '🥃',
    title: 'Welcome to Whiskers',
    body: 'Your personal whisky journal. Log every dram, track your collection, and share your journey.',
  },
  {
    emoji: '📝',
    title: 'Log your drams',
    body: 'Rate whiskies, capture nose, palate and finish notes, and build a tasting history you can look back on.',
  },
  {
    emoji: '🍾',
    title: 'Build your collection',
    body: "Track what's in your cabinet, what you've had, and what's on your wish list.",
  },
  {
    emoji: '👥',
    title: 'Follow friends',
    body: "See what others are drinking, like their drams, leave comments, and discover new bottles through people you trust.",
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation<Nav>();
  const [slide, setSlide] = useState(0);
  const isLast = slide === SLIDES.length - 1;

  async function finish() {
    await markOnboardingDone();
    navigation.replace('Main');
  }

  function next() {
    if (isLast) {
      finish();
    } else {
      setSlide(s => s + 1);
    }
  }

  const { emoji, title, body } = SLIDES[slide];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>{emoji}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>

      {/* Dot indicators */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === slide && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        {slide > 0 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => setSlide(s => s - 1)}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ flex: 1 }} />
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={next} accessibilityLabel={isLast ? 'Get started' : 'Next'}>
          <Text style={styles.nextText}>{isLast ? 'Get Started' : 'Next →'}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.skipBtn} onPress={finish}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emoji: { fontSize: 72, marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', color: '#f9fafb', textAlign: 'center', marginBottom: 16 },
  body: { fontSize: 17, color: '#9ca3af', textAlign: 'center', lineHeight: 26 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#374151' },
  dotActive: { backgroundColor: '#b45309', width: 24 },
  footer: { flexDirection: 'row', paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
  backBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  backText: { color: '#9ca3af', fontSize: 16, fontWeight: '600' },
  nextBtn: { flex: 2, backgroundColor: '#b45309', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', paddingBottom: 32 },
  skipText: { color: '#6b7280', fontSize: 14 },
});
