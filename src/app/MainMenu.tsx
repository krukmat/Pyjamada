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
        <Text style={styles.subtitle}>V1.1 · VISUAL BASELINE</Text>

        <View style={styles.rule} />

        <MenuButton
          testID="continue-button"
          label="CONTINUE"
          accent="cyan"
          disabled={busy || !canContinue}
          onPress={onContinue}
        />
        <MenuButton
          testID="new-game-button"
          label={busy ? 'WORKING…' : 'NEW GAME'}
          accent="yellow"
          disabled={busy}
          onPress={onNewGame}
        />
        <MenuButton
          testID="settings-button"
          label="SETTINGS"
          accent="magenta"
          disabled={busy}
          onPress={onSettings}
        />

        <Text style={styles.footer}>128×128 LOGICAL WORLD · ANDROID V1</Text>
      </View>
    </View>
  );
}

function MenuButton({
  testID,
  label,
  disabled,
  onPress,
  accent,
}: {
  testID: string;
  label: string;
  disabled: boolean;
  onPress: () => void;
  accent: 'cyan' | 'yellow' | 'magenta';
}) {
  const borderColor = accent === 'cyan'
    ? RETRO_PALETTE.cyan
    : accent === 'magenta'
      ? RETRO_PALETTE.magenta
      : RETRO_PALETTE.yellow;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [
        styles.button,
        { borderColor },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050509',
    padding: 24,
  },
  poster: {
    width: '100%',
    maxWidth: 420,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    borderWidth: 4,
    borderColor: RETRO_PALETTE.purple,
    backgroundColor: '#0c0912',
  },
  starRow: { flexDirection: 'row', gap: 16, marginBottom: 2 },
  star: { width: 7, height: 7 },
  eyebrow: {
    color: RETRO_PALETTE.cyan,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    color: RETRO_PALETTE.yellow,
    fontFamily: 'monospace',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: 4,
    textShadowColor: RETRO_PALETTE.magenta,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0,
  },
  subtitle: {
    color: RETRO_PALETTE.magenta,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  rule: { width: '78%', height: 3, backgroundColor: RETRO_PALETTE.blue, marginVertical: 4 },
  button: {
    width: '82%',
    minHeight: 54,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    backgroundColor: '#171326',
  },
  pressed: { opacity: 0.65, transform: [{ translateY: 2 }] },
  disabled: { opacity: 0.28 },
  buttonText: {
    color: RETRO_PALETTE.ink,
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  footer: {
    marginTop: 8,
    color: RETRO_PALETTE.purple,
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '900',
    textAlign: 'center',
  },
});
