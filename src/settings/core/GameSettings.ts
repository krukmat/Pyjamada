export type TouchControlLayout = 'standard' | 'mirrored';

export type GameSettings = {
  schemaVersion: 1;
  audioEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  touchControlLayout: TouchControlLayout;
};

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  schemaVersion: 1,
  audioEnabled: true,
  musicVolume: 0.8,
  sfxVolume: 0.8,
  touchControlLayout: 'standard',
};

export type GameSettingsPatch = Partial<Omit<GameSettings, 'schemaVersion'>>;

export function applyGameSettingsPatch(
  current: GameSettings,
  patch: GameSettingsPatch,
): GameSettings {
  return {
    schemaVersion: 1,
    audioEnabled: patch.audioEnabled ?? current.audioEnabled,
    musicVolume: clampVolume(patch.musicVolume ?? current.musicVolume),
    sfxVolume: clampVolume(patch.sfxVolume ?? current.sfxVolume),
    touchControlLayout: patch.touchControlLayout ?? current.touchControlLayout,
  };
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, Math.round(value * 10) / 10));
}
