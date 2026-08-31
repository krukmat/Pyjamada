import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GameCanvas } from '../game/render/GameCanvas';
import { RETRO_PALETTE } from '../game/render/VisualLanguage';
import { findSystemicObject } from '../game/systemic/SystemicContent';
import type { SystemicInput, SystemicRunState } from '../game/systemic/SystemicState';
import type { TouchControlLayout } from '../settings/core/GameSettings';
import { PixelMeter } from './RetroUiKit';

type Props = {
  state: SystemicRunState;
  touchControlLayout: TouchControlLayout;
  onInput: (input: SystemicInput) => void;
  onRestart: () => void;
  onExit: () => void;
};

export function GameScreen({ state, touchControlLayout, onInput, onRestart, onExit }: Props) {
  const { width } = useWindowDimensions();
  const viewport = Math.min(384, Math.max(128, Math.floor((width - 32) / 128) * 128));
  const target = findSystemicObject(state.player.x);
  const done = state.objective.status !== 'active';
  const left = <Control testID="move-left-button" label="◀" onPress={() => onInput('left')} />;
  const right = <Control testID="move-right-button" label="▶" onPress={() => onInput('right')} />;

  return (
    <View testID="game-screen" style={styles.container}>
      <View style={[styles.gameFrame, { width: viewport + 8 }]}>
        <View style={styles.hud}>
          <Stat label="TIME" value={String(state.timeSpent)} />
          <ResourceStat label="ENERGY" value={state.energy} max={100} accent={RETRO_PALETTE.green} />
          <ResourceStat label="NOISE" value={state.noise} max={100} accent={RETRO_PALETTE.red} />
          <Stat label="WALLY" value={state.wallyState.toUpperCase()} />
        </View>
        <View style={styles.objectiveStrip}>
          <Text style={styles.objective}>GET DRESSED + FIND KEYS</Text>
          <Text style={styles.nearby}>{target ? `NEAR: ${target.label}` : 'NEAR: —'}</Text>
        </View>
        <GameCanvas state={state} size={viewport} />
      </View>

      <View style={styles.feedbackBox}>
        <Text testID="game-reaction" style={styles.reaction}>{reactionFor(state)}</Text>
        <Text style={styles.delta}>{deltaFor(state)}</Text>
        {state.lastAction?.ruleTrace.length ? <Text style={styles.trace}>RULES: {state.lastAction.ruleTrace.join(' → ')}</Text> : null}
      </View>

      {!done ? (
        <View style={styles.controls}>
          {touchControlLayout === 'standard' ? left : right}
          <Control testID="action-button" label="ACTION" wide onPress={() => onInput('action')} />
          {touchControlLayout === 'standard' ? right : left}
        </View>
      ) : (
        <Pressable testID="restart-button" style={({ pressed }: { pressed: boolean }) => [styles.secondaryButton, styles.restart, pressed && styles.pressed]} onPress={onRestart}>
          <Text style={styles.buttonText}>TRY AGAIN</Text>
        </Pressable>
      )}

      <Pressable testID="exit-button" style={({ pressed }: { pressed: boolean }) => [styles.secondaryButton, pressed && styles.pressed]} onPress={onExit}>
        <Text style={styles.buttonText}>BACK TO MENU</Text>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

function ResourceStat({ label, value, max, accent }: { label: string; value: number; max: number; accent: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.resourceHeader}><Text style={styles.statLabel}>{label}</Text><Text style={styles.resourceValue}>{value}</Text></View>
      <PixelMeter value={value / max} segments={5} accent={accent} />
    </View>
  );
}

function Control({ testID, label, onPress, wide = false }: { testID: string; label: string; onPress: () => void; wide?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }: { pressed: boolean }) => [styles.control, wide && styles.controlWide, pressed && styles.pressed]}>
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}

