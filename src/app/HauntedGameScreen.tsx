import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useImage } from '@shopify/react-native-skia';
import {
  findAdventureInteractionTarget,
  hasLabTransmissionBeenSeen,
  isAdventureExplorationActive,
  isAtticBasementRouteRevealed,
  isAtticExperimentRevealed,
  isAtticLogInspected,
  isAtticRecorderFocused,
  isAtticSensorsInspected,
  isBasementFaultTraced,
  isBasementPowerStabilized,
  isBasementRelayProbed,
  isBathroomLightOff,
  isBathroomMirrorAnomalySeen,
  isBathroomRouteRevealed,
  isHallwayClockInspected,
  isKitchenBreakerInspected,
  isKitchenCircuitOverloaded,
  isKitchenPowerRerouted,
  isLivingRoomPathRevealed,
  isLivingRoomPhotoFocused,
  isLivingRoomRadioFocused,
  isLivingRoomSourceCueRevealed,
  isLivingRoomTvActivated,
} from '../game/adventure/AdventureExplorationRuntime';
import type { AdventureState, RoomId } from '../game/adventure/AdventureState';
import type { HauntedActionControl, HauntedHeldControl } from '../game/haunted/HauntedInput';
import { isAtHauntedExit, type HauntedSessionState } from '../game/haunted/HauntedSessionRuntime';
import { HAUNTED_GHOST_ATLAS_SOURCE, HAUNTED_WALLY_ATLAS_SOURCE } from '../game/presentation/AssetSources';
import type { PresentationRuntime } from '../game/presentation/PresentationRuntime';
import { GameCanvas } from '../game/render/GameCanvas';
import { roomInteractionTarget } from '../game/render/RoomPresentation';
import { stageDimensionsForScreenWidth } from '../game/render/StageViewport';
import { SCENE_TOKENS, VISUAL_TOKENS } from '../game/render/VisualLanguage';
import type { TouchControlLayout } from '../settings/core/GameSettings';
import { HauntedRenderReadyProbe } from './HauntedRenderReadyProbe';
import { PixelMeter } from './RetroUiKit';
import { RoomTransitionOverlay, type RoomTransitionPhase } from './RoomTransitionOverlay';
import { isTestHooksEnabled } from './testHooks';

type Props = {
  session: HauntedSessionState;
  adventure?: AdventureState;
  transitionPhase?: RoomTransitionPhase;
  presentationRuntime: PresentationRuntime;
  touchControlLayout: TouchControlLayout;
  onHeldControl: (control: HauntedHeldControl, pressed: boolean) => void;
  onAction: (control: HauntedActionControl) => void;
  onRestart: () => void;
  onExit: () => void;
};

