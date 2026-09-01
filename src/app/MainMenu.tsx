import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { VISUAL_TOKENS } from '../game/render/VisualLanguage';

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
      <View style={styles.backdropStripeA} />
      <View style={styles.backdropStripeB} />
      <View style={styles.poster}>
        <View style={styles.topRail}>
          <Text style={styles.topRailText}>MORNING OPS // 07:42</Text>
          <View style={styles.liveDot} />
        </View>

        <View style={styles.heroRow}>
          <WallyBadge />
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>DOMESTIC ARCADE ADVENTURE</Text>
            <Text style={styles.title}>PYJAMADA</Text>
            <Text style={styles.subtitle}>ONE ROOM. BAD DECISIONS. GREAT CONSEQUENCES.</Text>
          </View>
        </View>

        <View style={styles.missionCard}>
          <Text style={styles.missionKicker}>TODAY'S MISSION</Text>
          <Text style={styles.missionText}>GET DRESSED · FIND KEYS · KEEP THE HOUSE ASLEEP</Text>
        </View>

        <Text style={styles.sectionLabel}>SELECT RUN</Text>
        <MenuButton testID="continue-button" label="CONTINUE" tier="primary" disabled={busy || !canContinue} onPress={onContinue} />
        {!canContinue && !busy && <Text style={styles.disabledHint}>NO SAVE YET — START SOMETHING MESSY</Text>}
        <MenuButton testID="new-game-button" label={busy ? 'WORKING…' : 'NEW GAME'} tier="primary" disabled={busy} onPress={onNewGame} />
        <MenuButton testID="settings-button" label="SETTINGS" tier="secondary" disabled={busy} onPress={onSettings} />

        <View style={styles.footerRail}>
          <Text style={styles.footer}>6 OBJECTS</Text>
          <Text style={styles.footerAccent}>10 RULES</Text>
          <Text style={styles.footer}>ZERO RANDOMNESS</Text>
        </View>
      </View>
    </View>
  );
}

