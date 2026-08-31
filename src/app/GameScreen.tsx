import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { GameInput } from '../game/core/GameRuntime';
import type { GameState } from '../game/core/GameState';
import { ROOMS, ROOM_IDS } from '../game/core/World';
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
  const roomIndex = ROOM_IDS.indexOf(gameState.roomId);
  const keyCollectedRef = useRef(Boolean(gameState.flags.bedroomKeyCollected));
  const [showPickupToast, setShowPickupToast] = useState(false);

  useEffect(() => {
    const collected = Boolean(gameState.flags.bedroomKeyCollected);
    if (!keyCollectedRef.current && collected) {
      setShowPickupToast(true);
      const timer = setTimeout(() => setShowPickupToast(false), 1400);
      keyCollectedRef.current = collected;
      return () => clearTimeout(timer);
    }
    keyCollectedRef.current = collected;
    return undefined;
  }, [gameState.flags.bedroomKeyCollected]);

  const left = <Control testID="move-left-button" label="◀" onPress={() => onInput('left')} />;
  const right = <Control testID="move-right-button" label="▶" onPress={() => onInput('right')} />;

  return (
    <View testID="game-screen" style={styles.container}>
      <View style={[styles.gameFrame, { width: viewport + 8 }]}>
        <RetroHud gameState={gameState} />
        <View style={styles.roomStrip}>
          <Text style={styles.room}>{room.label.toUpperCase()}</Text>
          <View style={styles.progressDots} accessibilityLabel={`Room ${roomIndex + 1} of ${ROOM_IDS.length}`}>
            {ROOM_IDS.map((roomId, index) => (
              <View key={roomId} style={[styles.progressDot, index === roomIndex && styles.progressDotActive, index < roomIndex && styles.progressDotDone]} />
            ))}
          </View>
          <Text style={styles.roomCode}>{gameState.roomId}</Text>
        </View>
        <View>
          <GameCanvas gameState={gameState} size={viewport} />
          {showPickupToast && (
            <View testID="key-collected-toast" style={styles.toast}>
              <Text style={styles.toastText}>+ KEY COLLECTED</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.controls}>
        {touchControlLayout === 'standard' ? left : right}
        <Control testID="action-button" label="ACTION" wide onPress={() => onInput('action')} />
        {touchControlLayout === 'standard' ? right : left}
      </View>

      <Text style={styles.hint}>
        {gameState.flags.verticalSliceReached ? 'V1 SLICE COMPLETE' : 'EXPLORE · COLLECT · UNLOCK'}
      </Text>
    </View>
  );
}

function Control({ testID, label, onPress, wide = false }: { testID: string; label: string; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.control,
        wide && styles.controlWide,
        pressed && styles.controlPressed,
      ]}
    >
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#07060b', padding: 16 },
  gameFrame: { alignItems: 'center', overflow: 'hidden', backgroundColor: RETRO_PALETTE.void, borderWidth: 4, borderColor: RETRO_PALETTE.yellowDark },
  roomStrip: {
    width: '100%',
    minHeight: 30,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: RETRO_PALETTE.panelRaised,
    borderBottomWidth: 2,
    borderBottomColor: RETRO_PALETTE.purpleDark,
  },
  room: { color: RETRO_PALETTE.ink, fontFamily: 'monospace', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  roomCode: { color: RETRO_PALETTE.magenta, fontFamily: 'monospace', fontSize: 8, fontWeight: '900' },
  progressDots: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  progressDot: { width: 6, height: 6, borderWidth: 1, borderColor: RETRO_PALETTE.purple, backgroundColor: RETRO_PALETTE.shadow },
  progressDotDone: { backgroundColor: RETRO_PALETTE.cyanDark, borderColor: RETRO_PALETTE.cyan },
  progressDotActive: { width: 8, height: 8, backgroundColor: RETRO_PALETTE.yellow, borderColor: RETRO_PALETTE.yellowDark },
  toast: {
    position: 'absolute',
    top: 8,
    alignSelf: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: RETRO_PALETTE.yellowDark,
    borderBottomWidth: 4,
    backgroundColor: RETRO_PALETTE.panel,
  },
  toastText: { color: RETRO_PALETTE.yellow, fontFamily: 'monospace', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  controls: { flexDirection: 'row', gap: 10 },
  control: {
    width: 74,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderColor: RETRO_PALETTE.cyanDark,
    backgroundColor: RETRO_PALETTE.panelRaised,
  },
  controlWide: { width: 110, borderColor: RETRO_PALETTE.magentaDark },
  controlPressed: { transform: [{ translateX: 2 }, { translateY: 3 }], borderRightWidth: 3, borderBottomWidth: 3, opacity: 0.78 },
  controlText: { color: RETRO_PALETTE.ink, fontFamily: 'monospace', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  hint: { color: RETRO_PALETTE.purple, fontFamily: 'monospace', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
});