export function HauntedGameScreen({
  session,
  adventure,
  transitionPhase = 'idle',
  presentationRuntime,
  touchControlLayout,
  onHeldControl,
  onAction,
  onRestart,
  onExit,
}: Props) {
  const { width } = useWindowDimensions();
  const viewport = stageDimensionsForScreenWidth(width);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const hauntedWallyImage = useImage(HAUNTED_WALLY_ATLAS_SOURCE);
  const hauntedGhostImage = useImage(HAUNTED_GHOST_ATLAS_SOURCE);
  const hauntedAssetsReady = Boolean(hauntedWallyImage && hauntedGhostImage);
  const state = session.domestic;
  const roomId = adventure?.currentRoom ?? 'bedroom';
  const exploration = adventure ? isAdventureExplorationActive(adventure) : false;
  const domesticTarget = exploration ? undefined : roomInteractionTarget(roomId, state);
  const adventureTarget = adventure ? findAdventureInteractionTarget(adventure, session.player.x) : undefined;
  const exitTarget = !exploration && roomId === 'bedroom' && session.objective.phase === 'escape-ready' && isAtHauntedExit(session.player.x);
  const done = session.objective.phase === 'failed' || (session.objective.phase === 'completed' && !exploration);
  const activeVisualEvents = presentationRuntime.snapshot();
  const remainingSeconds = Math.max(0, Math.ceil((session.deadlineMs - session.elapsedMs - session.penaltyMs) / 1000));
  const testHooksEnabled = isTestHooksEnabled();
  const prompt = promptFor(exitTarget, domesticTarget?.label, adventureTarget);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 80);
    return () => clearInterval(timer);
  }, []);

  const left = <HeldControl testID="move-left-button" label="◀" onChange={(pressed) => onHeldControl('left', pressed)} />;
  const right = <HeldControl testID="move-right-button" label="▶" onChange={(pressed) => onHeldControl('right', pressed)} />;

  return (
    <View testID="game-screen" style={styles.container}>
      <View style={[styles.gameFrame, { width: viewport.width }]}>
        <GameCanvas
          state={state}
          width={viewport.width}
          height={viewport.height}
          activeVisualEvents={activeVisualEvents}
          nowMs={nowMs}
          roomId={roomId}
          adventure={adventure}
          playerRenderPosition={{ x: session.player.x, y: session.player.y, facing: session.player.facing }}
          dreamSparks={session.combat.projectiles}
          hauntedSession={session}
          hauntedWallyImage={hauntedWallyImage}
          hauntedGhostImage={hauntedGhostImage}
        />

        <View pointerEvents="none" style={styles.hud}>
          <View>
            <Text style={styles.kicker}>{kickerFor(roomId, exploration)}</Text>
            <Text style={styles.objective}>{objectiveFor(session, adventure)}</Text>
          </View>
          {!exploration && (
            <View style={styles.stats}>
              <Text style={styles.time}>TIME {String(remainingSeconds).padStart(2, '0')}</Text>
              <Text style={styles.hp}>HP {'♥'.repeat(session.combat.hp)}{'·'.repeat(session.combat.maxHp - session.combat.hp)}</Text>
              <View style={styles.meter}><Text style={styles.label}>ENERGY</Text><PixelMeter value={state.energy / 100} segments={5} accent={VISUAL_TOKENS.feedback.energy} /></View>
              <View style={styles.meter}><Text style={styles.label}>NOISE</Text><PixelMeter value={state.noise / 100} segments={5} accent={VISUAL_TOKENS.feedback.noise} /></View>
            </View>
          )}
        </View>

        {!done && prompt && (
          <View pointerEvents="none" style={styles.prompt}>
            <Text style={styles.promptText}>{prompt}</Text>
          </View>
        )}
        {done && <Outcome session={session} />}
        <RoomTransitionOverlay phase={transitionPhase} />
      </View>

      <Text testID="game-reaction" style={styles.reaction}>{reactionFor(session, adventure)}</Text>

      {!done ? (
        <>
          <View style={styles.controls}>
            {touchControlLayout === 'standard' ? left : right}
            {touchControlLayout === 'standard' ? right : left}
            <TapControl testID="jump-button" label="JUMP" onPress={() => onAction('jump')} />
          </View>
          <View style={styles.controls}>
            {!exploration && <TapControl testID="attack-button" label="ATTACK" accent onPress={() => onAction('attack')} />}
            <TapControl testID="action-button" label="INTERACT" accent onPress={() => onAction('interact')} />
          </View>
        </>
      ) : (
        <TapControl testID="restart-button" label="TRY AGAIN" accent onPress={onRestart} />
      )}

      <Pressable testID="exit-button" onPress={onExit} style={({ pressed }) => [styles.exitButton, pressed && styles.pressed]}>
        <Text style={styles.exitText}>BACK TO MENU</Text>
      </Pressable>

      {testHooksEnabled && (
        <HauntedRenderReadyProbe scenarioKey={session.runId} assetsReady={hauntedAssetsReady} />
      )}
    </View>
  );
}

function kickerFor(roomId: RoomId, exploration: boolean): string {
  if (!exploration) return 'HAUNTED MORNING';
  if (roomId === 'hallway') return 'HAUNTED HOUSE · HALLWAY';
  if (roomId === 'living-room') return 'HAUNTED HOUSE · LIVING ROOM';
  if (roomId === 'kitchen') return 'HAUNTED HOUSE · KITCHEN';
  if (roomId === 'bathroom') return 'HAUNTED HOUSE · BATHROOM';
  if (roomId === 'attic') return 'HAUNTED HOUSE · ATTIC';
  if (roomId === 'basement') return 'HAUNTED HOUSE · BASEMENT';
  return 'HAUNTED HOUSE · BEDROOM';
}

