import { updateGame } from '../src/game/core/GameRuntime';
import { createInitialGameState } from '../src/game/core/GameState';
import { decodeGameState, encodeGameState } from '../src/game/core/GameStateCodec';
import { ContinueSavedGameUseCase } from '../src/game/usecases/ContinueSavedGameUseCase';
import { deepEqual, equal, test } from './assert';
import { FakeGameSavePort } from './FakeGameSavePort';

async function run() {
  await test('CU-02 reports no-save and disables Continue when nothing is stored', async () => {
    const useCase = new ContinueSavedGameUseCase(new FakeGameSavePort());
    equal(await useCase.isAvailable(), false, 'availability');
    deepEqual(await useCase.execute(), { status: 'no-save' }, 'result');
  });

  await test('CU-02 enables Continue only for a compatible save', async () => {
    const saved = updateGame(updateGame(createInitialGameState(), 'right').state, 'right').state;
    const useCase = new ContinueSavedGameUseCase(new FakeGameSavePort(saved));
    equal(await useCase.isAvailable(), true, 'availability');
    const result = await useCase.execute();
    equal(result.status, 'resumed', 'status');
    if (result.status === 'resumed') deepEqual(result.gameState, saved, 'state');
  });

  await test('CU-02 keeps Continue disabled for invalid persistence', async () => {
    const useCase = new ContinueSavedGameUseCase(new FakeGameSavePort(null, true));
    equal(await useCase.isAvailable(), false, 'availability');
    deepEqual(await useCase.execute(), { status: 'invalid-save' }, 'invalid');
  });

  await test('CU-05 codec round-trips valid V1 state', async () => {
    const state = updateGame(createInitialGameState(), 'left').state;
    const decoded = decodeGameState(encodeGameState(state));
    equal(decoded.status, 'ok', 'decode');
    if (decoded.status === 'ok') deepEqual(decoded.gameState, state, 'roundtrip');
  });

  await test('CU-05 rejects malformed/unsupported saves', async () => {
    equal(decodeGameState('{bad').status, 'invalid-save', 'malformed');
    equal(
      decodeGameState(JSON.stringify({ ...createInitialGameState(), schemaVersion: 99 })).status,
      'invalid-save',
      'schema',
    );
  });

  await test('CU-05 rejects unsafe player coordinates', async () => {
    const invalid = {
      ...createInitialGameState(),
      player: { ...createInitialGameState().player, x: 999 },
    };
    equal(decodeGameState(JSON.stringify(invalid)).status, 'invalid-save', 'coordinate bounds');
  });

  await test('CU-05 rejects inconsistent or unknown progression state', async () => {
    const unknownFlag = {
      ...createInitialGameState(),
      flags: { unexpectedFutureFlag: true },
    };
    const impossibleRoom = {
      ...createInitialGameState(),
      roomId: 'room-02',
    };
    equal(decodeGameState(JSON.stringify(unknownFlag)).status, 'invalid-save', 'unknown flag');
    equal(decodeGameState(JSON.stringify(impossibleRoom)).status, 'invalid-save', 'room progression');
  });
}

void run();
