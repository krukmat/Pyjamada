import { updateGame } from '../src/game/core/GameRuntime';
import type { GameState } from '../src/game/core/GameState';
import { ContinueSavedGameUseCase } from '../src/game/usecases/ContinueSavedGameUseCase';
import { StartNewGameUseCase } from '../src/game/usecases/StartNewGameUseCase';
import { DEFAULT_GAME_SETTINGS } from '../src/settings/core/GameSettings';
import { UpdateGameSettingsUseCase } from '../src/settings/usecases/UpdateGameSettingsUseCase';
import { deepEqual, equal, test } from './assert';
import { FakeGameSavePort } from './FakeGameSavePort';
import { FakeGameSettingsPort } from './FakeGameSettingsPort';

function advance(state: GameState, input: 'left' | 'right' | 'action', times = 1): GameState {
  let current = state;
  for (let index = 0; index < times; index += 1) current = updateGame(current, input).state;
  return current;
}

async function run() {
  await test('V1 integration: New Game -> CU-03 -> persist -> Continue restores final state', async () => {
    const saves = new FakeGameSavePort();
    const start = await new StartNewGameUseCase(saves).execute();
    equal(start.status, 'started', 'new game status');
    if (start.status !== 'started') return;

    let state = start.gameState;
    state = advance(state, 'right', 20);
    state = advance(state, 'action');
    state = advance(state, 'right', 8);
    state = advance(state, 'right', 26);
    await saves.save(state);

    equal(state.roomId, 'room-03', 'slice room');
    equal(state.flags.verticalSliceReached, true, 'slice flag');

    const resumed = await new ContinueSavedGameUseCase(saves).execute();
    equal(resumed.status, 'resumed', 'continue status');
    if (resumed.status === 'resumed') deepEqual(resumed.gameState, state, 'restored final state');
  });

  await test('V1 integration: CU-06 settings remain independent from game save', async () => {
    const saves = new FakeGameSavePort();
    const started = await new StartNewGameUseCase(saves).execute();
    if (started.status !== 'started') throw new Error('new game failed');
    const beforeSettings = saves.snapshot();

    const settings = new FakeGameSettingsPort(DEFAULT_GAME_SETTINGS);
    const updateSettings = new UpdateGameSettingsUseCase(settings);
    let current = await updateSettings.execute(DEFAULT_GAME_SETTINGS, { touchControlLayout: 'mirrored' });
    current = await updateSettings.execute(current, { musicVolume: 0.2 });

    equal(current.touchControlLayout, 'mirrored', 'control layout');
    equal(current.musicVolume, 0.2, 'music volume');
    deepEqual(saves.snapshot(), beforeSettings, 'game save unchanged by settings');
  });
}

void run();
