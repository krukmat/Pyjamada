import React, { useEffect, useState } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
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
  isBasementControlRevealed,
  isBasementFaultTraced,
  isBasementLaboratoryRouteRevealed,
  isBasementLossOfControlRevealed,
  isBasementPowerStabilized,
  isBasementRelayProbed,
  isBasementTerminalFocused,
  isBathroomLightOff,
  isBathroomMirrorAnomalySeen,
  isBathroomRouteRevealed,
  isHallwayClockInspected,
  isKitchenBreakerInspected,
  isKitchenCircuitOverloaded,
  isKitchenPowerRerouted,
  isExplorationCombatEnabled,
  isLivingRoomPathRevealed,
  isLivingRoomPhotoFocused,
  isLivingRoomRadioFocused,
  isLivingRoomSourceCueRevealed,
  isLivingRoomTvActivated,
} from '../game/adventure/AdventureExplorationRuntime';
import {
  getAdventureEndingPhase,
  isAdventureEndingActive,
} from '../game/adventure/AdventureEnding';
import type { AdventureState, RoomId } from '../game/adventure/AdventureState';
import { getLaboratoryEncounterPhase, isLaboratoryEncounterActive } from '../game/adventure/LaboratoryEncounter';
import type { HauntedActionControl, HauntedHeldControl } from '../game/haunted/HauntedInput';
import { isAtHauntedExit, type HauntedSessionState } from '../game/haunted/HauntedSessionRuntime';
import { HAUNTED_GHOST_ATLAS_SOURCE, HAUNTED_WALLY_ATLAS_SOURCE } from '../game/presentation/AssetSources';
import type { PresentationRuntime } from '../game/presentation/PresentationRuntime';
import { GameCanvas } from '../game/render/GameCanvas';
import { roomInteractionTarget } from '../game/render/RoomPresentation';
import { stageDimensionsForScreen } from '../game/render/StageViewport';
import { SCENE_TOKENS, VISUAL_TOKENS } from '../game/render/VisualLanguage';
import type { TouchControlLayout } from '../settings/core/GameSettings';
import { HauntedRenderReadyProbe } from './HauntedRenderReadyProbe';
import { activeGhostHint } from './HauntedThreatHint';
import { TouchDeck } from './TouchDeck';
import { shouldUseRoomCheckpoint } from '../game/adventure/RoomCheckpoint';
import { PixelMeter } from './RetroUiKit';
import { RoomTransitionOverlay, type RoomTransitionPhase } from './RoomTransitionOverlay';
import { isTestHooksEnabled } from './testHooks';
import { activeRoomBoss, roomBossHits, type RoomBossKind } from '../game/adventure/RoomBossHazard';
import { isBathroomTwinActive, isBathroomTwinDispelled, isBathroomTwinWounded } from '../game/adventure/BathroomTwinHazard';

type Props = {
  session: HauntedSessionState;
  adventure?: AdventureState;
  transitionPhase?: RoomTransitionPhase;
  presentationRuntime: PresentationRuntime;
  touchControlLayout: TouchControlLayout;
  /** The QA bot is playing (DEMO): show it and leave the deck to the bot. */
  demo?: boolean;
  /** Numbered DEMO moment (see DemoFilm), read by maestro/demo-film.yaml. */
  demoMoment?: string;
  onHeldControl: (control: HauntedHeldControl, pressed: boolean) => void;
  onAction: (control: HauntedActionControl) => void;
  onRestart: () => void;
  onFinishEnding: () => void;
  onExit: () => void;
};

