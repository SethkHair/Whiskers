import { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';

type ToastType = 'success' | 'error';

interface Props {
  message: string;
  type?: ToastType;
  onDone: () => void;
}

export default function Toast({ message, type = 'success', onDone }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(onDone);
  }, []);

  return (
    <Animated.View style={[styles.toast, type === 'error' ? styles.error : styles.success, { opacity }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 100,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    zIndex: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  success: { backgroundColor: '#b45309' },
  error: { backgroundColor: '#dc2626' },
  text: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