function objectiveFor(session: HauntedSessionState, adventure?: AdventureState): string {
  if (adventure && isAdventureExplorationActive(adventure)) {
    if (adventure.currentRoom === 'bedroom') return 'FIND ANOTHER WAY OUT';
    if (adventure.currentRoom === 'living-room') {
      if (!isLivingRoomTvActivated(adventure)) return 'CHECK THE LIVING ROOM';
      if (!hasLabTransmissionBeenSeen(adventure)) return 'CHECK THE SIGNAL';
      return 'FIND THE SOURCE';
    }
    if (adventure.currentRoom === 'kitchen') {
      if (isKitchenPowerRerouted(adventure)) return 'FOLLOW THE PULSE';
      if (isKitchenCircuitOverloaded(adventure)) return 'CHECK THE BREAKER';
      return 'TRACE THE POWER';
    }
    if (adventure.currentRoom === 'bathroom') {
      if (isBathroomRouteRevealed(adventure)) return 'ATTIC ACCESS REVEALED';
      if (isBathroomLightOff(adventure)) return 'CHECK THE MIRROR';
      if (isBathroomMirrorAnomalySeen(adventure)) return 'TEST THE REFLECTION';
      return 'FOLLOW THE PULSE';
    }
    if (adventure.currentRoom === 'attic') {
      if (isAtticExperimentRevealed(adventure)) return 'FIND THE MACHINE';
      const logSeen = isAtticLogInspected(adventure);
      const sensorsSeen = isAtticSensorsInspected(adventure);
      if (logSeen && sensorsSeen) return 'PLAY THE RECORDING';
      if (logSeen || sensorsSeen) return 'CONNECT THE EVIDENCE';
      return 'SEARCH THE ATTIC';
    }
    if (adventure.currentRoom === 'basement') {
      if (isBasementPowerStabilized(adventure)) return 'POWER FEED STABLE';
      if (isBasementFaultTraced(adventure)) return 'ISOLATE THE FAULT';
      return 'FOLLOW THE POWER';
    }
    if (!isHallwayClockInspected(adventure)) return 'CHECK THE HALLWAY';
    return 'ENTER THE LIVING ROOM';
  }
  return session.objective.phase === 'escape-ready' ? 'ESCAPE READY · CLEAR THE DOOR' : 'GET DRESSED + FIND KEYS';
}

function promptFor(
  exitTarget: boolean,
  domesticLabel: string | undefined,
  adventureTarget: ReturnType<typeof findAdventureInteractionTarget>,
): string | undefined {
  if (exitTarget) return 'INTERACT · EXIT';
  if (adventureTarget) return `INTERACT · ${adventureTarget.displayLabel}`;
  return domesticLabel ? `INTERACT · ${domesticLabel}` : undefined;
}

function Outcome({ session }: { session: HauntedSessionState }) {
  const success = session.objective.phase === 'completed';
  const title = success ? 'ESCAPED!' : session.objective.reason === 'house-awake' ? 'HOUSE AWAKE!' : session.objective.reason === 'too-late' ? 'TOO LATE!' : session.objective.reason === 'haunted' ? 'HAUNTED!' : 'OUT OF ENERGY!';
  return <View style={[styles.outcome, { borderColor: success ? VISUAL_TOKENS.feedback.success : VISUAL_TOKENS.feedback.failure }]}><Text style={styles.outcomeText}>{title}</Text></View>;
}

function HeldControl({ testID, label, onChange }: { testID: string; label: string; onChange: (pressed: boolean) => void }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPressIn={() => onChange(true)} onPressOut={() => onChange(false)} style={({ pressed }) => [styles.control, pressed && styles.pressed]}>
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}

