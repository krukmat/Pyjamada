import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VISUAL_TOKENS } from '../game/render/VisualLanguage';

type Props = {
  onPlayAgain: () => void;
  onMenu: () => void;
};

export function EndingScreen({ onPlayAgain, onMenu }: Props) {
  return (
    <View testID="ending-screen" style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.kicker}>NIGHT COMPLETE</Text>
        <Text style={styles.title}>GOOD MORNING, WALLY.</Text>
        <Text style={styles.body}>
          The Resonator is silent. The burned sensor tag on the floor is not a dream.
        </Text>
        <View style={styles.rule} />
        <Text style={styles.sting}>One tiny face at the window suggests the house disagrees.</Text>
        <View style={styles.credits}>
          <Text style={styles.creditKicker}>PYJAMADA</Text>
          <Text style={styles.credit}>HAUNTED HOUSE ADVENTURE</Text>
          <Text style={styles.creditMuted}>React Native · TypeScript · Skia</Text>
        </View>
        <Pressable
          testID="ending-play-again-button"
          accessibilityRole="button"
          accessibilityLabel="Play again"
          onPress={onPlayAgain}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>PLAY AGAIN</Text>
        </Pressable>
        <Pressable
          testID="ending-menu-button"
          accessibilityRole="button"
          accessibilityLabel="Back to main menu"
          onPress={onMenu}
          style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>BACK TO MENU</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: VISUAL_TOKENS.environment.void,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    gap: 12,
    padding: 22,
    borderWidth: 4,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderColor: VISUAL_TOKENS.ui.panelEdge,
    backgroundColor: VISUAL_TOKENS.ui.panel,
  },
  kicker: {
    color: VISUAL_TOKENS.ui.cyan,
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
  },
  title: {
    color: VISUAL_TOKENS.ui.yellow,
    fontFamily: 'monospace',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  body: {
    color: VISUAL_TOKENS.ui.ink,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '800',
    lineHeight: 16,
  },
  rule: { height: 2, backgroundColor: VISUAL_TOKENS.ui.panelEdge },
  sting: {
    color: VISUAL_TOKENS.ui.magenta,
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '900',
    lineHeight: 14,
  },
  credits: {
    gap: 3,
    padding: 10,
    borderWidth: 2,
    borderColor: VISUAL_TOKENS.interactive.shadow,
    backgroundColor: VISUAL_TOKENS.ui.panelRaised,
  },
  creditKicker: {
    color: VISUAL_TOKENS.interactive.focus,
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 2,
  },
  credit: {
    color: VISUAL_TOKENS.ui.ink,
    fontFamily: 'monospace',
    fontSize: 9,
    fontWeight: '900',
  },
  creditMuted: {
    color: VISUAL_TOKENS.ui.inkMuted,
    fontFamily: 'monospace',
    fontSize: 8,
    fontWeight: '800',
  },
  button: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderColor: VISUAL_TOKENS.ui.yellowDark,
    backgroundColor: VISUAL_TOKENS.ui.panelRaised,
  },
  secondary: { borderColor: VISUAL_TOKENS.ui.cyanDark },
  pressed: { transform: [{ translateX: 2 }, { translateY: 3 }], opacity: 0.82 },
  buttonText: {
    color: VISUAL_TOKENS.ui.ink,
    fontFamily: 'monospace',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
});
