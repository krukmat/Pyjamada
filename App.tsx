import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StatusBar } from 'react-native';
import { GameScreen } from './src/app/GameScreen';
import { MainMenu } from './src/app/MainMenu';
import { SettingsScreen } from './src/app/SettingsScreen';
import { SystemicGameScreen } from './src/app/SystemicGameScreen';
import { updateGame, type GameInput } from './src/game/core/GameRuntime';
import type { GameState } from './src/game/core/GameState';
import { restartSystemicRun, updateSystemicRun } from './src/game/systemic/SystemicRuntime';
import { createSystemicRun, type SystemicInput, type SystemicRunState } from './src/game/systemic/SystemicState';
import { InMemorySystemicTelemetry, recordSystemicUpdate } from './src/game/systemic/SystemicTelemetry';
import { ContinueSavedGameUseCase } from './src/game/usecases/ContinueSavedGameUseCase';
import { StartNewGameUseCase } from './src/game/usecases/StartNewGameUseCase';
import { AsyncStorageGameSettingsRepository } from './src/platform/settings/AsyncStorageGameSettingsRepository';
import { AsyncStorageGameSaveRepository } from './src/platform/storage/AsyncStorageGameSaveRepository';
import { AsyncStorageSystemicRunRepository } from './src/platform/storage/AsyncStorageSystemicRunRepository';
import { DEFAULT_GAME_SETTINGS, type GameSettings, type GameSettingsPatch } from './src/settings/core/GameSettings';
import { LoadGameSettingsUseCase } from './src/settings/usecases/LoadGameSettingsUseCase';
import { UpdateGameSettingsUseCase } from './src/settings/usecases/UpdateGameSettingsUseCase';

type AppView = 'menu' | 'settings' | 'game' | 'systemic';
type SettingsPatchFactory = (current: GameSettings) => GameSettingsPatch;

