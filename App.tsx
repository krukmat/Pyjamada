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
import { EndingScreen } from './src/app/EndingScreen';
import { DEFAULT_DEMO_PROFILE, HUMAN_PROFILES, type HumanProfileId } from './src/game/bot/HumanProfiles';
import { formatDemoMoment, nextDemoMoment, type DemoFrame, type DemoMoment } from './src/app/DemoFilm';
import { isTestHooksEnabled } from './src/app/testHooks';
import {
  applyFirstVisitRecovery,
  isExplorationCombatEnabled,
  applyFalseEscape,
  isAdventureExplorationActive,
  stepAdventureExploration,
  type AdventureExplorationEvent,
} from './src/game/adventure/AdventureExplorationRuntime';
import {
  beginAdventureEnding,
  completeAdventureEnding,
  getAdventureEndingPhase,
  isAdventureEndingActive,
  isAdventureEndingComplete,
  shouldBeginAdventureEnding,
} from './src/game/adventure/AdventureEnding';
import { AdventureSaveCoordinator, type AdventureSaveReason } from './src/game/adventure/AdventureSaveCoordinator';
import { createAdventureGameSession, type AdventureGameSessionState } from './src/game/adventure/AdventureGameSession';
import { getAdventureDifficulty, type AdventureDifficulty } from './src/game/adventure/AdventureDifficulty';
import { AdventureSessionCoordinator } from './src/game/adventure/AdventureSessionCoordinator';
import { createAdventureState, type AdventureState } from './src/game/adventure/AdventureState';
import { shouldUseLaboratoryCheckpoint } from './src/game/adventure/LaboratoryEncounter';
import { restoreRoomCheckpointState, shouldUseRoomCheckpoint } from './src/game/adventure/RoomCheckpoint';
import { toInput } from './src/game/bot/AdventureBot';
import { HumanBot } from './src/game/bot/HumanBot';
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

