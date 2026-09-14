import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StatusBar, View } from 'react-native';
import { HauntedGameScreen } from './src/app/HauntedGameScreen';
import { createHauntedScreenshotScenario, type HauntedScreenshotScenario } from './src/app/HauntedScreenshotScenarios';
import { MainMenu } from './src/app/MainMenu';
import { ScreenshotScenarioController } from './src/app/ScreenshotScenarioController';
import { SettingsScreen } from './src/app/SettingsScreen';
import { isTestHooksEnabled } from './src/app/testHooks';
import { advanceFixedStep, HAUNTED_STEP_MS } from './src/game/haunted/FixedStepClock';
import { pressAction, setHeldControl, type HauntedActionControl, type HauntedHeldControl } from './src/game/haunted/HauntedInput';
import { HauntedSaveCoordinator, type HauntedSaveReason } from './src/game/haunted/HauntedSaveCoordinator';
import { createHauntedSession, stepHauntedSession, type HauntedSessionState } from './src/game/haunted/HauntedSessionRuntime';
import { systemAnimationClock } from './src/game/presentation/AnimationClock';
import { PresentationRuntime } from './src/game/presentation/PresentationRuntime';
import { AsyncStorageGameSettingsRepository } from './src/platform/settings/AsyncStorageGameSettingsRepository';
import { AsyncStorageHauntedGameSaveRepository } from './src/platform/storage/AsyncStorageHauntedGameSaveRepository';
import { DEFAULT_GAME_SETTINGS, type GameSettings, type GameSettingsPatch } from './src/settings/core/GameSettings';
import { LoadGameSettingsUseCase } from './src/settings/usecases/LoadGameSettingsUseCase';
import { UpdateGameSettingsUseCase } from './src/settings/usecases/UpdateGameSettingsUseCase';

type AppView = 'menu' | 'settings' | 'game';
type SettingsPatchFactory = (current: GameSettings) => GameSettingsPatch;

export default function App() {
  const [view, setView] = useState<AppView>('menu');
  const [session, setSession] = useState<HauntedSessionState | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [canContinue, setCanContinue] = useState(false);

  const sessionRef = useRef<HauntedSessionState | null>(null);
  const presentationRef = useRef(new PresentationRuntime(systemAnimationClock));
  const settingsRef = useRef<GameSettings>(DEFAULT_GAME_SETTINGS);
  const settingsQueueRef = useRef<Promise<void>>(Promise.resolve());
  const accumulatorMsRef = useRef(0);
  const lastFrameMsRef = useRef<number | null>(null);
  const screenshotScenarioRef = useRef<HauntedScreenshotScenario | null>(null);
  const testHooksEnabled = isTestHooksEnabled();

  const saves = useMemo(() => new AsyncStorageHauntedGameSaveRepository(), []);
  const saveCoordinator = useMemo(() => new HauntedSaveCoordinator(saves), [saves]);
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

  useEffect(() => {
    if (view !== 'game') {
      accumulatorMsRef.current = 0;
      lastFrameMsRef.current = null;
      return;
    }

    const timer = setInterval(() => {
      if (screenshotScenarioRef.current !== null) {
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

      let next = current;
      let saveReason: HauntedSaveReason = 'periodic';
      for (let index = 0; index < fixed.steps; index += 1) {
        const stepped = stepHauntedSession(next, HAUNTED_STEP_MS);
        next = stepped.state;
        if (stepped.events.some((event) => event.type === 'DOMESTIC_INTERACTION')) saveReason = 'interaction';
        if (stepped.events.some((event) => event.type === 'ESCAPE_READY')) saveReason = 'milestone';
        if (stepped.events.some((event) => event.type === 'SESSION_FAILED' || event.type === 'SESSION_COMPLETED')) saveReason = 'terminal';
      }

      activateSession(next);
      void saveCoordinator.persist(next, saveReason).catch(() => undefined);
    }, 16);

    return () => clearInterval(timer);
  }, [view, saveCoordinator]);

  function activateSession(next: HauntedSessionState) {
    sessionRef.current = next;
    setSession(next);
  }

  function resetRuntimeClocks() {
    accumulatorMsRef.current = 0;
    lastFrameMsRef.current = null;
    presentationRef.current.reset();
  }

  function leaveScreenshotMode() {
    screenshotScenarioRef.current = null;
  }

  function handleScreenshotScenario(scenario: HauntedScreenshotScenario) {
    if (!testHooksEnabled) return;
    screenshotScenarioRef.current = scenario;
    resetRuntimeClocks();
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
      const next = createHauntedSession(`run-${Date.now()}`);
      await saves.save(next);
      saveCoordinator.markRestored(next);
      resetRuntimeClocks();
      activateSession(next);
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
      activateSession(result.state);
      setView('game');
    } catch {
      Alert.alert('Continue unavailable', 'The saved haunted run could not be read from device storage.');
    } finally {
      setBusy(false);
    }
  }

  function handleHeldControl(control: HauntedHeldControl, pressed: boolean) {
    if (screenshotScenarioRef.current !== null) return;
    const current = sessionRef.current;
    if (!current || current.objective.phase === 'failed' || current.objective.phase === 'completed') return;
    activateSession({ ...current, input: setHeldControl(current.input, control, pressed) });
  }

  function handleAction(control: HauntedActionControl) {
    if (screenshotScenarioRef.current !== null) return;
    const current = sessionRef.current;
    if (!current || current.objective.phase === 'failed' || current.objective.phase === 'completed') return;
    activateSession({ ...current, input: pressAction(current.input, control) });
  }

  async function handleRestart() {
    leaveScreenshotMode();
    const current = sessionRef.current;
    if (!current) return;
    const next = createHauntedSession(current.runId);
    resetRuntimeClocks();
    activateSession(next);
    try {
      await saveCoordinator.persist(next, 'milestone');
    } catch {
      Alert.alert('Restart not saved', 'The run restarted, but the reset state was not persisted.');
    }
  }

  async function handleExit() {
    const screenshotMode = screenshotScenarioRef.current !== null;
    leaveScreenshotMode();
    const current = sessionRef.current;
    if (current && !screenshotMode) await saveCoordinator.persist(current, 'exit-menu').catch(() => undefined);
    resetRuntimeClocks();
    setView('menu');
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
          presentationRuntime={presentationRef.current}
          touchControlLayout={gameSettings.touchControlLayout}
          onHeldControl={handleHeldControl}
          onAction={handleAction}
          onRestart={() => void handleRestart()}
          onExit={() => void handleExit()}
        />
      )}
      <ScreenshotScenarioController enabled={testHooksEnabled} onSelect={handleScreenshotScenario} />
    </View>
  );
}