function WallyBadge() {
  return (
    <View style={styles.wallyBadge} accessibilityLabel="Wally pixel portrait">
      <View style={styles.wallyHair} />
      <View style={styles.wallyHead}>
        <View style={styles.wallyEye} />
        <View style={[styles.wallyEye, styles.wallyEyeRight]} />
      </View>
      <View style={styles.wallyBody} />
      <View style={styles.wallyPajamaStripe} />
      <View style={styles.wallyFeet} />
      <View style={styles.badgeShockA} />
      <View style={styles.badgeShockB} />
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
      style={({ pressed }: { pressed: boolean }) => [styles.button, tier === 'primary' ? styles.buttonPrimary : styles.buttonSecondary, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View style={styles.buttonNotch} />
      <Text style={styles.buttonArrow}>{tier === 'primary' ? '▶' : '◆'}</Text>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: VISUAL_TOKENS.environment.void, padding: 20, overflow: 'hidden' },
  backdropStripeA: { position: 'absolute', width: '140%', height: 26, transform: [{ rotate: '-12deg' }], backgroundColor: VISUAL_TOKENS.environment.wallDeep, top: '22%' },
  backdropStripeB: { position: 'absolute', width: '140%', height: 12, transform: [{ rotate: '-12deg' }], backgroundColor: VISUAL_TOKENS.environment.floorDeep, bottom: '22%' },
  poster: { width: '100%', maxWidth: 440, padding: 20, gap: 10, borderWidth: 4, borderRightWidth: 8, borderBottomWidth: 8, borderColor: VISUAL_TOKENS.ui.panelEdge, backgroundColor: VISUAL_TOKENS.ui.panel },
  topRail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 7, borderBottomWidth: 2, borderBottomColor: VISUAL_TOKENS.ui.panelEdge },
  topRailText: { color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  liveDot: { width: 7, height: 7, backgroundColor: VISUAL_TOKENS.feedback.noise },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  titleBlock: { flex: 1 },
  eyebrow: { color: VISUAL_TOKENS.ui.cyan, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: VISUAL_TOKENS.ui.yellow, fontFamily: 'monospace', fontSize: 36, fontWeight: '900', letterSpacing: 2, textShadowColor: VISUAL_TOKENS.ui.magentaDark, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  subtitle: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', lineHeight: 11 },
  wallyBadge: { width: 68, height: 82, position: 'relative', backgroundColor: VISUAL_TOKENS.environment.wallDeep, borderWidth: 3, borderColor: VISUAL_TOKENS.ui.cyanDark },
  wallyHair: { position: 'absolute', left: 22, top: 10, width: 26, height: 7, backgroundColor: VISUAL_TOKENS.actor.outline },
  wallyHead: { position: 'absolute', left: 20, top: 16, width: 30, height: 24, backgroundColor: VISUAL_TOKENS.actor.skin, borderWidth: 3, borderColor: VISUAL_TOKENS.actor.outline },
  wallyEye: { position: 'absolute', left: 5, top: 7, width: 4, height: 4, backgroundColor: VISUAL_TOKENS.actor.outline },
  wallyEyeRight: { left: 16 },
  wallyBody: { position: 'absolute', left: 16, top: 41, width: 38, height: 28, backgroundColor: VISUAL_TOKENS.actor.pajamas, borderWidth: 3, borderColor: VISUAL_TOKENS.actor.outline },
  wallyPajamaStripe: { position: 'absolute', left: 22, top: 48, width: 26, height: 4, backgroundColor: VISUAL_TOKENS.actor.pajamasLight },
  wallyFeet: { position: 'absolute', left: 18, top: 69, width: 34, height: 7, backgroundColor: VISUAL_TOKENS.actor.slippers },
  badgeShockA: { position: 'absolute', right: 5, top: 7, width: 3, height: 11, backgroundColor: VISUAL_TOKENS.fx.shock, transform: [{ rotate: '20deg' }] },
  badgeShockB: { position: 'absolute', right: 11, top: 3, width: 3, height: 8, backgroundColor: VISUAL_TOKENS.fx.shock, transform: [{ rotate: '-16deg' }] },
  missionCard: { padding: 10, gap: 3, borderWidth: 2, borderColor: VISUAL_TOKENS.interactive.shadow, backgroundColor: VISUAL_TOKENS.ui.panelRaised },
  missionKicker: { color: VISUAL_TOKENS.interactive.focus, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  missionText: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 8, fontWeight: '900' },
  sectionLabel: { color: VISUAL_TOKENS.ui.cyanDark, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginTop: 2 },
  button: { width: '100%', minHeight: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 3, borderRightWidth: 6, borderBottomWidth: 6, backgroundColor: VISUAL_TOKENS.ui.panelRaised, position: 'relative', overflow: 'hidden' },
  buttonPrimary: { borderColor: VISUAL_TOKENS.ui.yellowDark },
  buttonSecondary: { minHeight: 42, borderColor: VISUAL_TOKENS.ui.cyanDark },
  buttonNotch: { position: 'absolute', right: -4, top: -4, width: 20, height: 20, backgroundColor: VISUAL_TOKENS.environment.wallDeep, transform: [{ rotate: '45deg' }] },
  buttonArrow: { color: VISUAL_TOKENS.interactive.focus, fontFamily: 'monospace', fontSize: 10, fontWeight: '900' },
  buttonText: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  pressed: { transform: [{ translateX: 2 }, { translateY: 3 }], borderRightWidth: 3, borderBottomWidth: 3, opacity: 0.82 },
  disabled: { opacity: 0.24 },
  disabledHint: { marginTop: -6, color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', textAlign: 'right' },
  footerRail: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 2, borderTopColor: VISUAL_TOKENS.ui.panelEdge },
  footer: { color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 7, fontWeight: '900' },
  footerAccent: { color: VISUAL_TOKENS.ui.magenta, fontFamily: 'monospace', fontSize: 7, fontWeight: '900' },
});
