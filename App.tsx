import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StatusBar } from 'react-native';
import { GameScreen } from './src/app/GameScreen';
import { MainMenu } from './src/app/MainMenu';
import { SettingsScreen } from './src/app/SettingsScreen';
import { systemAnimationClock } from './src/game/presentation/AnimationClock';
import { PresentationRuntime } from './src/game/presentation/PresentationRuntime';
import { mapSystemicUpdateToVisualEvents } from './src/game/presentation/VisualEventMapper';
import { restartSystemicRun, updateSystemicRun } from './src/game/systemic/SystemicRuntime';
import { createSystemicRun, type SystemicInput, type SystemicRunState } from './src/game/systemic/SystemicState';
import { InMemorySystemicTelemetry, recordSystemicUpdate } from './src/game/systemic/SystemicTelemetry';
import { AsyncStorageGameSettingsRepository } from './src/platform/settings/AsyncStorageGameSettingsRepository';
import { AsyncStorageGameSaveRepository } from './src/platform/storage/AsyncStorageGameSaveRepository';
import { DEFAULT_GAME_SETTINGS, type GameSettings, type GameSettingsPatch } from './src/settings/core/GameSettings';
import { LoadGameSettingsUseCase } from './src/settings/usecases/LoadGameSettingsUseCase';
import { UpdateGameSettingsUseCase } from './src/settings/usecases/UpdateGameSettingsUseCase';

type AppView = 'menu' | 'settings' | 'game';
type SettingsPatchFactory = (current: GameSettings) => GameSettingsPatch;

export default function App() {
  const [view, setView] = useState<AppView>('menu');
  const [gameState, setGameState] = useState<SystemicRunState | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [canContinue, setCanContinue] = useState(false);

  const gameStateRef = useRef<SystemicRunState | null>(null);
  const retriesRef = useRef(0);
  const telemetryRef = useRef(new InMemorySystemicTelemetry());
  const presentationRef = useRef(new PresentationRuntime(systemAnimationClock));
  const settingsRef = useRef<GameSettings>(DEFAULT_GAME_SETTINGS);
  const settingsQueueRef = useRef<Promise<void>>(Promise.resolve());

  const saves = useMemo(() => new AsyncStorageGameSaveRepository(), []);
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

  function activateGame(next: SystemicRunState) {
    gameStateRef.current = next;
    setGameState(next);
  }

  function resetRunDiagnostics(next: SystemicRunState) {
    retriesRef.current = 0;
    telemetryRef.current = new InMemorySystemicTelemetry();
    telemetryRef.current.record({ type: 'run_started', runId: next.runId });
    presentationRef.current.reset();
  }

  async function handleNewGame(overwrite = false) {
    if (canContinue && !overwrite) {
      Alert.alert('Replace saved game?', 'Starting a new game will replace the current run.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', style: 'destructive', onPress: () => void handleNewGame(true) },
      ]);
      return;
    }

    setBusy(true);
    try {
      const next = createSystemicRun(`run-${Date.now()}`);
      await saves.save(next);
      resetRunDiagnostics(next);
      activateGame(next);
      setCanContinue(true);
      setView('game');
    } catch {
      Alert.alert('New game unavailable', 'The initial game state could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  async function handleContinue() {
    setBusy(true);
    try {
      const result = await saves.read();
      if (result.status === 'none') {
        setCanContinue(false);
        Alert.alert('No saved game', 'Start a new game first.');
        return;
      }
      if (result.status === 'invalid') {
        setCanContinue(false);
        Alert.alert('Saved game unavailable', 'The saved run is incompatible or corrupted. Start a new game to replace it.');
        return;
      }
      resetRunDiagnostics(result.state);
      activateGame(result.state);
      setView('game');
    } catch {
      Alert.alert('Continue unavailable', 'The saved game could not be read from device storage.');
    } finally {
      setBusy(false);
    }
  }

  async function handleInput(input: SystemicInput) {
    const current = gameStateRef.current;
    if (current === null) return;
    const result = updateSystemicRun(current, input);
    recordSystemicUpdate(telemetryRef.current, current, input, result, retriesRef.current);
    presentationRef.current.push(mapSystemicUpdateToVisualEvents(current, result));
    activateGame(result.state);
    try {
      await saves.save(result.state);
    } catch {
      Alert.alert('Progress not saved', 'Gameplay can continue, but the latest state was not persisted.');
    }
  }

  async function handleRestart() {
    const current = gameStateRef.current;
    if (current === null) return;
    retriesRef.current += 1;
    const result = restartSystemicRun(current);
    telemetryRef.current.record({ type: 'run_restarted', runId: current.runId, retries: retriesRef.current });
    presentationRef.current.push(mapSystemicUpdateToVisualEvents(current, result));
    activateGame(result.state);
    try {
      await saves.save(result.state);
    } catch {
      Alert.alert('Restart not saved', 'The run restarted, but the reset state was not persisted.');
    }
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
      .catch(() => {
        Alert.alert('Settings not saved', 'The requested setting could not be persisted.');
      });
  }

  return (
    <>
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
      {view === 'game' && gameState !== null && (
        <GameScreen
          state={gameState}
          presentationRuntime={presentationRef.current}
          touchControlLayout={gameSettings.touchControlLayout}
          onInput={(input) => void handleInput(input)}
          onRestart={() => void handleRestart()}
          onExit={() => {
            presentationRef.current.reset();
            setView('menu');
          }}
        />
      )}
    </>
  );
}