export default function App() {
  const [view, setView] = useState<AppView>('menu');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [systemicState, setSystemicState] = useState<SystemicRunState | null>(null);
  const [gameSettings, setGameSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [canContinue, setCanContinue] = useState(false);

  const gameStateRef = useRef<GameState | null>(null);
  const systemicStateRef = useRef<SystemicRunState | null>(null);
  const systemicRetriesRef = useRef(0);
  const systemicTelemetryRef = useRef(new InMemorySystemicTelemetry());
  const settingsRef = useRef<GameSettings>(DEFAULT_GAME_SETTINGS);
  const settingsQueueRef = useRef<Promise<void>>(Promise.resolve());

  const saves = useMemo(() => new AsyncStorageGameSaveRepository(), []);
  const systemicSaves = useMemo(() => new AsyncStorageSystemicRunRepository(), []);
  const settingsRepository = useMemo(() => new AsyncStorageGameSettingsRepository(), []);
  const startNewGame = useMemo(() => new StartNewGameUseCase(saves), [saves]);
  const continueSavedGame = useMemo(() => new ContinueSavedGameUseCase(saves), [saves]);
  const loadSettings = useMemo(() => new LoadGameSettingsUseCase(settingsRepository), [settingsRepository]);
  const updateSettings = useMemo(() => new UpdateGameSettingsUseCase(settingsRepository), [settingsRepository]);

  useEffect(() => {
    let active = true;
    void Promise.all([continueSavedGame.isAvailable(), loadSettings.execute()])
      .then(([available, settings]) => {
        if (!active) return;
        setCanContinue(available);
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
  }, [continueSavedGame, loadSettings]);

  function activateGameState(next: GameState) { gameStateRef.current = next; setGameState(next); }
  function activateSystemicState(next: SystemicRunState) { systemicStateRef.current = next; setSystemicState(next); }

  async function handleNewGame(overwrite = false) {
    setBusy(true);
    try {
      const result = await startNewGame.execute(overwrite);
      if (result.status === 'confirmation-required') {
        Alert.alert('Replace saved game?', 'Starting a new game will replace the existing V1 save.', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Replace', style: 'destructive', onPress: () => void handleNewGame(true) },
        ]);
        return;
      }
      setCanContinue(true);
      activateGameState(result.gameState);
      setView('game');
    } catch { Alert.alert('New game unavailable', 'The initial game state could not be saved.'); }
    finally { setBusy(false); }
  }

  async function handleContinue() {
    setBusy(true);
    try {
      const result = await continueSavedGame.execute();
      if (result.status === 'no-save') { setCanContinue(false); Alert.alert('No saved game', 'Start a new game first.'); return; }
      if (result.status === 'invalid-save') { setCanContinue(false); Alert.alert('Saved game unavailable', 'The existing V1 save is incompatible or corrupted. Start a new game to replace it.'); return; }
      activateGameState(result.gameState);
      setView('game');
    } catch { Alert.alert('Continue unavailable', 'The saved game could not be read from device storage.'); }
    finally { setBusy(false); }
  }

  async function handleInput(input: GameInput) {
    const current = gameStateRef.current;
    if (current === null) return;
    const result = updateGame(current, input);
    activateGameState(result.state);
    try { await saves.save(result.state); }
    catch { Alert.alert('Progress not saved', 'Gameplay can continue, but the latest state was not persisted.'); return; }
    if (result.events.some((event) => event.type === 'SLICE_COMPLETED')) Alert.alert('Vertical slice reached', 'CU-03 validation path reached room-03.');
  }

  function handleStartSystemic() {
    const next = createSystemicRun(`systemic-${Date.now()}`);
    systemicRetriesRef.current = 0;
    systemicTelemetryRef.current = new InMemorySystemicTelemetry();
    systemicTelemetryRef.current.record({ type: 'run_started', runId: next.runId });
    activateSystemicState(next);
    setView('systemic');
    void systemicSaves.save(next).catch(() => undefined);
  }

  async function handleSystemicInput(input: SystemicInput) {
    const current = systemicStateRef.current;
    if (current === null) return;
    const result = updateSystemicRun(current, input);
    recordSystemicUpdate(systemicTelemetryRef.current, current, input, result, systemicRetriesRef.current);
    activateSystemicState(result.state);
    try { await systemicSaves.save(result.state); }
    catch { Alert.alert('Prototype state not saved', 'The run can continue, but its diagnostic snapshot was not persisted.'); }
  }

  async function handleSystemicRestart() {
    const current = systemicStateRef.current;
    if (current === null) return;
    systemicRetriesRef.current += 1;
    const result = restartSystemicRun(current);
    systemicTelemetryRef.current.record({ type: 'run_restarted', runId: current.runId, retries: systemicRetriesRef.current });
    activateSystemicState(result.state);
    try { await systemicSaves.save(result.state); } catch { /* diagnostic persistence only */ }
  }

  function queueSettingsChange(makePatch: SettingsPatchFactory) {
    settingsQueueRef.current = settingsQueueRef.current.catch(() => undefined).then(async () => {
      const current = settingsRef.current;
      const next = await updateSettings.execute(current, makePatch(current));
      settingsRef.current = next;
      setGameSettings(next);
    }).catch(() => { Alert.alert('Settings not saved', 'The requested setting could not be persisted.'); });
  }

  return (
    <>
      <StatusBar barStyle="light-content" />
      {view === 'menu' && <MainMenu busy={busy} canContinue={canContinue} onContinue={() => void handleContinue()} onNewGame={() => void handleNewGame(false)} onSystemic={handleStartSystemic} onSettings={() => setView('settings')} />}
      {view === 'settings' && <SettingsScreen settings={gameSettings} onBack={() => setView('menu')} onToggleAudio={() => queueSettingsChange((current) => ({ audioEnabled: !current.audioEnabled }))} onMusicVolumeStep={(delta) => queueSettingsChange((current) => ({ musicVolume: current.musicVolume + delta }))} onSfxVolumeStep={(delta) => queueSettingsChange((current) => ({ sfxVolume: current.sfxVolume + delta }))} onToggleControlLayout={() => queueSettingsChange((current) => ({ touchControlLayout: current.touchControlLayout === 'standard' ? 'mirrored' : 'standard' }))} />}
      {view === 'game' && gameState !== null && <GameScreen gameState={gameState} touchControlLayout={gameSettings.touchControlLayout} onInput={(input) => void handleInput(input)} />}
      {view === 'systemic' && systemicState !== null && <SystemicGameScreen state={systemicState} onInput={(input) => void handleSystemicInput(input)} onRestart={() => void handleSystemicRestart()} onExit={() => setView('menu')} />}
    </>
  );
}
