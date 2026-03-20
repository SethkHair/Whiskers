import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FLAVOR_CATEGORIES } from '../constants/badges';

interface Props {
  selected: string[];
  onToggle: (tag: string) => void;
}

export default function FlavorWheel({ selected, onToggle }: Props) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  function toggleCategory(id: string) {
    setOpenCategory(prev => (prev === id ? null : id));
  }

  return (
    <View>
      <View style={styles.grid}>
        {FLAVOR_CATEGORIES.map(cat => {
          const activeCount = cat.tags.filter(t => selected.includes(t)).length;
          const isOpen = openCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.cell, { backgroundColor: cat.color }, isOpen && styles.cellOpen]}
              onPress={() => toggleCategory(cat.id)}
              activeOpacity={0.75}
            >
              <Text style={styles.emoji}>{cat.emoji}</Text>
              <Text style={styles.cellLabel}>{cat.label}</Text>
              {activeCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{activeCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {openCategory && (() => {
        const cat = FLAVOR_CATEGORIES.find(c => c.id === openCategory)!;
        return (
          <View style={[styles.tagPanel, { borderColor: cat.color }]}>
            <Text style={styles.tagPanelTitle}>{cat.emoji} {cat.label}</Text>
            <View style={styles.tagRow}>
              {cat.tags.map(tag => {
                const active = selected.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    style={[styles.tag, active && { backgroundColor: cat.color, borderColor: cat.color }]}
                    onPress={() => onToggle(tag)}
                  >
                    <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })()}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cell: {
    width: '31%',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    position: 'relative',
  },
  cellOpen: {
    opacity: 1,
    borderWidth: 2,
    borderColor: '#f9fafb',
  },
  emoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  cellLabel: {
    color: '#f9fafb',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#b45309',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  tagPanel: {
    marginTop: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
  },
  tagPanelTitle: {
    color: '#f9fafb',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 10,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    backgroundColor: '#1f2937',
  },
  tagText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  tagTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
});
