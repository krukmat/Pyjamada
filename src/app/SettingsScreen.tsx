import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VISUAL_TOKENS } from '../game/render/VisualLanguage';
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
        <View style={styles.headerRail}>
          <Text style={styles.kicker}>PYJAMADA // SYSTEM PANEL</Text>
          <Text style={styles.headerCode}>CFG-01</Text>
        </View>
        <Text style={styles.title}>SETTINGS</Text>
        <Text style={styles.subtitle}>TUNE THE MORNING. THE RULES STAY MEAN.</Text>

        <SectionLabel>AUDIO</SectionLabel>
        <SettingRow label="MASTER" badge="PWR" value={settings.audioEnabled ? 'ON' : 'OFF'} onDecrease={onToggleAudio} onIncrease={onToggleAudio} />
        <VolumeRow label="MUSIC" badge="MUS" value={settings.musicVolume} onDecrease={() => onMusicVolumeStep(-0.1)} onIncrease={() => onMusicVolumeStep(0.1)} />
        <VolumeRow label="SFX" badge="SFX" value={settings.sfxVolume} onDecrease={() => onSfxVolumeStep(-0.1)} onIncrease={() => onSfxVolumeStep(0.1)} />

        <SectionLabel>CONTROLS</SectionLabel>
        <SettingRow label="LAYOUT" badge="PAD" value={settings.touchControlLayout.toUpperCase()} onDecrease={onToggleControlLayout} onIncrease={onToggleControlLayout} />

        <Pressable testID="settings-back-button" accessibilityRole="button" onPress={onBack} style={({ pressed }: { pressed: boolean }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backArrow}>◀</Text>
          <Text style={styles.backText}>BACK TO MENU</Text>
        </Pressable>

        <Text style={styles.note}>VALUES ARE PERSISTED · AUDIO PLAYBACK REMAINS DEFERRED</Text>
      </View>
    </View>
  );
}

type RowProps = { label: string; badge: string; value: string; onDecrease: () => void; onIncrease: () => void };

function SettingRow({ label, badge, value, onDecrease, onIncrease }: RowProps) {
  return (
    <View style={styles.row}>
      <SettingIdentity label={label} badge={badge} />
      <View style={styles.valueControls}>
        <SmallButton label="−" onPress={onDecrease} />
        <Text style={styles.value}>{value}</Text>
        <SmallButton label="+" onPress={onIncrease} />
      </View>
    </View>
  );
}

function VolumeRow({ label, badge, value, onDecrease, onIncrease }: { label: string; badge: string; value: number; onDecrease: () => void; onIncrease: () => void }) {
  return (
    <View style={styles.volumeRow}>
      <View style={styles.volumeHeader}>
        <SettingIdentity label={label} badge={badge} />
        <Text style={styles.volumeValue}>{Math.round(value * 100)}%</Text>
      </View>
      <View style={styles.volumeControls}>
        <SmallButton label="−" onPress={onDecrease} />
        <View style={styles.meterShell}><PixelMeter value={value} segments={8} accent={VISUAL_TOKENS.feedback.energy} /></View>
        <SmallButton label="+" onPress={onIncrease} />
      </View>
    </View>
  );
}

function SettingIdentity({ label, badge }: { label: string; badge: string }) {
  return (
    <View style={styles.identity}>
      <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>
      <Text style={styles.label}>{label}</Text>
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
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: VISUAL_TOKENS.environment.void, padding: 20 },
  panel: { width: '100%', maxWidth: 440, padding: 18, gap: 9, borderWidth: 4, borderRightWidth: 8, borderBottomWidth: 8, borderColor: VISUAL_TOKENS.ui.panelEdge, backgroundColor: VISUAL_TOKENS.ui.panel },
  headerRail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 6, borderBottomWidth: 2, borderBottomColor: VISUAL_TOKENS.ui.panelEdge },
  kicker: { color: VISUAL_TOKENS.ui.cyan, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  headerCode: { color: VISUAL_TOKENS.ui.magenta, fontFamily: 'monospace', fontSize: 8, fontWeight: '900' },
  title: { color: VISUAL_TOKENS.ui.yellow, fontFamily: 'monospace', fontSize: 30, fontWeight: '900', letterSpacing: 3, textShadowColor: VISUAL_TOKENS.ui.magentaDark, textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 0 },
  subtitle: { color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', marginTop: -5 },
  row: { minHeight: 54, borderWidth: 2, borderColor: VISUAL_TOKENS.environment.floorDeep, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: VISUAL_TOKENS.ui.panelRaised },
  volumeRow: { minHeight: 70, borderWidth: 2, borderColor: VISUAL_TOKENS.environment.floorDeep, paddingHorizontal: 10, paddingVertical: 8, gap: 7, backgroundColor: VISUAL_TOKENS.ui.panelRaised },
  volumeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  volumeControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { minWidth: 32, height: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: VISUAL_TOKENS.environment.wallDeep, borderWidth: 2, borderColor: VISUAL_TOKENS.ui.cyanDark },
  badgeText: { color: VISUAL_TOKENS.ui.cyan, fontFamily: 'monospace', fontSize: 7, fontWeight: '900' },
  label: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  volumeValue: { color: VISUAL_TOKENS.ui.yellow, fontFamily: 'monospace', fontWeight: '900', fontSize: 10 },
  valueControls: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  value: { color: VISUAL_TOKENS.interactive.focusLight, minWidth: 74, textAlign: 'center', fontFamily: 'monospace', fontWeight: '900', fontSize: 10 },
  meterShell: { flex: 1, paddingHorizontal: 4 },
  smallButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: VISUAL_TOKENS.environment.wallDeep, borderWidth: 2, borderRightWidth: 4, borderBottomWidth: 4, borderColor: VISUAL_TOKENS.ui.magentaDark },
  smallButtonText: { color: VISUAL_TOKENS.ui.yellow, fontFamily: 'monospace', fontSize: 17, fontWeight: '900' },
  backButton: { marginTop: 6, minHeight: 46, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: VISUAL_TOKENS.ui.panelRaised, borderWidth: 3, borderRightWidth: 6, borderBottomWidth: 6, borderColor: VISUAL_TOKENS.ui.yellowDark },
  backArrow: { color: VISUAL_TOKENS.interactive.focus, fontFamily: 'monospace', fontSize: 10, fontWeight: '900' },
  backText: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  pressed: { opacity: 0.76, transform: [{ translateX: 2 }, { translateY: 2 }], borderRightWidth: 2, borderBottomWidth: 2 },
  note: { color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 7, lineHeight: 12, textAlign: 'center', marginTop: 1 },
});