export function HauntedGameScreen({
  session,
  adventure,
  transitionPhase = 'idle',
  presentationRuntime,
  touchControlLayout,
  demo = false,
  demoMoment,
  onHeldControl,
  onAction,
  onRestart,
  onFinishEnding,
  onExit,
}: Props) {
  const { width, height } = useWindowDimensions();
  const viewport = stageDimensionsForScreen(width, height - SCREEN_CHROME_HEIGHT);
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
  const endingPhase = adventure ? getAdventureEndingPhase(adventure) : 'locked';
  const endingActive = Boolean(adventure && isAdventureEndingActive(adventure));
  const explorationCombat = Boolean(adventure && isExplorationCombatEnabled(adventure));
  const laboratoryRetry = Boolean(adventure && adventure.currentRoom === 'laboratory' && isLaboratoryEncounterActive(adventure));
  const roomRetry = Boolean(adventure && shouldUseRoomCheckpoint(session, adventure));

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 80);
    return () => clearInterval(timer);
  }, []);

  const useTarget = exitTarget ? 'EXIT' : adventureTarget?.displayLabel ?? domesticTarget?.label;

  return (
    <View testID="game-screen" style={styles.container}>
      <View style={[styles.cabinet, { width: viewport.width + 8 }]}>
        <View style={styles.marquee}>
          <View style={styles.marqueeMission}>
            <Text testID={demo ? 'demo-banner' : undefined} style={styles.kicker}>{demo ? 'DEMO · BOT PLAYING · BACK TO MENU TO STOP' : endingActive ? 'PYJAMADA · MORNING AFTER' : kickerFor(roomId, exploration)}</Text>
            {demoMoment && <Text testID="demo-moment" style={styles.kicker}>{demoMoment}</Text>}
            <Text style={styles.objective}>{objectiveFor(session, adventure)}</Text>
          </View>
          {exploration && !endingActive && (
            <View style={styles.stats}>
              <Text testID="exploration-hp" style={styles.hp}>HP {'♥'.repeat(session.combat.hp)}{'·'.repeat(session.combat.maxHp - session.combat.hp)}</Text>
            </View>
          )}
          {!exploration && (
            <View style={styles.stats}>
              <View style={styles.statRow}>
                <Text style={styles.time}>TIME {String(remainingSeconds).padStart(2, '0')}</Text>
                <Text style={styles.hp}>HP {'♥'.repeat(session.combat.hp)}{'·'.repeat(session.combat.maxHp - session.combat.hp)}</Text>
              </View>
              <View style={styles.statRow}>
                <View style={styles.meter}><Text style={styles.label}>ENERGY</Text><PixelMeter value={state.energy / 100} segments={5} accent={VISUAL_TOKENS.feedback.energy} /></View>
                <View style={styles.meter}><Text style={styles.label}>NOISE</Text><PixelMeter value={state.noise / 100} segments={5} accent={VISUAL_TOKENS.feedback.noise} /></View>
              </View>
            </View>
          )}
        </View>

        <View style={[styles.gameFrame, { width: viewport.width, height: viewport.height }]}>
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
          <RoomTransitionOverlay phase={transitionPhase} />
        </View>

        <View style={styles.messagePanel}>
          {done ? <Outcome session={session} /> : (
            <View style={[styles.prompt, !prompt && styles.promptIdle]}>
              <Text style={styles.promptText}>{prompt ?? '· · ·'}</Text>
            </View>
          )}
          <Text testID="game-reaction" style={styles.reaction}>{reactionFor(session, adventure)}</Text>
        </View>
      </View>

      <View style={styles.deck}>
        {!done ? (
          endingPhase === 'ghost-sting' ? (
            <TapControl testID="ending-finish-button" label="END NIGHT" wide accent onPress={onFinishEnding} />
          ) : (
            <TouchDeck
              layout={touchControlLayout}
              enabled={{ jump: !endingActive, attack: !endingActive && (!exploration || explorationCombat), interact: true }}
              useTarget={useTarget}
              onHeldControl={onHeldControl}
              onAction={onAction}
            />
          )
        ) : (
          <TapControl testID="restart-button" label={laboratoryRetry ? 'RETRY PHASE' : roomRetry ? 'RETRY ROOM' : 'TRY AGAIN'} wide accent onPress={onRestart} />
        )}
      </View>

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
  if (!exploration) return 'HAUNTED NIGHT · 5:12 AM';
  if (roomId === 'hallway') return 'HAUNTED HOUSE · HALLWAY';
  if (roomId === 'living-room') return 'HAUNTED HOUSE · LIVING ROOM';
  if (roomId === 'kitchen') return 'HAUNTED HOUSE · KITCHEN';
  if (roomId === 'bathroom') return 'HAUNTED HOUSE · BATHROOM';
  if (roomId === 'attic') return 'HAUNTED HOUSE · ATTIC';
  if (roomId === 'basement') return 'HAUNTED HOUSE · BASEMENT';
  if (roomId === 'laboratory') return 'HAUNTED HOUSE · LABORATORY';
  return 'HAUNTED HOUSE · BEDROOM';
}

