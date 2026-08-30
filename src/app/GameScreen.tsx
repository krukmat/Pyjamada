import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { GameInput } from '../game/core/GameRuntime';
import type { GameState } from '../game/core/GameState';
import { ROOMS } from '../game/core/World';
import { GameCanvas } from '../game/render/GameCanvas';
import { RETRO_PALETTE } from '../game/render/VisualLanguage';
import type { TouchControlLayout } from '../settings/core/GameSettings';
import { RetroHud } from './RetroHud';

type Props = {
  gameState: GameState;
  touchControlLayout: TouchControlLayout;
  onInput: (input: GameInput) => void;
};

export function GameScreen({ gameState, touchControlLayout, onInput }: Props) {
  const { width } = useWindowDimensions();
  const viewport = Math.min(384, Math.max(128, Math.floor((width - 32) / 128) * 128));
  const room = ROOMS[gameState.roomId];

  const left = <Control label="◀" onPress={() => onInput('left')} />;
  const right = <Control label="▶" onPress={() => onInput('right')} />;

  return (
    <View style={styles.container}>
      <View style={[styles.gameFrame, { width: viewport + 8 }]}>
        <RetroHud gameState={gameState} />
        <View style={styles.roomStrip}>
          <Text style={styles.room}>{room.label.toUpperCase()}</Text>
          <Text style={styles.roomCode}>{gameState.roomId}</Text>
        </View>
        <GameCanvas gameState={gameState} size={viewport} />
      </View>

      <View style={styles.controls}>
        {touchControlLayout === 'standard' ? left : right}
        <Control label="ACTION" wide onPress={() => onInput('action')} />
        {touchControlLayout === 'standard' ? right : left}
      </View>

      <Text style={styles.hint}>
        {gameState.flags.verticalSliceReached ? 'V1 SLICE COMPLETE' : 'EXPLORE · COLLECT · UNLOCK'}
      </Text>
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
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    backgroundColor: '#07060b',
    padding: 16,
  },
  gameFrame: {
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: RETRO_PALETTE.void,
    borderWidth: 4,
    borderColor: RETRO_PALETTE.yellow,
  },
  roomStrip: {
    width: '100%',
    minHeight: 26,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171326',
    borderBottomWidth: 2,
    borderBottomColor: RETRO_PALETTE.purple,
  },
  room: {
    color: RETRO_PALETTE.ink,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  roomCode: {
    color: RETRO_PALETTE.magenta,
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '900',
  },
  controls: { flexDirection: 'row', gap: 10 },
  control: {
    width: 76,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: RETRO_PALETTE.cyan,
    backgroundColor: '#171326',
  },
  controlWide: { width: 106, borderColor: RETRO_PALETTE.magenta },
  controlPressed: { opacity: 0.55, transform: [{ translateY: 2 }] },
  controlText: {
    color: RETRO_PALETTE.ink,
    fontFamily: 'monospace',
    fontSize: 15,
    fontWeight: '900',
  },
  hint: {
    color: RETRO_PALETTE.purple,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
});