type AppView = 'menu' | 'settings' | 'game' | 'ending';
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
  const [completedRun, setCompletedRun] = useState(false);

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
  // Demo: the human-model QA bot plays a throwaway run. It never touches the save.
  const demoBotRef = useRef<HumanBot | null>(null);
  const demoAutoRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [demo, setDemo] = useState(false);
  const demoProfileRef = useRef<HumanProfileId>(DEFAULT_DEMO_PROFILE);
  const [demoLabel, setDemoLabel] = useState('');
  // Demo film: numbered moments (room entries, hits, falls) for maestro/demo-film.yaml.
  const demoFrameRef = useRef<DemoFrame | null>(null);
  const [demoMoment, setDemoMoment] = useState<DemoMoment | null>(null);
  const persistRun: AdventureSaveCoordinator['persist'] = (state, reason) =>
    demoBotRef.current ? Promise.resolve(false) : saveCoordinator.persist(state, reason);
  const settingsRepository = useMemo(() => new AsyncStorageGameSettingsRepository(), []);
  const loadSettings = useMemo(() => new LoadGameSettingsUseCase(settingsRepository), [settingsRepository]);
  const updateSettings = useMemo(() => new UpdateGameSettingsUseCase(settingsRepository), [settingsRepository]);

  useEffect(() => {
    let active = true;
    void Promise.all([saves.read(), loadSettings.execute()])
      .then(([saved, settings]) => {
        if (!active) return;
        setCanContinue(saved.status === 'ok');
        setCompletedRun(saved.status === 'ok' && isAdventureEndingComplete(saved.state.adventure));
        settingsRef.current = settings;
        setGameSettings(settings);
      })
      .catch(() => {
        if (!active) return;
        setCanContinue(false);
        setCompletedRun(false);
        settingsRef.current = DEFAULT_GAME_SETTINGS;
        setGameSettings(DEFAULT_GAME_SETTINGS);
      });
    return () => { active = false; };
  }, [loadSettings, saves]);

  useEffect(() => () => clearTransitionTimers(), []);

  useEffect(() => {
    if (!demo || !session) return;
    const frame: DemoFrame = {
      room: adventure.currentRoom,
      hp: session.combat.hp,
      failed: session.objective.phase === 'failed',
      ending: isAdventureEndingActive(adventure),
    };
    const prev = demoFrameRef.current;
    demoFrameRef.current = frame;
    setDemoMoment(current => nextDemoMoment(prev, frame, current));
  }, [demo, session, adventure]);

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
      scheduleDemoAdvance(current);
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
          const stepped = stepAdventureExploration(withDemoInput(nextSession, nextAdventure), nextAdventure, HAUNTED_STEP_MS);
          nextSession = stepped.session;
          nextAdventure = stepped.adventure;
          events.push(...stepped.events);
        }

        activateSession(nextSession);
        if (nextAdventure !== currentAdventure) activateAdventure(nextAdventure);

        if (shouldBeginAdventureEnding(nextAdventure)) {
          void persistRun(gameState(nextSession, nextAdventure), 'milestone').catch(() => undefined);
          beginEndingTransition(nextSession, nextAdventure);
          return;
        }

        const transition = events.find((event): event is TransitionRequest => event.type === 'ROOM_TRANSITION_REQUESTED');
        if (transition) {
          beginRoomTransition(nextSession, nextAdventure, transition);
          return;
        }

        const explorationFailed = current.objective.phase !== 'failed' && nextSession.objective.phase === 'failed';
        if (explorationFailed) {
          void persistRun(gameState(nextSession, nextAdventure), 'terminal').catch(() => undefined);
          return;
        }

        if (events.some(event => event.type === 'BASEMENT_DISCHARGE_HIT' || event.type === 'KITCHEN_SURGE_HIT' || event.type === 'LIVING_ROOM_STATIC_HIT' || event.type === 'ATTIC_CRATE_HIT' || event.type === 'BATHROOM_TWIN_CONTACT_HIT' || event.type === 'BATHROOM_TWIN_HIT' || event.type === 'BATHROOM_TWIN_DISPELLED' || event.type === 'LABORATORY_VESPER_PULSE_HIT' || event.type === 'LABORATORY_RESONATOR_SURGE_HIT' || event.type === 'LABORATORY_NIGHTMARE_ATTACK_HIT' || event.type === 'BEDROOM_REAPER_HIT')) {
          void persistRun(gameState(nextSession, nextAdventure), 'interaction').catch(() => undefined);
          return;
        }

        if (events.some(event =>
          event.type === 'HALLWAY_CLOCK_INSPECTED'
          || event.type === 'LIVING_ROOM_DOOR_REACHED'
          || event.type === 'LIVING_ROOM_TV_ACTIVATED'
          || event.type === 'LAB_TRANSMISSION_SEEN'
          || event.type === 'LIVING_ROOM_PHOTO_INSPECTED'
          || event.type === 'LIVING_ROOM_RADIO_INSPECTED'
          || event.type === 'LIVING_ROOM_SOURCE_CUE_REVEALED'
          || event.type === 'KITCHEN_CIRCUIT_OVERLOADED'
          || event.type === 'KITCHEN_BREAKER_INSPECTED'
          || event.type === 'KITCHEN_POWER_REROUTED'
          || event.type === 'BATHROOM_MIRROR_ANOMALY_SEEN'
          || event.type === 'BATHROOM_LIGHT_TESTED'
          || event.type === 'BATHROOM_ROUTE_REVEALED'
          || event.type === 'ATTIC_LOG_INSPECTED'
          || event.type === 'ATTIC_SENSORS_INSPECTED'
          || event.type === 'ATTIC_RECORDER_INCOMPLETE'
          || event.type === 'ATTIC_EXPERIMENT_REVEALED'
          || event.type === 'ATTIC_BASEMENT_ROUTE_REVEALED'
          || event.type === 'BASEMENT_FAULT_TRACED'
          || event.type === 'BASEMENT_RELAY_NEEDS_TRACE'
          || event.type === 'BASEMENT_POWER_STABILIZED'
          || event.type === 'BASEMENT_TERMINAL_OFFLINE'
          || event.type === 'BASEMENT_CONTROL_REVEALED'
          || event.type === 'BASEMENT_FAILSAFE_REJECTED'
          || event.type === 'BASEMENT_LABORATORY_ROUTE_REVEALED'
          || event.type === 'LABORATORY_ENCOUNTER_STARTED'
          || event.type === 'LABORATORY_CONTROL_DEVICE_DISABLED'
          || event.type === 'LABORATORY_VESPER_CONTROL_BROKEN'
          || event.type === 'LABORATORY_RESONATOR_NODE_DISABLED'
          || event.type === 'LABORATORY_RESONATOR_DESTABILIZED'
          || event.type === 'LABORATORY_NIGHTMARE_HIT_ACCEPTED'
          || event.type === 'LABORATORY_VESPER_NIGHTMARE_DEFEATED'
          || event.type === 'LABORATORY_ENCOUNTER_COMPLETED'
          || event.type === 'ENDING_EVIDENCE_CONFIRMED'
          || event.type === 'ENDING_GHOST_STING_REVEALED')) {
          void persistRun(gameState(nextSession, nextAdventure), 'milestone').catch(() => undefined);
        }
        return;
      }

      if (currentAdventure.currentRoom !== 'bedroom') return;

      let next = current;
      let saveReason: AdventureSaveReason = 'periodic';
      let falseEscape = false;
      for (let index = 0; index < fixed.steps; index += 1) {
        const stepped = stepHauntedSession(withDemoInput(next, currentAdventure), HAUNTED_STEP_MS);
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
      void persistRun(gameState(next, currentAdventure), saveReason).catch(() => undefined);
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
      void persistRun(gameState(transformed.session, transformed.adventure), 'milestone').catch(() => undefined);
    });
  }

  function beginEndingTransition(currentSession: HauntedSessionState, currentAdventure: AdventureState) {
    runRoomFade(() => {
      const started = beginAdventureEnding(currentSession, currentAdventure);
      resetRuntimeClocks();
      activateAdventure(started.adventure);
      activateSession(started.session);
      void persistRun(gameState(started.session, started.adventure), 'milestone').catch(() => undefined);
    });
  }

  function beginRoomTransition(currentSession: HauntedSessionState, currentAdventure: AdventureState, request: TransitionRequest) {
    runRoomFade(() => {
      adventureCoordinatorRef.current.restore(currentAdventure);
      const result = adventureCoordinatorRef.current.transition(request.targetRoom, request.targetEntry);
      if (result.status !== 'ok') return;
      const spawned = applyRoomSpawn(applyFirstVisitRecovery(currentSession, currentAdventure, request.targetRoom), result.spawn);
      resetRuntimeClocks();
      activateAdventure(result.state);
      activateSession(spawned);
      void persistRun(gameState(spawned, result.state), 'room-transition').catch(() => undefined);
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
    const nextAdventure = createScreenshotAdventureState(scenario);
    activateAdventure(nextAdventure);
    activateSession(createHauntedScreenshotScenario(scenario));
    setView(isAdventureEndingComplete(nextAdventure) ? 'ending' : 'game');
  }

  async function handleNewGame(difficulty: AdventureDifficulty, overwrite = false) {
    leaveScreenshotMode();
    if (canContinue && !overwrite) {
      Alert.alert('Replace saved game?', 'Starting a new game will replace the current haunted run.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => void handleNewGame(difficulty, true) },
      ]);
      return;
    }

    setBusy(true);
    try {
      clearTransitionTimers();
      const next = createAdventureGameSession(`run-${Date.now()}`, difficulty);
      await saves.save(next);
      saveCoordinator.markRestored(next);
      resetRuntimeClocks();
      activateGameSession(next);
      setCanContinue(true);
      setCompletedRun(false);
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
      // A save from a death in the house, or mid Laboratory phase, resumes at its checkpoint.
      let restoredState = shouldUseLaboratoryCheckpoint(result.state.adventure) || shouldUseRoomCheckpoint(result.state.haunted, result.state.adventure)
        ? checkpointState(result.state.haunted, result.state.adventure)
        : result.state;
      if (shouldBeginAdventureEnding(restoredState.adventure)) {
        const started = beginAdventureEnding(restoredState.haunted, restoredState.adventure);
        restoredState = gameState(started.session, started.adventure);
      }
      saveCoordinator.markRestored(restoredState);
      resetRuntimeClocks();
      activateGameSession(restoredState);
      if (restoredState !== result.state) {
        await persistRun(restoredState, 'milestone').catch(() => undefined);
      }
      const endingComplete = isAdventureEndingComplete(restoredState.adventure);
      setCompletedRun(endingComplete);
      setView(endingComplete ? 'ending' : 'game');
    } catch {
      Alert.alert('Continue unavailable', 'The saved haunted run could not be read from device storage.');
    } finally {
      setBusy(false);
    }
  }

  function withDemoInput(state: HauntedSessionState, currentAdventure: AdventureState): HauntedSessionState {
    const bot = demoBotRef.current;
    return bot ? { ...state, input: toInput(bot.act({ session: state, adventure: currentAdventure })) } : state;
  }

  /** In the demo nobody presses RETRY or END NIGHT: the App does it after a short beat. */
  function scheduleDemoAdvance(current: HauntedSessionState) {
    if (!demoBotRef.current || demoAutoRef.current !== null) return;
    const failed = current.objective.phase === 'failed';
    if (!failed && getAdventureEndingPhase(adventureRef.current) !== 'ghost-sting') return;
    demoAutoRef.current = setTimeout(() => {
      demoAutoRef.current = null;
      if (!demoBotRef.current) return;
      if (!failed) { void handleFinishEnding(); return; }
      // A bedroom death restarts the run; the bot starts over with it.
      if (!isAdventureExplorationActive(adventureRef.current)) demoBotRef.current = new HumanBot({ ...HUMAN_PROFILES[demoProfileRef.current], seed: `demo-${Date.now()}` });
      void handleRestart();
    }, 1_800);
  }

  function stopDemo() {
    if (demoAutoRef.current !== null) clearTimeout(demoAutoRef.current);
    demoAutoRef.current = null;
    demoBotRef.current = null;
    demoFrameRef.current = null;
    setDemoMoment(null);
    setDemo(false);
  }

  function handleDemo(profile: HumanProfileId, difficulty: AdventureDifficulty) {
    leaveScreenshotMode();
    clearTransitionTimers();
    const next = createAdventureGameSession(`demo-${Date.now()}`, difficulty);
    demoProfileRef.current = profile;
    setDemoLabel(`DEMO · ${profile.toUpperCase()} · LEVEL ${difficulty}`);
    demoBotRef.current = new HumanBot({ ...HUMAN_PROFILES[profile], seed: next.haunted.runId });
    demoFrameRef.current = null;
    setDemoMoment(null);
    setDemo(true);
    resetRuntimeClocks();
    activateGameSession(next);
    setView('game');
  }

  function handleHeldControl(control: HauntedHeldControl, pressed: boolean) {
    if (demoBotRef.current) return;
    if (screenshotScenarioRef.current !== null || transitionLockRef.current) return;
    const current = sessionRef.current;
    if (!current || current.objective.phase === 'failed') return;
    if (!isAdventureExplorationActive(adventureRef.current) && current.objective.phase === 'completed') return;
    activateSession({ ...current, input: setHeldControl(current.input, control, pressed) });
  }

  function handleAction(control: HauntedActionControl) {
    if (demoBotRef.current) return;
    if (screenshotScenarioRef.current !== null || transitionLockRef.current) return;
    const current = sessionRef.current;
    if (!current || current.objective.phase === 'failed') return;
    const exploration = isAdventureExplorationActive(adventureRef.current);
    if (!exploration && current.objective.phase === 'completed') return;
    if (exploration && control === 'attack' && !isExplorationCombatEnabled(adventureRef.current)) return;
    activateSession({ ...current, input: pressAction(current.input, control) });
  }

  async function handleFinishEnding() {
    leaveScreenshotMode();
    clearTransitionTimers();
    const current = sessionRef.current;
    if (!current) return;
    const nextAdventure = completeAdventureEnding(adventureRef.current);
    if (nextAdventure === adventureRef.current) return;

    const completed = gameState(current, nextAdventure);
    try {
      await persistRun(completed, 'terminal');
      activateAdventure(nextAdventure);
      resetRuntimeClocks();
      if (demoBotRef.current) {
        stopDemo();
      } else {
        setCanContinue(true);
        setCompletedRun(true);
      }
      setView('ending');
    } catch {
      Alert.alert('Ending not saved', 'The ending could not be persisted. Try END NIGHT again.');
    }
  }

  async function handleRestart() {
    leaveScreenshotMode();
    clearTransitionTimers();
    const current = sessionRef.current;
    if (!current) return;
    const currentAdventure = adventureRef.current;

    if (shouldUseLaboratoryCheckpoint(currentAdventure) || shouldUseRoomCheckpoint(current, currentAdventure)) {
      const restored = checkpointState(current, currentAdventure);
      resetRuntimeClocks();
      activateGameSession(restored);
      try {
        await persistRun(restored, 'milestone');
      } catch {
        Alert.alert('Retry not saved', 'The room restarted, but the checkpoint state was not persisted.');
      }
      return;
    }

    const next = createAdventureGameSession(current.runId, getAdventureDifficulty(currentAdventure));
    resetRuntimeClocks();
    activateGameSession(next);
    try {
      await persistRun(next, 'milestone');
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
      await persistRun(gameState(current, adventureRef.current), 'exit-menu').catch(() => undefined);
    }
    stopDemo();
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
    <View style={{ flex: 1, backgroundColor: '#0b0a12' }}>
      <StatusBar barStyle="light-content" />
      {view === 'menu' && (
        <MainMenu
          busy={busy}
          canContinue={canContinue}
          completedRun={completedRun}
          onContinue={() => void handleContinue()}
          onNewGame={(difficulty) => void handleNewGame(difficulty)}
          onDemo={handleDemo}
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
      {view === 'ending' && (
        <EndingScreen
          onPlayAgain={() => void handleNewGame(getAdventureDifficulty(adventureRef.current), true)}
          onMenu={() => setView('menu')}
        />
      )}
      {view === 'game' && session !== null && (
        <HauntedGameScreen
          demo={demo}
          demoLabel={demoLabel}
          demoMoment={demo && demoMoment ? formatDemoMoment(demoMoment) : undefined}
          session={session}
          adventure={adventure}
          transitionPhase={transitionPhase}
          presentationRuntime={presentationRef.current}
          touchControlLayout={gameSettings.touchControlLayout}
          onHeldControl={handleHeldControl}
          onAction={handleAction}
          onRestart={() => void handleRestart()}
          onFinishEnding={() => void handleFinishEnding()}
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

function checkpointState(haunted: HauntedSessionState, adventure: AdventureState): AdventureGameSessionState {
  const restored = restoreRoomCheckpointState(haunted, adventure);
  return gameState(restored.session, restored.adventure);
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