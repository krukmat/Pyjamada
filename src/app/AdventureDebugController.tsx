import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { RoomId } from '../game/adventure/AdventureState';

type Props = {
  enabled: boolean;
  currentRoom: RoomId;
  onToggleRoom: () => void;
};

export function AdventureDebugController({ enabled, currentRoom, onToggleRoom }: Props) {
  if (!enabled) return null;
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <Pressable
        testID="adventure-room-toggle"
        accessibilityRole="button"
        accessibilityLabel={`Toggle adventure room from ${currentRoom}`}
        onPress={onToggleRoom}
        style={styles.hotspot}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hotspot: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 28,
    height: 28,
    backgroundColor: 'transparent',
    zIndex: 999,
  },
});
