import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { VISUAL_TOKENS } from '../game/render/VisualLanguage';

export function PixelMeter({ value, segments = 8, accent = VISUAL_TOKENS.feedback.energy }: { value: number; segments?: number; accent?: string }) {
  const clamped = Math.max(0, Math.min(1, value));
  const active = Math.round(clamped * segments);
  return (
    <View style={styles.meter}>
      {Array.from({ length: segments }, (_, index) => (
        <View key={index} style={[styles.segment, index < active ? { backgroundColor: accent, borderColor: accent } : styles.segmentEmpty]} />
      ))}
    </View>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return (
    <View style={styles.sectionLabel}>
      <View style={styles.sectionMarker} />
      <Text style={styles.sectionText}>{children}</Text>
      <View style={styles.sectionRule} />
    </View>
  );
}

const styles = StyleSheet.create({
  meter: { flexDirection: 'row', gap: 3, alignItems: 'center', flexShrink: 1 },
  segment: { width: 10, height: 7, borderWidth: 1 },
  segmentEmpty: { backgroundColor: VISUAL_TOKENS.actor.outline, borderColor: VISUAL_TOKENS.ui.panelEdge },
  sectionLabel: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 5 },
  sectionMarker: { width: 5, height: 5, backgroundColor: VISUAL_TOKENS.interactive.focus },
  sectionText: { color: VISUAL_TOKENS.ui.cyan, fontFamily: 'monospace', fontWeight: '900', fontSize: 9, letterSpacing: 2 },
  sectionRule: { flex: 1, height: 2, backgroundColor: VISUAL_TOKENS.ui.panelEdge },
});
