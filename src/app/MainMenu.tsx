import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  busy: boolean;
  canContinue: boolean;
  onContinue: () => void;
  onNewGame: () => void;
  onSettings: () => void;
};

export function MainMenu({ busy, canContinue, onContinue, onNewGame, onSettings }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>PYJAMADA</Text>
      <Text style={styles.subtitle}>Android V1 · CU-01 + CU-02 + CU-03 + CU-06</Text>

      <MenuButton label="CONTINUE" disabled={busy || !canContinue} onPress={onContinue} />
      <MenuButton label={busy ? 'WORKING…' : 'NEW GAME'} disabled={busy} onPress={onNewGame} />
      <MenuButton label="SETTINGS" disabled={busy} onPress={onSettings} />
    </View>
  );
}

function MenuButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#0a0812', padding: 24 },
  title: { color: '#f6d365', fontSize: 42, fontWeight: '900', letterSpacing: 3 },
  subtitle: { color: '#b9abc8', fontSize: 14, marginBottom: 12, textAlign: 'center' },
  button: { minWidth: 210, paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#57406f', borderWidth: 2, borderColor: '#f6d365', alignItems: 'center' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.35 },
  buttonText: { color: '#fff7d6', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
});
