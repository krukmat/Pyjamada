import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useImage } from '@shopify/react-native-skia';
import { HAUNTED_GHOST_ATLAS_SOURCE, HAUNTED_WALLY_ATLAS_SOURCE } from '../game/presentation/AssetSources';

const SETTLE_MS = 260;

type Props = {
  scenarioKey: string;
};

// Screenshot-build-only probe. It preloads the two actor atlases and exposes a
// small on-screen native node only after both images are decoded and the new
// scenario has had enough time to commit at least a couple of Skia frames.
// Production builds never mount this component.
export function HauntedRenderReadyProbe({ scenarioKey }: Props) {
  const wally = useImage(HAUNTED_WALLY_ATLAS_SOURCE);
  const ghost = useImage(HAUNTED_GHOST_ATLAS_SOURCE);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setSettled(false);
    if (!wally || !ghost) return undefined;
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [ghost, scenarioKey, wally]);

  if (!wally || !ghost || !settled) return null;

  return (
    <View
      testID="haunted-render-ready"
      accessibilityLabel="haunted render ready"
      pointerEvents="none"
      style={styles.probe}
    />
  );
}

const styles = StyleSheet.create({
  // Opaque and on-screen so Maestro's visibility heuristic can see it. The
  // 2x2 patch sits in the app's dark corner and is visually negligible.
  probe: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 2,
    height: 2,
    zIndex: 2000,
    backgroundColor: '#171526',
  },
});
