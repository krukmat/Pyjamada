import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

export type RoomTransitionPhase = 'idle' | 'fade-out' | 'fade-in';

export function RoomTransitionOverlay({ phase }: { phase: RoomTransitionPhase }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (phase === 'idle') {
      opacity.stopAnimation();
      opacity.setValue(0);
      return;
    }
    if (phase === 'fade-out') {
      opacity.stopAnimation();
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
      return;
    }

    opacity.stopAnimation();
    opacity.setValue(1);
    Animated.timing(opacity, {
      toValue: 0,
      duration: 190,
      useNativeDriver: true,
    }).start();
  }, [opacity, phase]);

  return <Animated.View pointerEvents="none" testID="room-transition-overlay" style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]} />;
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: '#070816',
    zIndex: 100,
  },
});