function reactionFor(state: SystemicRunState): string {
  if (state.objective.status === 'completed') return 'READY! Wally has the keys and is dressed. One clean escape.';
  if (state.objective.status === 'failed') {
    if (state.objective.reason === 'house-awake') return 'CHAOS. Too much noise. Wally knows exactly what went wrong.';
    if (state.objective.reason === 'too-late') return 'TOO LATE. A faster route is hiding in the same room.';
    return 'EXHAUSTED. Wally needs a less heroic morning routine.';
  }
  const id = state.lastAction?.objectId;
  if (id === 'bed') return 'Five more minutes. A suspiciously effective strategy.';
  if (id === 'alarm-clock' && state.wallyState === 'startled') return 'THE ALARM AGAIN? Wally is now operating on panic.';
  if (id === 'alarm-clock') return 'Awake instantly. Quietly? Not remotely.';
  if (id === 'slippers') return 'Stealth slippers equipped. Domestic technology at its finest.';
  if (id === 'wardrobe') return 'Dressed. Coordination remains optional.';
  if (id === 'window') return state.flags.windowOpen ? 'Fresh air. Unfortunately, every sound now travels.' : 'Window closed. The house forgives nothing.';
  if (id === 'keys') return 'Keys acquired. Now: is Wally actually dressed?';
  if (state.wallyState === 'sleepy') return 'Wally is barely awake. Touch something and see what happens.';
  if (state.wallyState === 'rushed') return 'Clock pressure. Faster decisions now have noisier consequences.';
  if (state.wallyState === 'startled') return 'Wally is startled. Small mistakes are getting expensive.';
  return 'The room is simple. The consequences are not.';
}

function deltaFor(state: SystemicRunState): string {
  const action = state.lastAction;
  if (!action) return 'ACTION → CONSEQUENCE → ADAPT';
  const sign = (value: number) => value > 0 ? `+${value}` : String(value);
  return `Δ TIME ${sign(action.timeDelta)} · ENERGY ${sign(action.energyDelta)} · NOISE ${sign(action.noiseDelta)}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#07060b', padding: 14 },
  gameFrame: { alignItems: 'center', overflow: 'hidden', backgroundColor: RETRO_PALETTE.void, borderWidth: 4, borderColor: RETRO_PALETTE.greenDark },
  hud: { width: '100%', minHeight: 56, flexDirection: 'row', backgroundColor: RETRO_PALETTE.panel, borderBottomWidth: 3, borderBottomColor: RETRO_PALETTE.greenDark },
  stat: { flex: 1, justifyContent: 'center', paddingHorizontal: 5, paddingVertical: 4, borderRightWidth: 1, borderRightColor: RETRO_PALETTE.purpleDark },
  statLabel: { color: RETRO_PALETTE.cyan, fontFamily: 'monospace', fontSize: 7, fontWeight: '900' },
  statValue: { color: RETRO_PALETTE.ink, fontFamily: 'monospace', fontSize: 9, fontWeight: '900', textAlign: 'center', marginTop: 4 },
  resourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  resourceValue: { color: RETRO_PALETTE.yellow, fontFamily: 'monospace', fontSize: 8, fontWeight: '900' },
  objectiveStrip: { width: '100%', minHeight: 34, paddingHorizontal: 8, justifyContent: 'center', backgroundColor: RETRO_PALETTE.panelRaised, borderBottomWidth: 2, borderBottomColor: RETRO_PALETTE.purpleDark },
  objective: { color: RETRO_PALETTE.yellow, fontFamily: 'monospace', fontSize: 10, fontWeight: '900' },
  nearby: { color: RETRO_PALETTE.magenta, fontFamily: 'monospace', fontSize: 8, fontWeight: '900' },
  feedbackBox: { width: '100%', maxWidth: 392, minHeight: 66, padding: 8, borderWidth: 2, borderBottomWidth: 4, borderRightWidth: 4, borderColor: RETRO_PALETTE.purpleDark, backgroundColor: RETRO_PALETTE.panel },
  reaction: { color: RETRO_PALETTE.ink, fontFamily: 'monospace', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  delta: { marginTop: 4, color: RETRO_PALETTE.cyan, fontFamily: 'monospace', fontSize: 9, fontWeight: '900', textAlign: 'center' },
  trace: { marginTop: 3, color: RETRO_PALETTE.purple, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 10 },
  control: { width: 74, height: 54, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderRightWidth: 6, borderBottomWidth: 6, borderColor: RETRO_PALETTE.cyanDark, backgroundColor: RETRO_PALETTE.panelRaised },
  controlWide: { width: 110, borderColor: RETRO_PALETTE.magentaDark },
  pressed: { opacity: 0.78, transform: [{ translateX: 2 }, { translateY: 3 }], borderRightWidth: 3, borderBottomWidth: 3 },
  controlText: { color: RETRO_PALETTE.ink, fontFamily: 'monospace', fontSize: 14, fontWeight: '900' },
  secondaryButton: { minWidth: 190, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRightWidth: 5, borderBottomWidth: 5, borderColor: RETRO_PALETTE.purpleDark, backgroundColor: RETRO_PALETTE.panelRaised, paddingHorizontal: 14 },
  restart: { borderColor: RETRO_PALETTE.yellowDark },
  buttonText: { color: RETRO_PALETTE.ink, fontFamily: 'monospace', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
