import { DEFAULT_GAME_SETTINGS, type GameSettings, type TouchControlLayout } from './GameSettings';

export type DecodeSettingsResult =
  | { status: 'ok'; settings: GameSettings }
  | { status: 'invalid-settings'; reason: string };

export function encodeGameSettings(settings: GameSettings): string {
  return JSON.stringify(settings);
}

export function decodeGameSettings(raw: string): DecodeSettingsResult {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return invalid('Settings data is not valid JSON.');
  }

  if (!isRecord(value)) return invalid('Settings root must be an object.');
  if (value.schemaVersion !== 1) return invalid('Unsupported settings schema version.');
  if (typeof value.audioEnabled !== 'boolean') return invalid('Invalid audioEnabled value.');
  if (!isVolume(value.musicVolume)) return invalid('Invalid musicVolume value.');
  if (!isVolume(value.sfxVolume)) return invalid('Invalid sfxVolume value.');
  if (!isTouchControlLayout(value.touchControlLayout)) return invalid('Invalid touchControlLayout value.');

  return {
    status: 'ok',
    settings: {
      schemaVersion: 1,
      audioEnabled: value.audioEnabled,
      musicVolume: value.musicVolume,
      sfxVolume: value.sfxVolume,
      touchControlLayout: value.touchControlLayout,
    },
  };
}

export function safeDecodeGameSettings(raw: string | null): GameSettings {
  if (raw === null) return DEFAULT_GAME_SETTINGS;
  const decoded = decodeGameSettings(raw);
  return decoded.status === 'ok' ? decoded.settings : DEFAULT_GAME_SETTINGS;
}

function isVolume(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

function isTouchControlLayout(value: unknown): value is TouchControlLayout {
  return value === 'standard' || value === 'mirrored';
}

function invalid(reason: string): DecodeSettingsResult {
  return { status: 'invalid-settings', reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
