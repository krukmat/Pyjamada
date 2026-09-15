import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StatusBar, View } from 'react-native';
import { AdventureDebugController } from './src/app/AdventureDebugController';
import { HauntedGameScreen } from './src/app/HauntedGameScreen';
import {
  createHauntedScreenshotScenario,
  createScreenshotAdventureState,
  type HauntedScreenshotScenario,
} from './src/app/HauntedScreenshotScenarios';
import { MainMenu } from './src/app/MainMenu';
import type { RoomTransitionPhase } from './src/app/RoomTransitionOverlay';
import { ScreenshotScenarioController } from './src/app/ScreenshotScenarioController';
import { SettingsScreen } from './src/app/SettingsScreen';
import { isTestHooksEnabled } from './src/app/testHooks';
import {
  applyFalseEscape,
  isAdventureExplorationActive,
  stepAdventureExploration,
  type AdventureExplorationEvent,
} from './src/game/adventure/AdventureExplorationRuntime';
import { AdventureSaveCoordinator, type AdventureSaveReason } from './src/game/adventure/AdventureSaveCoordinator';
import { createAdventureGameSession, type AdventureGameSessionState } from './src/game/adventure/AdventureGameSession';
import { AdventureSessionCoordinator } from './src/game/adventure/AdventureSessionCoordinator';
import { createAdventureState, type AdventureState } from './src/game/adventure/AdventureState';
import type { RoomEntryPoint } from './src/game/adventure/RoomRegistry';
import { advanceFixedStep, HAUNTED_STEP_MS } from './src/game/haunted/FixedStepClock';
import { createHauntedInputState, pressAction, setHeldControl, type HauntedActionControl, type HauntedHeldControl } from './src/game/haunted/HauntedInput';
import { stepHauntedSession, type HauntedSessionState } from './src/game/haunted/HauntedSessionRuntime';
import { systemAnimationClock } from './src/game/presentation/AnimationClock';
import { PresentationRuntime } from './src/game/presentation/PresentationRuntime';
import { AsyncStorageGameSettingsRepository } from './src/platform/settings/AsyncStorageGameSettingsRepository';
import { AsyncStorageAdventureGameSaveRepository } from './src/platform/storage/AsyncStorageAdventureGameSaveRepository';
import { DEFAULT_GAME_SETTINGS, type GameSettings, type GameSettingsPatch } from './src/settings/core/GameSettings';
import { LoadGameSettingsUseCase } from './src/settings/usecases/LoadGameSettingsUseCase';
import { UpdateGameSettingsUseCase } from './src/settings/usecases/UpdateGameSettingsUseCase';

type AppView = 'menu' | 'settings' | 'game';
type SettingsPatchFactory = (current: GameSettings) => GameSettingsPatch;
type TransitionRequest = Extract<AdventureExplorationEvent, { type: 'ROOM_TRANSITION_REQUESTED' }>;

