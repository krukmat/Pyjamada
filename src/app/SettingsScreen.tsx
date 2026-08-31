import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RETRO_PALETTE } from '../game/render/VisualLanguage';
import type { GameSettings } from '../settings/core/GameSettings';
import { PixelMeter, SectionLabel } from './RetroUiKit';

type Props = {
  settings: GameSettings;
  onBack: () => void;
  onToggleAudio: () => void;
  onMusicVolumeStep: (delta: -0.1 | 0.1) => void;
  onSfxVolumeStep: (delta: -0.1 | 0.1) => void;
  onToggleControlLayout: () => void;
};

export function SettingsScreen({ settings, onBack, onToggleAudio, onMusicVolumeStep, onSfxVolumeStep, onToggleControlLayout }: Props) {
  return (
    <View testID="settings-screen" style={styles.container}>
      <View style={styles.panel}>
        <Text style={styles.kicker}>PYJAMADA SYSTEM</Text>
        <Text style={styles.title}>SETTINGS</Text>
        <View style={styles.rule} />

        <SectionLabel>AUDIO</SectionLabel>
        <SettingRow label="MASTER" value={settings.audioEnabled ? 'ON' : 'OFF'} onDecrease={onToggleAudio} onIncrease={onToggleAudio} />
        <VolumeRow label="MUSIC" value={settings.musicVolume} onDecrease={() => onMusicVolumeStep(-0.1)} onIncrease={() => onMusicVolumeStep(0.1)} />
        <VolumeRow label="SFX" value={settings.sfxVolume} onDecrease={() => onSfxVolumeStep(-0.1)} onIncrease={() => onSfxVolumeStep(0.1)} />

        <SectionLabel>CONTROLS</SectionLabel>
        <SettingRow label="LAYOUT" value={settings.touchControlLayout.toUpperCase()} onDecrease={onToggleControlLayout} onIncrease={onToggleControlLayout} />

        <Pressable testID="settings-back-button" accessibilityRole="button" onPress={onBack} style={({ pressed }: { pressed: boolean }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>

        <Text style={styles.note}>AUDIO PLAYBACK REMAINS DEFERRED · VALUES ARE PERSISTED</Text>
      </View>
    </View>
  );
}

type RowProps = { label: string; value: string; onDecrease: () => void; onIncrease: () => void };

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

function VolumeRow({ label, value, onDecrease, onIncrease }: { label: string; value: number; onDecrease: () => void; onIncrease: () => void }) {
  return (
    <View style={styles.volumeRow}>
      <View style={styles.volumeHeader}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.volumeValue}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.volumeControls}>
        <SmallButton label="−" onPress={onDecrease} />
        <PixelMeter value={value} segments={8} accent={RETRO_PALETTE.green} />
        <SmallButton label="+" onPress={onIncrease} />
      </View>
    </View>
  );
}

function SmallButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }: { pressed: boolean }) => [styles.smallButton, pressed && styles.pressed]}>
      <Text style={styles.smallButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: RETRO_PALETTE.void, padding: 22 },
  panel: { width: '100%', maxWidth: 430, padding: 20, gap: 10, borderWidth: 4, borderColor: RETRO_PALETTE.purpleDark, backgroundColor: RETRO_PALETTE.panel },
  kicker: { color: RETRO_PALETTE.cyan, fontFamily: 'monospace', fontSize: 9, fontWeight: '900', letterSpacing: 2, textAlign: 'center' },
  title: { color: RETRO_PALETTE.yellow, fontFamily: 'monospace', fontSize: 32, fontWeight: '900', letterSpacing: 4, textAlign: 'center', textShadowColor: RETRO_PALETTE.magentaDark, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  rule: { height: 3, backgroundColor: RETRO_PALETTE.magentaDark, marginBottom: 2 },
  row: { minHeight: 54, borderWidth: 2, borderColor: RETRO_PALETTE.blueDark, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: RETRO_PALETTE.panelRaised },
  volumeRow: { minHeight: 68, borderWidth: 2, borderColor: RETRO_PALETTE.blueDark, paddingHorizontal: 12, paddingVertical: 8, gap: 7, backgroundColor: RETRO_PALETTE.panelRaised },
  volumeHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  volumeControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { color: RETRO_PALETTE.cyan, fontFamily: 'monospace', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  volumeValue: { color: RETRO_PALETTE.yellow, fontFamily: 'monospace', fontWeight: '900', fontSize: 10 },
  valueControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  value: { color: RETRO_PALETTE.ink, minWidth: 76, textAlign: 'center', fontFamily: 'monospace', fontWeight: '900', fontSize: 11 },
  smallButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: RETRO_PALETTE.void, borderWidth: 2, borderRightWidth: 4, borderBottomWidth: 4, borderColor: RETRO_PALETTE.magentaDark },
  smallButtonText: { color: RETRO_PALETTE.yellow, fontFamily: 'monospace', fontSize: 18, fontWeight: '900' },
  backButton: { marginTop: 6, minHeight: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: RETRO_PALETTE.panelRaised, borderWidth: 3, borderRightWidth: 6, borderBottomWidth: 6, borderColor: RETRO_PALETTE.yellowDark },
  backText: { color: RETRO_PALETTE.ink, fontFamily: 'monospace', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  pressed: { opacity: 0.72, transform: [{ translateX: 2 }, { translateY: 2 }], borderRightWidth: 2, borderBottomWidth: 2 },
  note: { color: RETRO_PALETTE.purple, fontFamily: 'monospace', fontSize: 8, lineHeight: 13, textAlign: 'center', marginTop: 2 },
});
