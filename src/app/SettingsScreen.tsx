import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RETRO_PALETTE } from '../game/render/VisualLanguage';
import type { GameSettings } from '../settings/core/GameSettings';

type Props = {
  settings: GameSettings;
  onBack: () => void;
  onToggleAudio: () => void;
  onMusicVolumeStep: (delta: -0.1 | 0.1) => void;
  onSfxVolumeStep: (delta: -0.1 | 0.1) => void;
  onToggleControlLayout: () => void;
};

export function SettingsScreen({
  settings,
  onBack,
  onToggleAudio,
  onMusicVolumeStep,
  onSfxVolumeStep,
  onToggleControlLayout,
}: Props) {
  return (
    <View testID="settings-screen" style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.kicker}>PYJAMADA SYSTEM</Text>
        <Text style={styles.title}>SETTINGS</Text>
        <View style={styles.rule} />

        <SettingRow
          label="AUDIO"
          value={settings.audioEnabled ? 'ON' : 'OFF'}
          onDecrease={onToggleAudio}
          onIncrease={onToggleAudio}
        />
        <SettingRow
          label="MUSIC"
          value={`${Math.round(settings.musicVolume * 100)}%`}
          onDecrease={() => onMusicVolumeStep(-0.1)}
          onIncrease={() => onMusicVolumeStep(0.1)}
        />
        <SettingRow
          label="SFX"
          value={`${Math.round(settings.sfxVolume * 100)}%`}
          onDecrease={() => onSfxVolumeStep(-0.1)}
          onIncrease={() => onSfxVolumeStep(0.1)}
        />
        <SettingRow
          label="CONTROLS"
          value={settings.touchControlLayout.toUpperCase()}
          onDecrease={onToggleControlLayout}
          onIncrease={onToggleControlLayout}
        />

        <Pressable
          testID="settings-back-button"
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }: { pressed: boolean }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        <Text style={styles.note}>AUDIO PLAYBACK REMAINS DEFERRED · VALUES ARE PERSISTED</Text>
      </View>
    </View>
  );
}

type RowProps = {
  label: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
};

function SettingRow({ label, value, onDecrease, onIncrease }: RowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueControls}>
        <SmallButton label="−" onPress={onDecrease} />
        <Text style={styles.value}>{value}</Text>
        <SmallButton label="+" onPress={onIncrease} />
      </View>
    </View>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [styles.smallButton, pressed && styles.pressed]}
    >
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: RETRO_PALETTE.void,
    padding: 22,
  },
  panel: {
    width: '100%',
    maxWidth: 430,
    padding: 20,
    gap: 12,
    borderWidth: 4,
    borderColor: RETRO_PALETTE.purple,
    backgroundColor: '#0c0912',
  },
  kicker: {
    color: RETRO_PALETTE.cyan,
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
  },
  title: {
    color: RETRO_PALETTE.yellow,
    fontFamily: 'monospace',
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
  },
  rule: { height: 3, backgroundColor: RETRO_PALETTE.magenta, marginBottom: 4 },
  row: {
    minHeight: 62,
    borderWidth: 2,
    borderColor: RETRO_PALETTE.blue,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171326',
  },
  label: {
    color: RETRO_PALETTE.cyan,
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },
  valueControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: {
    color: RETRO_PALETTE.ink,
    minWidth: 76,
    textAlign: 'center',
    fontFamily: 'monospace',
    fontWeight: '900',
    fontSize: 12,
  },
  smallButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: RETRO_PALETTE.void,
    borderWidth: 2,
    borderColor: RETRO_PALETTE.magenta,
  },
  smallButtonText: { color: RETRO_PALETTE.yellow, fontFamily: 'monospace', fontSize: 20, fontWeight: '900' },
  backButton: {
    marginTop: 6,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171326',
    borderWidth: 3,
    borderColor: RETRO_PALETTE.yellow,
  },
  backText: { color: RETRO_PALETTE.ink, fontFamily: 'monospace', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  pressed: { opacity: 0.65, transform: [{ translateY: 2 }] },
  note: {
    color: RETRO_PALETTE.purple,
    fontFamily: 'monospace',
    fontSize: 8,
    lineHeight: 13,
    textAlign: 'center',
    marginTop: 2,
  },
});
