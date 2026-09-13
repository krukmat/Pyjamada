import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { PresentationRuntime } from '../game/presentation/PresentationRuntime';
import { selectWallyVisual } from '../game/presentation/WallyAnimator';
import { GameCanvas } from '../game/render/GameCanvas';
import { stageDimensionsForScreenWidth } from '../game/render/StageViewport';
import { SCENE_TOKENS, VISUAL_TOKENS } from '../game/render/VisualLanguage';
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
  const viewport = stageDimensionsForScreenWidth(width);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const target = findSystemicObject(state.player.x);
  const done = state.objective.status !== 'active';
  const activeVisualEvents = presentationRuntime.snapshot();

  // T-05: transient actor clips live for less time than the Android hierarchy
  // dump round-trip. The test hook therefore latches the latest non-idle clip
  // until the next input without changing presentation or gameplay timing.
  const lastTransientClipRef = useRef<string | null>(null);
  const liveClipId = isTestHooksEnabled() ? selectWallyVisual(state, activeVisualEvents, nowMs).clipId : null;
  if (liveClipId !== null && !liveClipId.startsWith('idle')) {
    lastTransientClipRef.current = liveClipId;
  }
  const debugClipId = lastTransientClipRef.current ?? liveClipId;

  const handleInput = (input: SystemicInput) => {
    lastTransientClipRef.current = null;
    onInput(input);
  };
  const left = <Control testID="move-left-button" label="◀" onPress={() => handleInput('left')} />;
  const right = <Control testID="move-right-button" label="▶" onPress={() => handleInput('right')} />;

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <View testID="game-screen" style={styles.container}>
      {isTestHooksEnabled() && (
        <Text testID="debug-wally-clip" style={styles.debugHidden}>
          {debugClipId}
        </Text>
      )}

      <View style={[styles.gameFrame, { width: viewport.width }]}>
        <GameCanvas
          state={state}
          width={viewport.width}
          height={viewport.height}
          activeVisualEvents={activeVisualEvents}
          nowMs={nowMs}
        />

        <View pointerEvents="none" style={styles.sceneHud}>
          <View style={styles.missionBlock}>
            <Text style={styles.objectiveKicker}>MORNING RUN</Text>
            <Text style={styles.objective}>GET DRESSED + FIND KEYS</Text>
          </View>
          <View style={styles.statsBlock}>
            <ArcadeStat label="TIME" value={String(state.timeSpent).padStart(2, '0')} accent={VISUAL_TOKENS.ui.yellow} />
            <ResourceStat label="ENERGY" value={state.energy} max={100} accent={VISUAL_TOKENS.feedback.energy} />
            <ResourceStat label="NOISE" value={state.noise} max={100} accent={VISUAL_TOKENS.feedback.noise} />
          </View>
        </View>

        {!done && target && (
          <View pointerEvents="none" style={styles.actionPrompt}>
            <Text style={styles.actionPromptText}>ACTION · {target.label}</Text>
          </View>
        )}

        {done && <OutcomeBanner state={state} />}
      </View>

      <View style={[styles.feedbackBox, { maxWidth: viewport.width }]}>
        <Text testID="game-reaction" style={styles.reaction}>{reactionFor(state)}</Text>
        {state.lastAction && state.lastAction.kind !== 'restart' && <Text style={styles.delta}>{compactDeltaFor(state)}</Text>}
      </View>

      {!done ? (
        <View style={styles.controls}>
          {touchControlLayout === 'standard' ? left : right}
          <Control testID="action-button" label="ACTION" wide accent="action" onPress={() => handleInput('action')} />
          {touchControlLayout === 'standard' ? right : left}
        </View>
      ) : (
        <Pressable
          testID="restart-button"
          style={({ pressed }: { pressed: boolean }) => [styles.secondaryButton, styles.restart, pressed && styles.pressed]}
          onPress={onRestart}
        >
          <Text style={styles.buttonText}>TRY AGAIN</Text>
        </Pressable>
      )}

      <Pressable
        testID="exit-button"
        style={({ pressed }: { pressed: boolean }) => [styles.exitButton, pressed && styles.pressed]}
        onPress={onExit}
      >
        <Text style={styles.exitText}>BACK TO MENU</Text>
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
      <View style={styles.resourceHeader}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.resourceValue}>{value}</Text>
      </View>
      <PixelMeter value={value / max} segments={4} accent={accent} />
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
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.control,
        wide && styles.controlWide,
        accent === 'action' && styles.controlAction,
        pressed && styles.pressed,
      ]}
    >
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
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SCENE_TOKENS.foreground,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  debugHidden: { position: 'absolute', top: 0, left: 0, width: 4, height: 4, opacity: 0.01 },
  gameFrame: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: SCENE_TOKENS.trimDark,
    borderRadius: 12,
    backgroundColor: SCENE_TOKENS.skyDeep,
  },
  sceneHud: {
    position: 'absolute',
    top: 7,
    left: 7,
    right: 7,
    minHeight: 41,
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 7,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,223,177,0.20)',
    borderRadius: 12,
    backgroundColor: 'rgba(46,37,50,0.78)',
  },
  missionBlock: { flex: 1.15, justifyContent: 'center' },
  objectiveKicker: { color: SCENE_TOKENS.sunrise, fontFamily: 'monospace', fontSize: 6, fontWeight: '800', letterSpacing: 1 },
  objective: { marginTop: 1, color: '#fff0c9', fontFamily: 'monospace', fontSize: 7, fontWeight: '900' },
  statsBlock: { flex: 1.75, flexDirection: 'row', gap: 5 },
  stat: { flex: 1, justifyContent: 'center', minWidth: 0 },
  statLabel: { color: '#c9bdba', fontFamily: 'monospace', fontSize: 5, fontWeight: '900', letterSpacing: 0.4 },
  statValue: { fontFamily: 'monospace', fontSize: 12, fontWeight: '900', textAlign: 'center' },
  resourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  resourceValue: { color: '#f5e9d2', fontFamily: 'monospace', fontSize: 6, fontWeight: '900' },
  actionPrompt: {
    position: 'absolute',
    bottom: 8,
    left: '29%',
    right: '29%',
    minHeight: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,240,154,0.62)',
    borderRadius: 12,
    backgroundColor: 'rgba(46,37,50,0.76)',
  },
  actionPromptText: { color: '#fff0c9', fontFamily: 'monospace', fontSize: 7, fontWeight: '900', textAlign: 'center' },
  feedbackBox: {
    width: '100%',
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 11,
    backgroundColor: 'rgba(31,24,34,0.86)',
  },
  reaction: { color: '#f5e9d2', fontFamily: 'monospace', fontSize: 8, fontWeight: '800', textAlign: 'center' },
  delta: { marginTop: 2, color: SCENE_TOKENS.sunrise, fontFamily: 'monospace', fontSize: 6, fontWeight: '900', textAlign: 'center' },
  outcomeBanner: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 16,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderRadius: 16,
    backgroundColor: 'rgba(42,31,42,0.92)',
  },
  outcomeSuccess: { borderColor: VISUAL_TOKENS.feedback.success },
  outcomeFailure: { borderColor: VISUAL_TOKENS.feedback.failure },
  outcomeTitle: { color: '#fff0c9', fontFamily: 'monospace', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  outcomeSubtitle: { marginTop: 2, color: '#e8d7c0', fontFamily: 'monospace', fontSize: 7, fontWeight: '800', letterSpacing: 1 },
  controls: { flexDirection: 'row', gap: 9 },
  control: {
    position: 'relative',
    width: 68,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(186,213,199,0.50)',
    borderRadius: 17,
    backgroundColor: 'rgba(62,98,134,0.48)',
  },
  controlWide: { width: 106 },
  controlAction: { borderColor: 'rgba(246,217,144,0.72)', backgroundColor: 'rgba(128,88,66,0.62)' },
  controlHighlight: { position: 'absolute', left: 7, right: 7, top: 5, height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.10)' },
  pressed: { opacity: 0.76, transform: [{ translateY: 2 }] },
  controlText: { color: '#fff0c9', fontFamily: 'monospace', fontSize: 12, fontWeight: '900' },
  secondaryButton: {
    minWidth: 180,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 15,
    backgroundColor: 'rgba(128,88,66,0.72)',
    paddingHorizontal: 14,
  },
  restart: { borderColor: SCENE_TOKENS.sunrise },
  buttonText: { color: '#fff0c9', fontFamily: 'monospace', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  exitButton: { minHeight: 26, justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 3 },
  exitText: { color: '#a999a5', fontFamily: 'monospace', fontSize: 7, fontWeight: '800', letterSpacing: 0.8 },
});
