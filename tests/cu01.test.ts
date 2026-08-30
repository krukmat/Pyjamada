import { createInitialGameState, INITIAL_ROOM_ID } from '../src/game/core/GameState';
import { StartNewGameUseCase } from '../src/game/usecases/StartNewGameUseCase';
import { deepEqual, equal, test } from './assert';
import { FakeGameSavePort } from './FakeGameSavePort';

async function run() {
  await test('CU-01 creates and persists deterministic initial state', async () => {
    const port = new FakeGameSavePort();
    const result = await new StartNewGameUseCase(port).execute();
    equal(result.status, 'started', 'status');
    if (result.status !== 'started') return;
    deepEqual(result.gameState, createInitialGameState(), 'state');
    equal(result.gameState.roomId, INITIAL_ROOM_ID, 'room');
    equal(port.saveCount, 1, 'writes');
  });

  await test('CU-01 never overwrites a valid save silently', async () => {
    const port = new FakeGameSavePort({
      ...createInitialGameState(),
      player: { ...createInitialGameState().player, x: 64 },
    });
    const result = await new StartNewGameUseCase(port).execute(false);
    deepEqual(result, { status: 'confirmation-required' }, 'confirmation');
    equal(port.saveCount, 0, 'writes');
  });

  await test('CU-01 also requires confirmation before replacing an invalid save', async () => {
    const port = new FakeGameSavePort(null, true);
    const result = await new StartNewGameUseCase(port).execute(false);
    deepEqual(result, { status: 'confirmation-required' }, 'confirmation');
    equal(port.saveCount, 0, 'writes');
  });

  await test('CU-01 confirmed replacement is a single overwrite write', async () => {
    const port = new FakeGameSavePort(createInitialGameState());
    const result = await new StartNewGameUseCase(port).execute(true);
    equal(result.status, 'started', 'status');
    equal(port.clearCount, 0, 'clears');
    equal(port.saveCount, 1, 'writes');
    deepEqual(port.snapshot(), createInitialGameState(), 'replacement');
  });
}

void run();
