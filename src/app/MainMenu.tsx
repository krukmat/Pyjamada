import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RETRO_PALETTE } from '../game/render/VisualLanguage';

type Props = {
  busy: boolean;
  canContinue: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onSettings: () => void;
};

type MenuTier = 'primary' | 'secondary';

export function MainMenu({ busy, canContinue, onContinue, onNewGame, onSettings }: Props) {
  return (
    <View testID="main-menu-screen" style={styles.container}>
      <View style={styles.poster}>
        <View style={styles.starRow}>
          <View style={[styles.star, { backgroundColor: RETRO_PALETTE.cyan }]} />
          <View style={[styles.star, { backgroundColor: RETRO_PALETTE.magenta }]} />
          <View style={[styles.star, { backgroundColor: RETRO_PALETTE.yellow }]} />
        </View>
        <Text style={styles.eyebrow}>A NIGHT-TIME ADVENTURE</Text>
        <Text style={styles.title}>PYJAMADA</Text>
        <Text style={styles.subtitle}>SYSTEMIC MORNING CHAOS · v0.9</Text>

        <View style={styles.rule} />
        <Text style={styles.sectionLabel}>ADVENTURE</Text>
        <MenuButton testID="continue-button" label="CONTINUE" tier="primary" disabled={busy || !canContinue} onPress={onContinue} />
        {!canContinue && !busy && <Text style={styles.disabledHint}>NO SAVED GAME YET</Text>}
        <MenuButton testID="new-game-button" label={busy ? 'WORKING…' : 'NEW GAME'} tier="primary" disabled={busy} onPress={onNewGame} />
        <MenuButton testID="settings-button" label="SETTINGS" tier="secondary" disabled={busy} onPress={onSettings} />

        <Text style={styles.footer}>ONE ROOM · MANY CONSEQUENCES · ANDROID</Text>
      </View>
    </View>
  );
}

function MenuButton({ testID, label, disabled, onPress, tier }: { testID: string; label: string; disabled: boolean; onPress: () => void; tier: MenuTier }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.button,
        tier === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: RETRO_PALETTE.void, padding: 24 },
  poster: { width: '100%', maxWidth: 420, padding: 24, alignItems: 'center', gap: 10, borderWidth: 4, borderColor: RETRO_PALETTE.purpleDark, backgroundColor: RETRO_PALETTE.panel },
  starRow: { flexDirection: 'row', gap: 16, marginBottom: 2 },
  star: { width: 7, height: 7 },
  eyebrow: { color: RETRO_PALETTE.cyan, fontFamily: 'monospace', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: RETRO_PALETTE.yellow, fontFamily: 'monospace', fontSize: 42, fontWeight: '900', letterSpacing: 4, textShadowColor: RETRO_PALETTE.magentaDark, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  subtitle: { color: RETRO_PALETTE.magenta, fontFamily: 'monospace', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  rule: { width: '82%', height: 3, backgroundColor: RETRO_PALETTE.blueDark, marginVertical: 4 },
  sectionLabel: { width: '82%', color: RETRO_PALETTE.cyanDark, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  button: { width: '82%', minHeight: 48, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderRightWidth: 6, borderBottomWidth: 6, backgroundColor: RETRO_PALETTE.panelRaised },
  buttonPrimary: { borderColor: RETRO_PALETTE.yellowDark },
  buttonSecondary: { minHeight: 44, borderColor: RETRO_PALETTE.cyanDark },
  pressed: { transform: [{ translateX: 2 }, { translateY: 3 }], borderRightWidth: 3, borderBottomWidth: 3, opacity: 0.78 },
  disabled: { opacity: 0.25 },
  buttonText: { color: RETRO_PALETTE.ink, fontFamily: 'monospace', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  disabledHint: { width: '82%', marginTop: -6, color: RETRO_PALETTE.purple, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', textAlign: 'right' },
  footer: { marginTop: 10, color: RETRO_PALETTE.purple, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', textAlign: 'center' },
});
