import {
  DEFAULT_GAME_SETTINGS,
  applyGameSettingsPatch,
} from '../src/settings/core/GameSettings';
import {
  decodeGameSettings,
  encodeGameSettings,
  safeDecodeGameSettings,
} from '../src/settings/core/GameSettingsCodec';
import { LoadGameSettingsUseCase } from '../src/settings/usecases/LoadGameSettingsUseCase';
import { UpdateGameSettingsUseCase } from '../src/settings/usecases/UpdateGameSettingsUseCase';
import { deepEqual, equal, test } from './assert';
import { FakeGameSettingsPort } from './FakeGameSettingsPort';

async function run() {
  await test('CU-06 uses stable defaults when no settings exist', async () => {
    deepEqual(safeDecodeGameSettings(null), DEFAULT_GAME_SETTINGS, 'default settings');
  });

  await test('CU-06 persists audio enabled, music volume, SFX volume and touch layout', async () => {
    const port = new FakeGameSettingsPort(DEFAULT_GAME_SETTINGS);
    const update = new UpdateGameSettingsUseCase(port);
    const load = new LoadGameSettingsUseCase(port);

    let settings = await update.execute(DEFAULT_GAME_SETTINGS, { audioEnabled: false });
    settings = await update.execute(settings, { musicVolume: 0.4 });
    settings = await update.execute(settings, { sfxVolume: 0.6 });
    settings = await update.execute(settings, { touchControlLayout: 'mirrored' });

    const restored = await load.execute();
    equal(restored.audioEnabled, false, 'audio enabled');
    equal(restored.musicVolume, 0.4, 'music volume');
    equal(restored.sfxVolume, 0.6, 'SFX volume');
    equal(restored.touchControlLayout, 'mirrored', 'touch layout');
    equal(port.saveCount, 4, 'settings save count');
  });

  await test('CU-06 clamps volume settings to safe 0..1 increments', async () => {
    const high = applyGameSettingsPatch(DEFAULT_GAME_SETTINGS, { musicVolume: 1.8 });
    const low = applyGameSettingsPatch(DEFAULT_GAME_SETTINGS, { sfxVolume: -0.5 });
    const rounded = applyGameSettingsPatch(DEFAULT_GAME_SETTINGS, { musicVolume: 0.46 });

    equal(high.musicVolume, 1, 'high clamp');
    equal(low.sfxVolume, 0, 'low clamp');
    equal(rounded.musicVolume, 0.5, 'volume rounding');
  });

  await test('CU-06 codec round-trips valid settings', async () => {
    const expected = applyGameSettingsPatch(DEFAULT_GAME_SETTINGS, {
      audioEnabled: false,
      musicVolume: 0.3,
      sfxVolume: 0.7,
      touchControlLayout: 'mirrored',
    });
    const decoded = decodeGameSettings(encodeGameSettings(expected));

    equal(decoded.status, 'ok', 'decode status');
    if (decoded.status !== 'ok') return;
    deepEqual(decoded.settings, expected, 'round-tripped settings');
  });

  await test('CU-06 falls back safely when stored settings are malformed or incompatible', async () => {
    deepEqual(safeDecodeGameSettings('{bad'), DEFAULT_GAME_SETTINGS, 'malformed fallback');
    deepEqual(
      safeDecodeGameSettings(JSON.stringify({ ...DEFAULT_GAME_SETTINGS, schemaVersion: 99 })),
      DEFAULT_GAME_SETTINGS,
      'unsupported version fallback',
    );
  });
}

void run();