const BOSS_TAUNTS: Record<RoomBossKind, string> = {
  moth: 'A moth the size of a pillow beats dust off the walls. It guards the door.',
  wraith: 'The static took a shape. It blinks from spot to spot. Hit it when it is solid.',
  roach: 'A giant cockroach skitters out from under the fridge. Jump it when it charges.',
};

function objectiveFor(session: HauntedSessionState, adventure?: AdventureState): string {
  if (adventure) {
    const ending = getAdventureEndingPhase(adventure);
    if (ending === 'awakening') return 'CHECK WHAT CAME BACK';
    if (ending === 'evidence') return 'CHECK THE WINDOW';
    if (ending === 'ghost-sting') return 'THE HOUSE IS QUIET. PROBABLY.';
  }
  if (adventure && isAdventureExplorationActive(adventure)) {
    if (adventure.currentRoom === 'bedroom') return 'FIND ANOTHER WAY OUT';
    const boss = activeRoomBoss(adventure);
    if (boss) return `DEFEAT THE ${boss.name} ${roomBossHits(adventure, boss.room)}/${boss.hp}`;
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
      if (isBathroomTwinActive(adventure)) return 'DISPEL THE REFLECTION';
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
    if (adventure.currentRoom === 'laboratory') {
      const phase = getLaboratoryEncounterPhase(adventure);
      if (phase === 'dormant') return 'APPROACH THE RESONATOR';
      if (phase === 'vesper-control') return "BREAK VESPER'S CONTROL";
      if (phase === 'resonator') return 'DESTABILIZE THE RESONATOR';
      if (phase === 'nightmare') return 'DEFEAT VESPER NIGHTMARE';
      return 'RESONATOR SHUT DOWN';
    }
    if (adventure.currentRoom === 'basement') {
      if (isBasementLaboratoryRouteRevealed(adventure)) return 'LABORATORY ROUTE IDENTIFIED';
      if (isBasementLossOfControlRevealed(adventure)) return 'TRACE THE LAB FEED';
      if (isBasementControlRevealed(adventure)) return 'TRIP THE FAILSAFE';
      if (isBasementPowerStabilized(adventure)) return 'READ THE CONTROL TERMINAL';
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

function TapControl({ testID, label, onPress, accent = false, danger = false, wide = false }: { testID: string; label: string; onPress: () => void; accent?: boolean; danger?: boolean; wide?: boolean }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [wide ? styles.wideButton : styles.roundButton, accent && styles.accentButton, danger && styles.dangerButton, pressed && styles.pressed]}
    >
      <Text style={wide ? styles.wideText : styles.roundText}>{label}</Text>
    </Pressable>
  );
}

function reactionFor(session: HauntedSessionState, adventure?: AdventureState): string {
  if (adventure) {
    const ending = getAdventureEndingPhase(adventure);
    if (ending === 'awakening') return 'Morning again. The room looks normal. Almost.';
    if (ending === 'evidence') return 'The burned sensor tag is real. So was the Laboratory.';
    if (ending === 'ghost-sting') return 'A tiny face grins from the glass. Of course.';
  }
  if (adventure && isAdventureExplorationActive(adventure)) {
    if (adventure.currentRoom === 'bedroom') return 'That door did not lead outside. The room is wrong.';
    const boss = activeRoomBoss(adventure);
    if (boss) return BOSS_TAUNTS[boss.kind];
    if (adventure.currentRoom === 'living-room') {
      if (isLivingRoomSourceCueRevealed(adventure)) return 'The radio catches the same pulse. Stronger through the wall.';
      if (isLivingRoomPhotoFocused(adventure)) return 'The glass reflects a room that is not here.';
      if (isLivingRoomRadioFocused(adventure)) return 'No station. Just a pulse under the static.';
      if (hasLabTransmissionBeenSeen(adventure)) return 'A voice under the static: VESPER LOG. RESONANCE STABLE. SUBJECT STILL DREAMING.';
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
      if (isBathroomTwinActive(adventure)) {
        return isBathroomTwinWounded(adventure)
          ? 'The reflection flickers. One more hit.'
          : 'Your reflection stepped out of the glass. It copies every move.';
      }
      if (isBathroomTwinDispelled(adventure)) return 'The reflection is gone. The mirror is still lit.';
      if (isBathroomLightOff(adventure)) return 'The room went dark. The reflection did not.';
      if (isBathroomMirrorAnomalySeen(adventure)) return 'The pulse stops here. In the mirror, it keeps going.';
      return 'The pulse stops at the sink.';
    }
    if (adventure.currentRoom === 'attic') {
      if (isAtticBasementRouteRevealed(adventure)) return 'The recorder output drops through the floor. The machine is below.';
      if (isAtticExperimentRevealed(adventure)) return "SUBJECT W-01: WALLY. The house is Vesper's experiment, and Wally is the battery.";
      const logSeen = isAtticLogInspected(adventure);
      const sensorsSeen = isAtticSensorsInspected(adventure);
      if (logSeen && sensorsSeen) return 'Bedroom. Television. Power. Mirror. The readings all belong to the same experiment.';
      if (isAtticRecorderFocused(adventure)) return 'The recorder has fragments, but the labels mean nothing yet.';
      if (logSeen) return 'A resonance spike for every room Wally crossed. Signed: Dr. E. Vesper.';
      if (sensorsSeen) return 'These sensors map the house. Someone wired every anomaly.';
      return 'Old storage. New cables. Someone turned the attic into an observation post.';
    }
    if (adventure.currentRoom === 'laboratory') {
      const phase = getLaboratoryEncounterPhase(adventure);
      if (phase === 'dormant') return 'The feed ends at the Resonator. Dr. Vesper is still at the controls.';
      if (phase === 'vesper-control') return 'Vesper seals the controls. Break his hold on the machine.';
      if (phase === 'resonator') return 'The control link is broken. The Resonator is running away on its own.';
      if (phase === 'nightmare') return 'The Resonator turned Vesper into the thing it was feeding.';
      if (phase === 'shutdown') return 'Vesper is down. Shut the Resonator off before it can recover.';
      return 'The Resonator is silent. Whatever happens next is outside the machine.';
    }
    if (adventure.currentRoom === 'basement') {
      if (isBasementLaboratoryRouteRevealed(adventure)) return 'The feed disappears through a service hatch. The Laboratory is below.';
      if (isBasementLossOfControlRevealed(adventure)) return 'LOCAL CUTOFF REJECTED. OVERRIDE: VESPER. Control continues below the Basement.';
      if (isBasementControlRevealed(adventure)) return 'Resonance load is above the safe line. The system is still climbing.';
      if (isBasementTerminalFocused(adventure) && !isBasementPowerStabilized(adventure)) return 'The control terminal is dark. The unstable feed cannot hold a reading.';
      if (isBasementPowerStabilized(adventure)) return 'The relay holds. The control terminal finally has a readable signal.';
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
    if (session.objective.reason === 'haunted') return adventure && shouldUseRoomCheckpoint(session, adventure) ? 'Knocked out. Wally wakes at the door - every clue stays found.' : 'The haunting got Wally.';
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
  const ghostHint = activeGhostHint(activeGhosts);
  if (ghostHint) return ghostHint;

  const id = session.domestic.objectStates;
  if (session.domestic.wallyState === 'sleepy') return 'Wake up first. Bed or alarm.';
  if (session.domestic.wallyState === 'rushed') return 'The clock is winning.';
  if (session.domestic.wallyState === 'startled') return 'Something is wrong with this room.';
  if (session.domestic.interactionCounts['alarm-clock'] > 0) return 'That alarm woke something else.';
  if (id.bed !== 'idle') return 'Awake. The room is waking up too.';
  if (id.wardrobe !== 'idle') return 'Dressed. Coordination optional.';
  return 'Ordinary room. Suspicious consequences.';
}

const ARCADE = {
  cabinet: '#0b0a12',
  bezel: '#352a5a',
  bezelLight: '#6b5aa0',
  screen: '#07081a',
  ink: '#f4f1de',
  muted: '#9585c9',
} as const;

// Everything on the screen but the stage, at its minimum: status bar and
// container padding, marquee, message panel, control deck, menu link, the
// container gaps and the cabinet's padding, border and inner gaps.
const DECK_MIN_HEIGHT = 140;
const SCREEN_CHROME_HEIGHT = (StatusBar.currentHeight ?? 0) + 14 + 52 + 86 + DECK_MIN_HEIGHT + 30 + 20 + 26;

const styles = StyleSheet.create({
  // Android draws edge-to-edge: keep the marquee clear of the status bar.
  container: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', gap: 10, backgroundColor: ARCADE.cabinet, paddingTop: (StatusBar.currentHeight ?? 0) + 8, paddingBottom: 6 },
  cabinet: { alignItems: 'center', gap: 6, padding: 4, borderWidth: 3, borderColor: ARCADE.bezel, borderRadius: 4, backgroundColor: ARCADE.screen },
  marquee: { alignSelf: 'stretch', minHeight: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 2, borderColor: ARCADE.bezelLight },
  marqueeMission: { flexShrink: 1 },
  kicker: { color: VISUAL_TOKENS.ui.yellow, fontFamily: 'monospace', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  objective: { color: ARCADE.ink, fontFamily: 'monospace', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  stats: { alignItems: 'flex-end', gap: 3 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { color: VISUAL_TOKENS.ui.yellow, fontFamily: 'monospace', fontSize: 12, fontWeight: '900' },
  hp: { color: '#ff5277', fontFamily: 'monospace', fontSize: 13, fontWeight: '900' },
  meter: { width: 46 },
  label: { color: ARCADE.muted, fontFamily: 'monospace', fontSize: 6, fontWeight: '900' },
  gameFrame: { position: 'relative', overflow: 'hidden', backgroundColor: SCENE_TOKENS.skyDeep },
  messagePanel: { alignSelf: 'stretch', minHeight: 84, alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 6, borderTopWidth: 2, borderColor: ARCADE.bezelLight },
  prompt: { minHeight: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: VISUAL_TOKENS.ui.yellow, borderRadius: 2 },
  promptIdle: { borderColor: ARCADE.bezel },
  promptText: { color: VISUAL_TOKENS.ui.yellow, fontFamily: 'monospace', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  reaction: { alignSelf: 'stretch', color: ARCADE.ink, fontFamily: 'monospace', fontSize: 12, fontWeight: '800', lineHeight: 16, textAlign: 'center' },
  outcome: { minWidth: '70%', minHeight: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderRadius: 2, backgroundColor: ARCADE.cabinet },
  outcomeText: { color: ARCADE.ink, fontFamily: 'monospace', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  // The deck takes all the height the stage leaves, so the screen has no dead band.
  deck: { flex: 1, alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, minHeight: DECK_MIN_HEIGHT },
  roundButton: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#5c86a8', borderRadius: 29, backgroundColor: '#1f8fa8' },
  accentButton: { borderColor: '#fff2a0', backgroundColor: '#c89a2a' },
  dangerButton: { width: 66, height: 66, borderRadius: 33, borderColor: '#ff9aa8', backgroundColor: '#d23a5a' },
  roundText: { color: ARCADE.ink, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  wideButton: { flex: 1, minHeight: 56, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderRadius: 4, borderColor: '#fff2a0', backgroundColor: '#c89a2a' },
  wideText: { color: ARCADE.cabinet, fontFamily: 'monospace', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
  pressed: { opacity: 0.7, transform: [{ translateY: 2 }] },
  exitButton: { minHeight: 30, justifyContent: 'center', paddingHorizontal: 16 },
  exitText: { color: ARCADE.muted, fontFamily: 'monospace', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
});
