import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { GameInput } from '../game/core/GameRuntime';
import type { GameState } from '../game/core/GameState';
import { ROOMS } from '../game/core/World';
import { GameCanvas } from '../game/render/GameCanvas';
import type { TouchControlLayout } from '../settings/core/GameSettings';

type Props = {
  gameState: GameState;
  touchControlLayout: TouchControlLayout;
  onInput: (input: GameInput) => void;
};

export function GameScreen({ gameState, touchControlLayout, onInput }: Props) {
  const { width } = useWindowDimensions();
  const viewport = Math.min(384, Math.max(128, Math.floor((width - 32) / 128) * 128));
  const room = ROOMS[gameState.roomId];
  const inventory = gameState.inventory.length ? gameState.inventory.join(', ') : 'empty';

  const left = <Control label="◀" onPress={() => onInput('left')} />;
  const right = <Control label="▶" onPress={() => onInput('right')} />;

  return (
    <View style={styles.container}>
      <Text style={styles.room}>{room.label.toUpperCase()} · {gameState.roomId}</Text>
      <View style={styles.viewportFrame}><GameCanvas gameState={gameState} size={viewport} /></View>
      <View style={styles.controls}>
        {touchControlLayout === 'standard' ? left : right}
        <Control label="ACTION" wide onPress={() => onInput('action')} />
        {touchControlLayout === 'standard' ? right : left}
      </View>
      <Text style={styles.debug}>x={gameState.player.x} · inventory={inventory}</Text>
      <Text style={styles.debug}>door={gameState.flags.bedroomDoorUnlocked ? 'unlocked' : 'locked'} · slice={gameState.flags.verticalSliceReached ? 'reached' : 'active'}</Text>
      <Text style={styles.debug}>controls={touchControlLayout}</Text>
    </View>
  );
}

function Control({ label, onPress, wide = false }: { label: string; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [styles.control, wide && styles.controlWide, pressed && styles.controlPressed]}
    >
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#0a0812', padding: 16 },
  room: { color: '#b9abc8', fontWeight: '700', letterSpacing: 2 },
  viewportFrame: { borderWidth: 3, borderColor: '#57406f' },
  controls: { flexDirection: 'row', gap: 12 },
  control: { width: 76, height: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#f6d365', backgroundColor: '#2a2037' },
  controlWide: { width: 104 },
  controlPressed: { opacity: 0.65 },
  controlText: { color: '#fff7d6', fontSize: 16, fontWeight: '900' },
  debug: { color: '#766987', fontSize: 12 },
});
