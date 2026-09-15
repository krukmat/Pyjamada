import React, { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

const SETTLE_MS = 650;

type Props = {
  scenarioKey: string;
  assetsReady: boolean;
};

// Screenshot-build-only probe. Haunted actors now have synchronous Skia
// fallbacks, so screenshot readiness no longer depends on asynchronous atlas
// decoding. The marker means the selected scenario has been mounted and given
// enough time to commit several frames. `assetsReady` is kept as diagnostic
// metadata so failures can distinguish atlas vs fallback rendering.
export function HauntedRenderReadyProbe({ scenarioKey, assetsReady }: Props) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setSettled(false);
    const timer = setTimeout(() => setSettled(true), SETTLE_MS);
    return () => clearTimeout(timer);
  }, [scenarioKey]);

  if (!settled) return null;

  return (
    <Text
      testID="haunted-render-ready"
      accessibilityLabel="haunted render ready"
      accessibilityValue={{ text: assetsReady ? 'atlas' : 'fallback' }}
      accessible
      importantForAccessibility="yes"
      pointerEvents="none"
      style={styles.probe}
    >
      READY
    </Text>
  );
}

const styles = StyleSheet.create({
  // A real Text node with meaningful bounds is much more reliable in Maestro's
  // Android hierarchy than a tiny empty View. Foreground/background match the
  // game chrome, making it effectively invisible in captured screenshots.
  probe: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 34,
    height: 14,
    zIndex: 2000,
    color: '#171526',
    backgroundColor: '#171526',
    fontSize: 8,
    lineHeight: 12,
    textAlign: 'center',
  },
});