export default function App() {
  const [view, setView] = useState<AppView>('menu');
  const [session, setSession] = useState<HauntedSessionState | null>(null);
  const [adventure, setAdventure] = useState<AdventureState>(() => createAdventureState());
  const [transitionPhase, setTransitionPhase] = useState<RoomTransitionPhase>('idle');
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [canContinue, setCanContinue] = useState(false);

  const sessionRef = useRef<HauntedSessionState | null>(null);
  const adventureRef = useRef<AdventureState>(createAdventureState());
  const adventureCoordinatorRef = useRef(new AdventureSessionCoordinator(adventureRef.current));
  const presentationRef = useRef(new PresentationRuntime(systemAnimationClock));
  const settingsRef = useRef<GameSettings>(DEFAULT_GAME_SETTINGS);
  const settingsQueueRef = useRef<Promise<void>>(Promise.resolve());
  const accumulatorMsRef = useRef(0);
  const lastFrameMsRef = useRef<number | null>(null);
  const screenshotScenarioRef = useRef<HauntedScreenshotScenario | null>(null);
  const transitionLockRef = useRef(false);
  const transitionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const testHooksEnabled = isTestHooksEnabled();

  const saves = useMemo(() => new AsyncStorageAdventureGameSaveRepository(), []);
  const saveCoordinator = useMemo(() => new AdventureSaveCoordinator(saves), [saves]);
  const settingsRepository = useMemo(() => new AsyncStorageGameSettingsRepository(), []);
  const loadSettings = useMemo(() => new LoadGameSettingsUseCase(settingsRepository), [settingsRepository]);
  const updateSettings = useMemo(() => new UpdateGameSettingsUseCase(settingsRepository), [settingsRepository]);

  useEffect(() => {
    let active = true;
    void Promise.all([saves.read(), loadSettings.execute()])
      .then(([saved, settings]) => {
        if (!active) return;
        setCanContinue(saved.status === 'ok');
        settingsRef.current = settings;
        setGameSettings(settings);
      })
      .catch(() => {
        if (!active) return;
        setCanContinue(false);
        settingsRef.current = DEFAULT_GAME_SETTINGS;
        setGameSettings(DEFAULT_GAME_SETTINGS);
      });
    return () => { active = false; };
  }, [loadSettings, saves]);

  useEffect(() => () => clearTransitionTimers(), []);

  useEffect(() => {
    if (view !== 'game') {
      accumulatorMsRef.current = 0;
      lastFrameMsRef.current = null;
      return;
    }

    const timer = setInterval(() => {
      if (screenshotScenarioRef.current !== null || transitionLockRef.current) {
        accumulatorMsRef.current = 0;
        lastFrameMsRef.current = null;
        return;
      }

      const current = sessionRef.current;
      if (!current) return;
      const now = Date.now();
      if (lastFrameMsRef.current === null) {
        lastFrameMsRef.current = now;
        return;
      }

      const elapsedMs = now - lastFrameMsRef.current;
      lastFrameMsRef.current = now;
      const fixed = advanceFixedStep(accumulatorMsRef.current, elapsedMs);
      accumulatorMsRef.current = fixed.accumulatorMs;
      if (fixed.steps === 0) return;

      const currentAdventure = adventureRef.current;
      if (isAdventureExplorationActive(currentAdventure)) {
        let nextSession = current;
        let nextAdventure = currentAdventure;
        const events: AdventureExplorationEvent[] = [];
        for (let index = 0; index < fixed.steps; index += 1) {
          const stepped = stepAdventureExploration(nextSession, nextAdventure, HAUNTED_STEP_MS);
          nextSession = stepped.session;
          nextAdventure = stepped.adventure;
          events.push(...stepped.events);
        }

        activateSession(nextSession);
        if (nextAdventure !== currentAdventure) activateAdventure(nextAdventure);

        const transition = events.find((event): event is TransitionRequest => event.type === 'ROOM_TRANSITION_REQUESTED');
        if (transition) {
          beginRoomTransition(nextSession, nextAdventure, transition);
          return;
        }

        if (events.some(event =>
          event.type === 'HALLWAY_CLOCK_INSPECTED'
          || event.type === 'LIVING_ROOM_DOOR_REACHED'
          || event.type === 'LIVING_ROOM_TV_ACTIVATED'
          || event.type === 'LAB_TRANSMISSION_SEEN'
          || event.type === 'LIVING_ROOM_PHOTO_INSPECTED'
          || event.type === 'LIVING_ROOM_RADIO_INSPECTED'
          || event.type === 'LIVING_ROOM_SOURCE_CUE_REVEALED')) {
          void saveCoordinator.persist(gameState(nextSession, nextAdventure), 'milestone').catch(() => undefined);
        }
        return;
      }

      if (currentAdventure.currentRoom !== 'bedroom') return;

      let next = current;
      let saveReason: AdventureSaveReason = 'periodic';
      let falseEscape = false;
      for (let index = 0; index < fixed.steps; index += 1) {
        const stepped = stepHauntedSession(next, HAUNTED_STEP_MS);
        next = stepped.state;
        if (stepped.events.some((event) => event.type === 'DOMESTIC_INTERACTION')) saveReason = 'interaction';
        if (stepped.events.some((event) => event.type === 'ESCAPE_READY')) saveReason = 'milestone';
        if (stepped.events.some((event) => event.type === 'SESSION_FAILED')) saveReason = 'terminal';
        if (stepped.events.some((event) => event.type === 'SESSION_COMPLETED')) falseEscape = true;
      }

      activateSession(next);
      if (falseEscape) {
        beginFalseEscape(next, currentAdventure);
        return;
      }
      void saveCoordinator.persist(gameState(next, currentAdventure), saveReason).catch(() => undefined);
    }, 16);

    return () => clearInterval(timer);
  }, [view, saveCoordinator]);

  function activateSession(next: HauntedSessionState) {
    sessionRef.current = next;
    setSession(next);
  }

  function activateAdventure(next: AdventureState) {
    adventureCoordinatorRef.current.restore(next);
    adventureRef.current = next;
    setAdventure(next);
  }

  function activateGameSession(next: AdventureGameSessionState) {
    activateAdventure(next.adventure);
    activateSession(next.haunted);
  }

  function resetRuntimeClocks() {
    accumulatorMsRef.current = 0;
    lastFrameMsRef.current = null;
    presentationRef.current.reset();
  }

  function clearTransitionTimers() {
    for (const timer of transitionTimersRef.current) clearTimeout(timer);
    transitionTimersRef.current = [];
    transitionLockRef.current = false;
    setTransitionPhase('idle');
  }

  function runRoomFade(midpoint: () => void) {
    if (transitionLockRef.current) return;
    transitionLockRef.current = true;
    setTransitionPhase('fade-out');
    const outTimer = setTimeout(() => {
      midpoint();
      setTransitionPhase('fade-in');
      const inTimer = setTimeout(() => {
        setTransitionPhase('idle');
        transitionLockRef.current = false;
      }, 200);
      transitionTimersRef.current.push(inTimer);
    }, 170);
    transitionTimersRef.current.push(outTimer);
  }

  function beginFalseEscape(completedSession: HauntedSessionState, currentAdventure: AdventureState) {
    runRoomFade(() => {
      const transformed = applyFalseEscape(completedSession, currentAdventure);
      resetRuntimeClocks();
      activateAdventure(transformed.adventure);
      activateSession(transformed.session);
      void saveCoordinator.persist(gameState(transformed.session, transformed.adventure), 'milestone').catch(() => undefined);
    });
  }

  function beginRoomTransition(currentSession: HauntedSessionState, currentAdventure: AdventureState, request: TransitionRequest) {
    runRoomFade(() => {
      adventureCoordinatorRef.current.restore(currentAdventure);
      const result = adventureCoordinatorRef.current.transition(request.targetRoom, request.targetEntry);
      if (result.status !== 'ok') return;
      const spawned = applyRoomSpawn(currentSession, result.spawn);
      resetRuntimeClocks();
      activateAdventure(result.state);
      activateSession(spawned);
      void saveCoordinator.persist(gameState(spawned, result.state), 'room-transition').catch(() => undefined);
    });
  }

  function leaveScreenshotMode() {
    screenshotScenarioRef.current = null;
  }

  function handleScreenshotScenario(scenario: HauntedScreenshotScenario) {
    if (!testHooksEnabled) return;
    clearTransitionTimers();
    screenshotScenarioRef.current = scenario;
    resetRuntimeClocks();
    activateAdventure(createScreenshotAdventureState(scenario));
    activateSession(createHauntedScreenshotScenario(scenario));
    setView('game');
  }

  async function handleNewGame(overwrite = false) {
    leaveScreenshotMode();
    if (canContinue && !overwrite) {
      Alert.alert('Replace saved game?', 'Starting a new game will replace the current haunted run.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => void handleNewGame(true) },
      ]);
      return;
    }

    setBusy(true);
    try {
      clearTransitionTimers();
      const next = createAdventureGameSession(`run-${Date.now()}`);
      await saves.save(next);
      saveCoordinator.markRestored(next);
      resetRuntimeClocks();
      activateGameSession(next);
      setCanContinue(true);
      setView('game');
    } catch {
      Alert.alert('New game unavailable', 'The haunted run could not be initialized.');
    } finally {
      setBusy(false);
    }
  }

  async function handleContinue() {
    leaveScreenshotMode();
    setBusy(true);
    try {
      clearTransitionTimers();
      const result = await saves.read();
      if (result.status === 'none') {
        setCanContinue(false);
        Alert.alert('No saved game', 'Start a new haunted run first.');
        return;
      }
      if (result.status === 'invalid') {
        setCanContinue(false);
        Alert.alert('Saved game unavailable', 'The save is incompatible or corrupted. Start a new run to replace it.');
        return;
      }
      saveCoordinator.markRestored(result.state);
      resetRuntimeClocks();
      activateGameSession(result.state);
      setView('game');
    } catch {
      Alert.alert('Continue unavailable', 'The saved haunted run could not be read from device storage.');
    } finally {
      setBusy(false);
    }
  }

  function handleHeldControl(control: HauntedHeldControl, pressed: boolean) {
    if (screenshotScenarioRef.current !== null || transitionLockRef.current) return;
    const current = sessionRef.current;
    if (!current || current.objective.phase === 'failed') return;
    if (!isAdventureExplorationActive(adventureRef.current) && current.objective.phase === 'completed') return;
    activateSession({ ...current, input: setHeldControl(current.input, control, pressed) });
  }

  function handleAction(control: HauntedActionControl) {
    if (screenshotScenarioRef.current !== null || transitionLockRef.current) return;
    const current = sessionRef.current;
    if (!current || current.objective.phase === 'failed') return;
    const exploration = isAdventureExplorationActive(adventureRef.current);
    if (!exploration && current.objective.phase === 'completed') return;
    if (exploration && control === 'attack') return;
    activateSession({ ...current, input: pressAction(current.input, control) });
  }

  async function handleRestart() {
    leaveScreenshotMode();
    clearTransitionTimers();
    const current = sessionRef.current;
    if (!current) return;
    const next = createAdventureGameSession(current.runId);
    resetRuntimeClocks();
    activateGameSession(next);
    try {
      await saveCoordinator.persist(next, 'milestone');
    } catch {
      Alert.alert('Restart not saved', 'The run restarted, but the reset state was not persisted.');
    }
  }

  async function handleExit() {
    const screenshotMode = screenshotScenarioRef.current !== null;
    leaveScreenshotMode();
    clearTransitionTimers();
    const current = sessionRef.current;
    if (current && !screenshotMode) {
      await saveCoordinator.persist(gameState(current, adventureRef.current), 'exit-menu').catch(() => undefined);
    }
    resetRuntimeClocks();
    setView('menu');
  }

  async function handleDebugRoomToggle() {
    if (!testHooksEnabled || screenshotScenarioRef.current !== null || transitionLockRef.current) return;
    const currentSession = sessionRef.current;
    if (!currentSession) return;
    let currentAdventure = adventureCoordinatorRef.current.snapshot();
    if (!isAdventureExplorationActive(currentAdventure) || !currentAdventure.storyFlags.hallwayUnlocked) {
      const prepared = applyFalseEscape({ ...currentSession, objective: { phase: 'completed' } }, currentAdventure);
      activateAdventure(prepared.adventure);
      activateSession(prepared.session);
      currentAdventure = prepared.adventure;
    }
    const request: TransitionRequest = currentAdventure.currentRoom === 'bedroom'
      ? { type: 'ROOM_TRANSITION_REQUESTED', targetRoom: 'hallway', targetEntry: 'hallway-from-bedroom' }
      : { type: 'ROOM_TRANSITION_REQUESTED', targetRoom: 'bedroom', targetEntry: 'bedroom-from-hallway' };
    beginRoomTransition(sessionRef.current ?? currentSession, currentAdventure, request);
  }

  function queueSettingsChange(makePatch: SettingsPatchFactory) {
    settingsQueueRef.current = settingsQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const current = settingsRef.current;
        const next = await updateSettings.execute(current, makePatch(current));
        settingsRef.current = next;
        setGameSettings(next);
      })
      .catch(() => Alert.alert('Settings not saved', 'The requested setting could not be persisted.'));
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" />
      {view === 'menu' && (
        <MainMenu
          busy={busy}
          canContinue={canContinue}
          onContinue={() => void handleContinue()}
          onNewGame={() => void handleNewGame(false)}
          onSettings={() => setView('settings')}
        />
      )}
      {view === 'settings' && (
        <SettingsScreen
          settings={gameSettings}
          onBack={() => setView('menu')}
          onToggleAudio={() => queueSettingsChange((current) => ({ audioEnabled: !current.audioEnabled }))}
          onMusicVolumeStep={(delta) => queueSettingsChange((current) => ({ musicVolume: current.musicVolume + delta }))}
          onSfxVolumeStep={(delta) => queueSettingsChange((current) => ({ sfxVolume: current.sfxVolume + delta }))}
          onToggleControlLayout={() => queueSettingsChange((current) => ({ touchControlLayout: current.touchControlLayout === 'standard' ? 'mirrored' : 'standard' }))}
        />
      )}
      {view === 'game' && session !== null && (
        <HauntedGameScreen
          session={session}
          adventure={adventure}
          transitionPhase={transitionPhase}
          presentationRuntime={presentationRef.current}
          touchControlLayout={gameSettings.touchControlLayout}
          onHeldControl={handleHeldControl}
          onAction={handleAction}
          onRestart={() => void handleRestart()}
          onExit={() => void handleExit()}
        />
      )}
      <ScreenshotScenarioController enabled={testHooksEnabled} onSelect={handleScreenshotScenario} />
      <AdventureDebugController
        enabled={testHooksEnabled && view === 'game' && screenshotScenarioRef.current === null}
        currentRoom={adventure.currentRoom}
        onToggleRoom={() => void handleDebugRoomToggle()}
      />
    </View>
  );
}

function gameState(haunted: HauntedSessionState, adventure: AdventureState): AdventureGameSessionState {
  return { schemaVersion: 3, haunted, adventure };
}

function applyRoomSpawn(state: HauntedSessionState, spawn: RoomEntryPoint): HauntedSessionState {
  return {
    ...state,
    player: {
      ...state.player,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      grounded: true,
      facing: spawn.facing,
    },
    domestic: {
      ...state.domestic,
      player: { x: Math.round(spawn.x), facing: spawn.facing },
    },
    input: createHauntedInputState(),
  };
}