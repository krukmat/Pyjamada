import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { PresentationRuntime } from '../game/presentation/PresentationRuntime';
import { selectWallyVisual } from '../game/presentation/WallyAnimator';
import { GameCanvas } from '../game/render/GameCanvas';
import { VISUAL_TOKENS } from '../game/render/VisualLanguage';
import { findSystemicObject } from '../game/systemic/SystemicContent';
import type { SystemicInput, SystemicRunState } from '../game/systemic/SystemicState';
import type { TouchControlLayout } from '../settings/core/GameSettings';
import { PixelMeter } from './RetroUiKit';
import { isTestHooksEnabled } from './testHooks';

type Props = {
  state: SystemicRunState;
  presentationRuntime: PresentationRuntime;
  touchControlLayout: TouchControlLayout;
  onInput: (input: SystemicInput) => void;
  onRestart: () => void;
  onExit: () => void;
};

export function GameScreen({ state, presentationRuntime, touchControlLayout, onInput, onRestart, onExit }: Props) {
  const { width } = useWindowDimensions();
  const viewport = Math.min(384, Math.max(128, Math.floor((width - 32) / 128) * 128));
  const [nowMs, setNowMs] = useState(() => Date.now());
  const target = findSystemicObject(state.player.x);
  const done = state.objective.status !== 'active';
  const activeVisualEvents = presentationRuntime.snapshot();
  const left = <Control testID="move-left-button" label="◀" onPress={() => onInput('left')} />;
  const right = <Control testID="move-right-button" label="▶" onPress={() => onInput('right')} />;

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <View testID="game-screen" style={styles.container}>
      {isTestHooksEnabled() && (
        <Text testID="debug-wally-clip" style={styles.debugHidden} pointerEvents="none">
          {selectWallyVisual(state, activeVisualEvents, nowMs).clipId}
        </Text>
      )}
      <View style={[styles.gameFrame, { width: viewport + 8 }]}>
        <View style={styles.hud}>
          <ArcadeStat label="TIME" value={String(state.timeSpent).padStart(2, '0')} accent={VISUAL_TOKENS.ui.yellow} />
          <ResourceStat label="ENERGY" value={state.energy} max={100} accent={VISUAL_TOKENS.feedback.energy} />
          <ResourceStat label="NOISE" value={state.noise} max={100} accent={VISUAL_TOKENS.feedback.noise} />
        </View>
        <View style={styles.objectiveStrip}>
          <View>
            <Text style={styles.objectiveKicker}>MORNING MISSION</Text>
            <Text style={styles.objective}>GET DRESSED + FIND KEYS</Text>
          </View>
          <View style={[styles.actionPrompt, target && styles.actionPromptActive]}>
            <Text style={[styles.actionPromptText, target && styles.actionPromptTextActive]}>{target ? `ACTION · ${target.label}` : 'MOVE · EXPLORE'}</Text>
          </View>
        </View>
        <GameCanvas state={state} size={viewport} activeVisualEvents={activeVisualEvents} nowMs={nowMs} />
        {done && <OutcomeBanner state={state} />}
      </View>

      <View style={styles.feedbackBox}>
        <Text testID="game-reaction" style={styles.reaction}>{reactionFor(state)}</Text>
        {state.lastAction && state.lastAction.kind !== 'restart' && <Text style={styles.delta}>{compactDeltaFor(state)}</Text>}
      </View>

      {!done ? (
        <View style={styles.controls}>
          {touchControlLayout === 'standard' ? left : right}
          <Control testID="action-button" label="ACTION" wide accent="action" onPress={() => onInput('action')} />
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

function ArcadeStat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

function ResourceStat({ label, value, max, accent }: { label: string; value: number; max: number; accent: string }) {
  return (
    <View style={styles.stat}>
      <View style={styles.resourceHeader}><Text style={styles.statLabel}>{label}</Text><Text style={styles.resourceValue}>{value}</Text></View>
      <PixelMeter value={value / max} segments={6} accent={accent} />
    </View>
  );
}

function OutcomeBanner({ state }: { state: SystemicRunState }) {
  const success = state.objective.status === 'completed';
  const title = success ? 'READY!' : state.objective.reason === 'house-awake' ? 'HOUSE AWAKE!' : state.objective.reason === 'too-late' ? 'TOO LATE!' : 'OUT OF ENERGY!';
  const subtitle = success ? 'DRESSED · KEYS · GO' : 'THE ROOM REMEMBERS YOUR MISTAKES';
  return (
    <View style={[styles.outcomeBanner, success ? styles.outcomeSuccess : styles.outcomeFailure]}>
      <Text style={styles.outcomeTitle}>{title}</Text>
      <Text style={styles.outcomeSubtitle}>{subtitle}</Text>
    </View>
  );
}

function Control({ testID, label, onPress, wide = false, accent = 'move' }: { testID: string; label: string; onPress: () => void; wide?: boolean; accent?: 'move' | 'action' }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }: { pressed: boolean }) => [styles.control, wide && styles.controlWide, accent === 'action' && styles.controlAction, pressed && styles.pressed]}>
      <View style={styles.controlHighlight} />
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}

