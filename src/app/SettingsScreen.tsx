import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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
    <View style={styles.container}>
      <Text style={styles.title}>SETTINGS</Text>
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
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }: { pressed: boolean }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Text style={styles.backText}>BACK</Text>
      </Pressable>

      <Text style={styles.note}>
        Audio values are persisted now; actual source-faithful audio playback remains deferred.
      </Text>
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
    backgroundColor: '#0a0812',
    padding: 24,
    gap: 14,
  },
  title: {
    color: '#f6d365',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 3,
    textAlign: 'center',
    marginBottom: 16,
  },
  row: {
    minHeight: 68,
    borderWidth: 2,
    borderColor: '#57406f',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { color: '#b9abc8', fontSize: 15, fontWeight: '800', letterSpacing: 1 },
  valueControls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  value: { color: '#fff7d6', minWidth: 76, textAlign: 'center', fontWeight: '800' },
  smallButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2037',
    borderWidth: 1,
    borderColor: '#f6d365',
  },
  smallButtonText: { color: '#fff7d6', fontSize: 22, fontWeight: '900' },
  backButton: {
    marginTop: 12,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#57406f',
    borderWidth: 2,
    borderColor: '#f6d365',
  },
  backText: { color: '#fff7d6', fontSize: 17, fontWeight: '900', letterSpacing: 1 },
  pressed: { opacity: 0.7 },
  note: { color: '#766987', fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 6 },
});
