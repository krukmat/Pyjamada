import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RETRO_PALETTE } from '../game/render/VisualLanguage';

export function PixelMeter({ value, segments = 8, accent = RETRO_PALETTE.green }: { value: number; segments?: number; accent?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  const active = Math.round(clamped * segments);
  return (
    <View style={styles.meter}>
      {Array.from({ length: segments }, (_, index) => (
        <View key={index} style={[styles.segment, index < active ? { backgroundColor: accent } : styles.segmentEmpty]} />
      ))}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <View style={styles.sectionLabel}>
      <Text style={styles.sectionText}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  segment: { width: 10, height: 7, borderWidth: 1, borderColor: RETRO_PALETTE.greenDark },
  segmentEmpty: { backgroundColor: RETRO_PALETTE.shadow, borderColor: RETRO_PALETTE.purpleDark },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  sectionText: { color: RETRO_PALETTE.cyan, fontFamily: 'monospace', fontWeight: '900', fontSize: 9, letterSpacing: 2 },
  sectionRule: { flex: 1, height: 2, backgroundColor: RETRO_PALETTE.purpleDark },
});