function reactionFor(state: SystemicRunState): string {
  if (state.objective.status === 'completed') return 'Keys. Clothes. Door. Wally is somehow ready.';
  if (state.objective.status === 'failed') {
    if (state.objective.reason === 'house-awake') return 'Too loud. The whole house knows.';
    if (state.objective.reason === 'too-late') return 'Morning won. Try a sharper route.';
    return 'No energy left. Heroics were a mistake.';
  }
  const id = state.lastAction?.objectId;
  if (id === 'bed') return 'Five more minutes. Surprisingly effective.';
  if (id === 'alarm-clock' && state.wallyState === 'startled') return 'Again?! Panic mode engaged.';
  if (id === 'alarm-clock') return 'Awake. Quiet? Not even close.';
  if (id === 'slippers') return 'Soft steps unlocked.';
  if (id === 'wardrobe') return 'Dressed. Coordination optional.';
  if (id === 'window') return state.flags.windowOpen ? 'Fresh air. Every sound travels farther.' : 'Window shut. Noise stays inside.';
  if (id === 'keys') return 'Keys acquired.';
  if (state.wallyState === 'sleepy') return 'Wally is barely functional.';
  if (state.wallyState === 'rushed') return 'The clock is winning.';
  if (state.wallyState === 'startled') return 'One more mistake could get loud.';
  return 'Ordinary room. Suspicious consequences.';
}

function compactDeltaFor(state: SystemicRunState): string {
  const action = state.lastAction;
  if (!action) return '';
  const parts: string[] = [];
  if (action.energyDelta !== 0) parts.push(`ENERGY ${signed(action.energyDelta)}`);
  if (action.noiseDelta !== 0) parts.push(`NOISE ${signed(action.noiseDelta)}`);
  if (action.timeDelta !== 0) parts.push(`TIME ${signed(action.timeDelta)}`);
  return parts.join(' · ');
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: VISUAL_TOKENS.environment.void, padding: 12 },
  // T-05: real (non-zero) footprint so Android's accessibility layer still
  // reports it as visible — a literally zero-size element risks being
  // reported as not-visible, which would break the Maestro wait this exists
  // to serve. opacity:0 keeps it invisible to a human without affecting that.
  debugHidden: { position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0 },
  gameFrame: { position: 'relative', alignItems: 'center', overflow: 'hidden', backgroundColor: VISUAL_TOKENS.environment.void, borderWidth: 4, borderColor: VISUAL_TOKENS.ui.panelEdge },
  hud: { width: '100%', minHeight: 50, flexDirection: 'row', backgroundColor: VISUAL_TOKENS.ui.panel, borderBottomWidth: 3, borderBottomColor: VISUAL_TOKENS.ui.magentaDark },
  stat: { flex: 1, justifyContent: 'center', paddingHorizontal: 7, paddingVertical: 5, borderRightWidth: 1, borderRightColor: VISUAL_TOKENS.ui.panelEdge },
  statLabel: { color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  statValue: { fontFamily: 'monospace', fontSize: 16, fontWeight: '900', textAlign: 'center', marginTop: 1 },
  resourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  resourceValue: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 8, fontWeight: '900' },
  objectiveStrip: { width: '100%', minHeight: 42, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: VISUAL_TOKENS.ui.panelRaised, borderBottomWidth: 2, borderBottomColor: VISUAL_TOKENS.ui.panelEdge },
  objectiveKicker: { color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 6, fontWeight: '900', letterSpacing: 1 },
  objective: { color: VISUAL_TOKENS.ui.yellow, fontFamily: 'monospace', fontSize: 9, fontWeight: '900' },
  actionPrompt: { minWidth: 82, paddingHorizontal: 7, paddingVertical: 5, borderWidth: 2, borderColor: VISUAL_TOKENS.ui.panelEdge, backgroundColor: VISUAL_TOKENS.ui.panel },
  actionPromptActive: { borderColor: VISUAL_TOKENS.interactive.focus },
  actionPromptText: { color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', textAlign: 'center' },
  actionPromptTextActive: { color: VISUAL_TOKENS.interactive.focusLight },
  feedbackBox: { width: '100%', maxWidth: 392, minHeight: 48, padding: 7, borderWidth: 2, borderRightWidth: 4, borderBottomWidth: 4, borderColor: VISUAL_TOKENS.ui.panelEdge, backgroundColor: VISUAL_TOKENS.ui.panel },
  reaction: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 9, fontWeight: '900', textAlign: 'center' },
  delta: { marginTop: 3, color: VISUAL_TOKENS.ui.cyan, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', textAlign: 'center' },
  outcomeBanner: { position: 'absolute', left: 20, right: 20, bottom: 18, minHeight: 58, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderRightWidth: 6, borderBottomWidth: 6, backgroundColor: 'rgba(12,9,18,0.94)' },
  outcomeSuccess: { borderColor: VISUAL_TOKENS.feedback.success },
  outcomeFailure: { borderColor: VISUAL_TOKENS.feedback.failure },
  outcomeTitle: { color: VISUAL_TOKENS.ui.yellow, fontFamily: 'monospace', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  outcomeSubtitle: { marginTop: 2, color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  controls: { flexDirection: 'row', gap: 10 },
  control: { position: 'relative', width: 74, height: 54, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', borderWidth: 3, borderRightWidth: 6, borderBottomWidth: 6, borderColor: VISUAL_TOKENS.ui.cyanDark, backgroundColor: VISUAL_TOKENS.ui.panelRaised },
  controlWide: { width: 110 },
  controlAction: { borderColor: VISUAL_TOKENS.ui.magentaDark },
  controlHighlight: { position: 'absolute', left: 3, right: 3, top: 3, height: 3, backgroundColor: 'rgba(255,255,255,0.10)' },
  pressed: { opacity: 0.78, transform: [{ translateX: 2 }, { translateY: 3 }], borderRightWidth: 3, borderBottomWidth: 3 },
  controlText: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 14, fontWeight: '900' },
  secondaryButton: { minWidth: 190, minHeight: 38, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRightWidth: 5, borderBottomWidth: 5, borderColor: VISUAL_TOKENS.ui.panelEdge, backgroundColor: VISUAL_TOKENS.ui.panelRaised, paddingHorizontal: 14 },
  restart: { borderColor: VISUAL_TOKENS.ui.yellowDark },
  buttonText: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
