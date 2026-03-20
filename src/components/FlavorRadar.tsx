import { View, Text } from 'react-native';
import { FLAVOR_CATEGORIES } from '../constants/badges';

const SIZE = 260;
const CENTER = SIZE / 2;
const MAX_R = 82;
const LABEL_OFFSET = 20;
const RINGS = [0.33, 0.66, 1.0];

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

// 6 axes, starting at top (-90°), going clockwise every 60°
const AXIS_ANGLES = FLAVOR_CATEGORIES.map((_, i) => -90 + i * 60);

function polarToXY(angleIdx: number, r: number) {
  const a = toRad(AXIS_ANGLES[angleIdx]);
  return { x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) };
}

// Returns style props for a 1px line from (x1,y1) to (x2,y2)
function lineStyle(x1: number, y1: number, x2: number, y2: number, color = '#374151', thickness = 1) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  return {
    position: 'absolute' as const,
    width: length,
    height: thickness,
    left: mx - length / 2,
    top: my - thickness / 2,
    backgroundColor: color,
    borderRadius: thickness,
    transform: [{ rotate: `${angle}deg` }],
  };
}

interface Props {
  /** One score (0–1) per FLAVOR_CATEGORIES entry, in order */
  scores: number[];
  checkinCount: number;
}

export default function FlavorRadar({ scores, checkinCount }: Props) {
  return (
    <View>
      <View style={{ width: SIZE, height: SIZE, alignSelf: 'center', position: 'relative' }}>

        {/* Concentric rings */}
        {RINGS.map(r => {
          const rad = r * MAX_R;
          return (
            <View
              key={r}
              style={{
                position: 'absolute',
                width: rad * 2,
                height: rad * 2,
                left: CENTER - rad,
                top: CENTER - rad,
                borderRadius: rad,
                borderWidth: 1,
                borderColor: '#374151',
              }}
            />
          );
        })}

        {/* Axis spokes */}
        {AXIS_ANGLES.map((_, i) => {
          const ep = polarToXY(i, MAX_R);
          return <View key={`axis-${i}`} style={lineStyle(CENTER, CENTER, ep.x, ep.y)} />;
        })}

        {/* Data needles */}
        {FLAVOR_CATEGORIES.map((cat, i) => {
          const score = Math.max(0, Math.min(1, scores[i] ?? 0));
          if (score < 0.01) return null;
          const ep = polarToXY(i, score * MAX_R);
          return (
            <View key={`needle-${cat.id}`} style={lineStyle(CENTER, CENTER, ep.x, ep.y, cat.color, 3)} />
          );
        })}

        {/* Center dot */}
        <View style={{
          position: 'absolute',
          width: 8, height: 8,
          borderRadius: 4,
          backgroundColor: '#f59e0b',
          left: CENTER - 4, top: CENTER - 4,
          zIndex: 2,
        }} />

        {/* Endpoint dots */}
        {FLAVOR_CATEGORIES.map((cat, i) => {
          const score = Math.max(0, Math.min(1, scores[i] ?? 0));
          if (score < 0.01) return null;
          const ep = polarToXY(i, score * MAX_R);
          return (
            <View key={`dot-${cat.id}`} style={{
              position: 'absolute',
              width: 10, height: 10,
              borderRadius: 5,
              backgroundColor: cat.color,
              borderWidth: 2,
              borderColor: '#f9fafb',
              left: ep.x - 5, top: ep.y - 5,
              zIndex: 2,
            }} />
          );
        })}

        {/* Labels */}
        {FLAVOR_CATEGORIES.map((cat, i) => {
          const ep = polarToXY(i, MAX_R + LABEL_OFFSET);
          const labelWidth = 68;
          // Determine horizontal alignment based on which side of center
          const angle = AXIS_ANGLES[i];
          const normalized = ((angle % 360) + 360) % 360;
          const textAlign: 'left' | 'right' | 'center' =
            normalized > 10 && normalized < 170 ? 'left'
            : normalized > 190 && normalized < 350 ? 'right'
            : 'center';
          const left =
            textAlign === 'center' ? ep.x - labelWidth / 2
            : textAlign === 'left' ? ep.x - 6
            : ep.x - labelWidth + 6;
          return (
            <View key={`label-${cat.id}`} style={{ position: 'absolute', left, top: ep.y - 11, width: labelWidth }}>
              <Text style={{ color: '#9ca3af', fontSize: 10, fontWeight: '600', textAlign }}>
                {cat.emoji} {cat.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Score bars legend below the chart */}
      <View style={{ marginTop: 4, gap: 6 }}>
        {FLAVOR_CATEGORIES.map((cat, i) => {
          const score = Math.max(0, Math.min(1, scores[i] ?? 0));
          const pct = Math.round(score * 100);
          if (pct === 0) return null;
          return (
            <View key={cat.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ width: 16, fontSize: 12 }}>{cat.emoji}</Text>
              <View style={{ flex: 1, height: 4, backgroundColor: '#1f2937', borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ width: `${pct}%`, height: 4, backgroundColor: cat.color, borderRadius: 2 }} />
              </View>
              <Text style={{ color: '#6b7280', fontSize: 11, width: 32, textAlign: 'right' }}>{pct}%</Text>
            </View>
          );
        })}
      </View>
      <Text style={{ color: '#4b5563', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
        Based on {checkinCount} dram{checkinCount !== 1 ? 's' : ''} with flavor notes
      </Text>
    </View>
  );
}