function TapControl({ testID, label, onPress, accent = false }: { testID: string; label: string; onPress: () => void; accent?: boolean }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.control, styles.tapControl, accent && styles.accentControl, pressed && styles.pressed]}>
      <Text style={styles.controlText}>{label}</Text>
    </Pressable>
  );
}

function reactionFor(session: HauntedSessionState, adventure?: AdventureState): string {
  if (adventure && isAdventureExplorationActive(adventure)) {
    if (adventure.currentRoom === 'bedroom') return 'That door did not lead outside. The room is wrong.';
    if (adventure.currentRoom === 'living-room') {
      if (isLivingRoomSourceCueRevealed(adventure)) return 'The radio catches the same pulse. Stronger through the wall.';
      if (isLivingRoomPhotoFocused(adventure)) return 'The glass reflects a room that is not here.';
      if (isLivingRoomRadioFocused(adventure)) return 'No station. Just a pulse under the static.';
      if (hasLabTransmissionBeenSeen(adventure)) return 'A voice cuts through: RESONANCE STABLE... SUBJECT... Then static.';
      if (isLivingRoomTvActivated(adventure)) return 'Static. Not a channel. Something is underneath it.';
      return 'The television is dark. The room is listening.';
    }
    if (adventure.currentRoom === 'kitchen') {
      if (isKitchenPowerRerouted(adventure)) return 'The circuit settles. The same pulse is moving deeper into the house.';
      if (isKitchenCircuitOverloaded(adventure)) return 'The microwave killed the lights. The breaker is buzzing now.';
      if (isKitchenBreakerInspected(adventure)) return 'The breaker hums, but nothing has tripped. It needs a load.';
      return 'The appliances are dead. Something in the wall is still drawing power.';
    }
    if (adventure.currentRoom === 'bathroom') {
      if (isBathroomRouteRevealed(adventure)) return 'The wall is copying the mirror. A hidden stair climbs behind it.';
      if (isBathroomLightOff(adventure)) return 'The room went dark. The reflection did not.';
      if (isBathroomMirrorAnomalySeen(adventure)) return 'The pulse stops here. In the mirror, it keeps going.';
      return 'The pulse stops at the sink.';
    }
    if (adventure.currentRoom === 'attic') {
      if (isAtticBasementRouteRevealed(adventure)) return 'The recorder output drops through the floor. The machine is below.';
      if (isAtticExperimentRevealed(adventure)) return 'SUBJECT W-01. RESONANCE EXTRACTION. This house is an experiment.';
      const logSeen = isAtticLogInspected(adventure);
      const sensorsSeen = isAtticSensorsInspected(adventure);
      if (logSeen && sensorsSeen) return 'Bedroom. Television. Power. Mirror. The readings all belong to the same experiment.';
      if (isAtticRecorderFocused(adventure)) return 'The recorder has fragments, but the labels mean nothing yet.';
      if (logSeen) return 'The log lists resonance spikes beside rooms I have already crossed.';
      if (sensorsSeen) return 'These sensors map the house. Someone wired every anomaly.';
      return 'Old storage. New cables. Someone turned the attic into an observation post.';
    }
    if (adventure.currentRoom === 'basement') {
      if (isBasementPowerStabilized(adventure)) return 'The relay holds. The resonance feed is stable enough to read.';
      if (isBasementFaultTraced(adventure)) return 'The cyan feed is arcing into the old utility line. The relay can isolate it.';
      if (isBasementRelayProbed(adventure)) return 'The relay has no useful reading yet. Trace the live conduit first.';
      return 'The Attic cable ends here, grafted into the house utilities.';
    }
    if (isLivingRoomPathRevealed(adventure)) return 'The clock runs backward. A door at the far end just clicked.';
    return 'This hallway feels longer than it should.';
  }
  if (session.objective.phase === 'completed') return 'Out. Barely.';
  if (session.objective.phase === 'failed') {
    if (session.objective.reason === 'house-awake') return 'Too loud. The whole house knows.';
    if (session.objective.reason === 'haunted') return 'The haunting got Wally.';
    if (session.objective.reason === 'too-late') return 'Morning won. Try a sharper route.';
    return 'No energy left. Heroics were a mistake.';
  }

  const telegraphing = session.threats.ghosts.some((ghost) => ghost.phase === 'telegraph');
  const activeGhosts = session.threats.ghosts.filter((ghost) => ghost.phase === 'active').length;
  if (session.objective.phase === 'escape-ready') {
    if (telegraphing) return 'Exit lane haunted. Fire, dodge, get out.';
    return 'Keys. Clothes. Clear the door.';
  }
  if (telegraphing) return 'Something is phasing into the room...';
  if (activeGhosts > 0) return activeGhosts === 1 ? 'Ghost active. Shoot or keep moving.' : `${activeGhosts} ghosts active. Keep moving.`;

  const id = session.domestic.objectStates;
  if (session.domestic.wallyState === 'sleepy') return 'Wake up first. Bed or alarm.';
  if (session.domestic.wallyState === 'rushed') return 'The clock is winning.';
  if (session.domestic.wallyState === 'startled') return 'Something is wrong with this room.';
  if (session.domestic.interactionCounts['alarm-clock'] > 0) return 'That alarm woke something else.';
  if (id.bed !== 'idle') return 'Awake. The room is waking up too.';
  if (id.wardrobe !== 'idle') return 'Dressed. Coordination optional.';
  return 'Ordinary room. Suspicious consequences.';
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: SCENE_TOKENS.foreground, paddingHorizontal: 8, paddingVertical: 8 },
  gameFrame: { position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(244,217,164,0.34)', borderRadius: 12, backgroundColor: SCENE_TOKENS.skyDeep },
  hud: { position: 'absolute', top: 6, left: 6, right: 6, minHeight: 38, flexDirection: 'row', justifyContent: 'space-between', gap: 6, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(29,25,40,0.72)' },
  kicker: { color: SCENE_TOKENS.sunrise, fontFamily: 'monospace', fontSize: 5, fontWeight: '900', letterSpacing: 0.8 },
  objective: { color: '#fff0c9', fontFamily: 'monospace', fontSize: 7, fontWeight: '900' },
  stats: { minWidth: 150, flexDirection: 'row', alignItems: 'center', gap: 6 },
  time: { color: VISUAL_TOKENS.ui.yellow, fontFamily: 'monospace', fontSize: 7, fontWeight: '900' },
  hp: { color: '#ff7b82', fontFamily: 'monospace', fontSize: 7, fontWeight: '900' },
  meter: { width: 45 },
  label: { color: '#c9bdba', fontFamily: 'monospace', fontSize: 4, fontWeight: '900' },
  prompt: { position: 'absolute', bottom: 7, left: '28%', right: '28%', minHeight: 22, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: 'rgba(29,25,40,0.82)' },
  promptText: { color: '#fff0c9', fontFamily: 'monospace', fontSize: 6, fontWeight: '900' },
  reaction: { minHeight: 18, color: '#f5e9d2', fontFamily: 'monospace', fontSize: 8, fontWeight: '800', textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 7 },
  control: { minWidth: 62, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(186,213,199,0.45)', borderRadius: 13, backgroundColor: 'rgba(62,98,134,0.42)', paddingHorizontal: 9 },
  tapControl: { minWidth: 76 },
  accentControl: { borderColor: 'rgba(246,217,144,0.70)', backgroundColor: 'rgba(128,88,66,0.58)' },
  controlText: { color: '#fff0c9', fontFamily: 'monospace', fontSize: 9, fontWeight: '900' },
  pressed: { opacity: 0.7, transform: [{ translateY: 1 }] },
  outcome: { position: 'absolute', left: 25, right: 25, bottom: 18, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderRadius: 14, backgroundColor: 'rgba(30,24,36,0.9)' },
  outcomeText: { color: '#fff0c9', fontFamily: 'monospace', fontSize: 16, fontWeight: '900', letterSpacing: 1.4 },
  exitButton: { minHeight: 24, justifyContent: 'center', paddingHorizontal: 12 },
  exitText: { color: '#a999a5', fontFamily: 'monospace', fontSize: 7, fontWeight: '800', letterSpacing: 0.8 },
});
