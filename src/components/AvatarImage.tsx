import { View, Text, Image, StyleSheet } from 'react-native';

interface Props {
  uri: string | null | undefined;
  name: string;
  size?: number;
}

export default function AvatarImage({ uri, name, size = 48 }: Props) {
  const initial = (name?.[0] ?? '?').toUpperCase();
  const radius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: radius }}
        accessibilityLabel={`${name}'s profile photo`}
      />
    );
  }

  return (
    <View style={[styles.placeholder, { width: size, height: size, borderRadius: radius }]}>
      <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: { backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  initial: { color: '#f9fafb', fontWeight: '700' },
});
