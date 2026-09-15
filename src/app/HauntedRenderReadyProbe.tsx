import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const SETTLE_MS = 500;

type Props = {
  scenarioKey: string;
  assetsReady: boolean;
};

// Screenshot-build-only probe. `assetsReady` is supplied by the same Skia
// images that GameCanvas renders, so this marker cannot race a second set of
// useImage hooks. Once both actor atlases are decoded we wait a few frames and
// expose a non-collapsible native node that Maestro can reliably observe.
export function HauntedRenderReadyProbe({ scenarioKey, assetsReady }: Props) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setSettled(false);
    if (!assetsReady) return undefined;
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [assetsReady, scenarioKey]);

  if (!assetsReady || !settled) return null;

  return (
    <View
      testID="haunted-render-ready"
      accessibilityLabel="haunted render ready"
      accessible
      collapsable={false}
      importantForAccessibility="yes"
      pointerEvents="none"
      style={styles.probe}
    >
      <Text style={styles.probeText}>R</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Keep a real native/accessibility node in-bounds. Foreground and background
  // intentionally match the screen chrome so the marker is visually inert.
  probe: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 8,
    height: 8,
    zIndex: 2000,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171526',
  },
  probeText: {
    color: '#171526',
    fontSize: 1,
    lineHeight: 1,
  },
});
