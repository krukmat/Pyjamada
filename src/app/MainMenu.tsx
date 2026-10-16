import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Canvas, useImage } from '@shopify/react-native-skia';
import { HAUNTED_WALLY_ATLAS_SOURCE } from '../game/presentation/AssetSources';
import { AtlasSprite } from '../game/presentation/atlas/AtlasSprite';
import { HAUNTED_WALLY_ATLAS } from '../game/presentation/atlas/HauntedWallyAtlas';
import { createSpriteAtlasIndex, requireAtlasFrame } from '../game/presentation/atlas/SpriteAtlas';
import { VISUAL_TOKENS } from '../game/render/VisualLanguage';
import { ADVENTURE_DIFFICULTIES, DIFFICULTY_PROFILES, type AdventureDifficulty } from '../game/adventure/AdventureDifficulty';
import { DEFAULT_DEMO_PROFILE, HUMAN_PROFILE_IDS, type HumanProfileId } from '../game/bot/HumanProfiles';

/** The DEMO starts on the average player at level 2 unless another is picked. */
const DEFAULT_DEMO_LEVEL: AdventureDifficulty = 2;

// The menu portrait reuses Wally's sleepy eye-rubbing gameplay frame.
const PORTRAIT_FRAME = requireAtlasFrame(createSpriteAtlasIndex(HAUNTED_WALLY_ATLAS), 'pajamas_15');
const PORTRAIT_SCALE = 1.5;

type Props = {
  busy: boolean;
  canContinue: boolean;
  completedRun: boolean;
  onContinue: () => void;
  onNewGame: (difficulty: AdventureDifficulty) => void;
  /** Watch the QA bot play a throwaway run (never saved) as this player, on this level. */
  onDemo: (profile: HumanProfileId, difficulty: AdventureDifficulty) => void;
  onSettings: () => void;
};

type MenuTier = 'primary' | 'secondary';

export function MainMenu({ busy, canContinue, completedRun, onContinue, onNewGame, onDemo, onSettings }: Props) {
  const [choosingLevel, setChoosingLevel] = useState(false);
  const [demoSetup, setDemoSetup] = useState(false);
  const [demoProfile, setDemoProfile] = useState<HumanProfileId>(DEFAULT_DEMO_PROFILE);
  const [demoLevel, setDemoLevel] = useState<AdventureDifficulty>(DEFAULT_DEMO_LEVEL);
  return (
    <View testID="main-menu-screen" style={styles.container}>
      <View style={styles.backdropStripeA} />
      <View style={styles.backdropStripeB} />
      <View style={styles.poster}>
        {/* Landscape: the title card on the left, the run choices on the right. */}
        <View style={styles.column}>
          <View style={styles.topRail}>
            <Text style={styles.topRailText}>NIGHT OPS // 05:12</Text>
            <View style={styles.liveDot} />
          </View>

          <View style={styles.heroRow}>
            <WallyBadge />
            <View style={styles.titleBlock}>
              <Text style={styles.eyebrow}>DOMESTIC ARCADE ADVENTURE</Text>
              {/* QA only: a long press on the title opens the bot DEMO (no menu entry for players). */}
              <Pressable testID="demo-hidden-entry" delayLongPress={1200} disabled={busy} onLongPress={() => setDemoSetup(true)}>
                <Text style={styles.title}>PYJAMADA</Text>
              </Pressable>
              <Text style={styles.subtitle}>ONE HOUSE. BAD DREAMS. NO SLEEP.</Text>
            </View>
          </View>

          <View style={styles.missionCard}>
            <Text style={styles.missionKicker}>{completedRun ? 'LAST RUN' : "TONIGHT'S MISSION"}</Text>
            <Text style={styles.missionText}>
              {completedRun ? 'RESONATOR SHUT DOWN · NIGHT COMPLETE' : 'BAD DREAMS AGAIN. DRESS · GRAB THE KEYS · SLIP OUT QUIETLY'}
            </Text>
          </View>

          <View style={styles.footerRail}>
            <Text style={styles.footer}>8 ROOMS</Text>
            <Text style={styles.footerAccent}>1 MAD SCIENTIST</Text>
            <Text style={styles.footer}>0 SLEEP</Text>
          </View>
        </View>

        {demoSetup ? (
        <View style={styles.column}>
          <Text style={styles.sectionLabel}>DEMO · WHO PLAYS</Text>
          <View style={styles.chipRow}>
            {HUMAN_PROFILE_IDS.map(profile => (
              <Chip key={profile} testID={`demo-player-${profile}`} label={profile.toUpperCase()} selected={profile === demoProfile} onPress={() => setDemoProfile(profile)} />
            ))}
          </View>
          <Text style={styles.sectionLabel}>LEVEL</Text>
          <View style={styles.chipRow}>
            {ADVENTURE_DIFFICULTIES.map(level => (
              <Chip key={level} testID={`demo-level-${level}`} label={`${level} · ${DIFFICULTY_PROFILES[level].name}`} selected={level === demoLevel} onPress={() => setDemoLevel(level)} />
            ))}
          </View>
          <MenuButton testID="demo-start" label="WATCH THE BOT PLAY" tier="primary" disabled={busy} onPress={() => { setDemoSetup(false); onDemo(demoProfile, demoLevel); }} />
          <MenuButton testID="demo-back" label="BACK" tier="secondary" disabled={busy} onPress={() => setDemoSetup(false)} />
        </View>
        ) : (
        <View style={styles.column}>
          <Text style={styles.sectionLabel}>SELECT RUN</Text>
          <MenuButton testID="continue-button" label={completedRun ? 'VIEW ENDING' : 'CONTINUE'} tier="primary" disabled={busy || !canContinue} onPress={onContinue} />
          {!canContinue && !busy && <Text style={styles.disabledHint}>NO SAVE YET — START SOMETHING MESSY</Text>}
          {choosingLevel ? (
            <>
              {ADVENTURE_DIFFICULTIES.map(level => (
                <MenuButton
                  key={level}
                  testID={`new-game-level-${level}`}
                  label={`LEVEL ${level} · ${DIFFICULTY_PROFILES[level].name}`}
                  tier="primary"
                  disabled={busy}
                  onPress={() => { setChoosingLevel(false); onNewGame(level); }}
                />
              ))}
              <MenuButton testID="new-game-back" label="BACK" tier="secondary" disabled={busy} onPress={() => setChoosingLevel(false)} />
            </>
          ) : (
            <MenuButton testID="new-game-button" label={busy ? 'WORKING…' : 'NEW GAME'} tier="primary" disabled={busy} onPress={() => setChoosingLevel(true)} />
          )}
          <MenuButton testID="settings-button" label="SETTINGS" tier="secondary" disabled={busy} onPress={onSettings} />
        </View>
        )}
      </View>
    </View>
  );
}

function WallyBadge() {
  const image = useImage(HAUNTED_WALLY_ATLAS_SOURCE);
  return (
    <View style={styles.wallyBadge} accessibilityLabel="Wally pixel portrait">
      <Canvas style={styles.wallyCanvas}>
        <AtlasSprite image={image} frame={PORTRAIT_FRAME} x={31} y={74} scale={PORTRAIT_SCALE} />
      </Canvas>
    </View>
  );
}

function Chip({ testID, label, selected, onPress }: { testID: string; label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }: { pressed: boolean }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
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
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: VISUAL_TOKENS.environment.void, paddingHorizontal: 24, paddingVertical: 12, overflow: 'hidden' },
  backdropStripeA: { position: 'absolute', width: '140%', height: 26, transform: [{ rotate: '-12deg' }], backgroundColor: VISUAL_TOKENS.environment.wallDeep, top: '22%' },
  backdropStripeB: { position: 'absolute', width: '140%', height: 12, transform: [{ rotate: '-12deg' }], backgroundColor: VISUAL_TOKENS.environment.floorDeep, bottom: '22%' },
  poster: { width: '100%', maxWidth: 780, flexDirection: 'row', padding: 16, gap: 18, borderWidth: 4, borderRightWidth: 8, borderBottomWidth: 8, borderColor: VISUAL_TOKENS.ui.panelEdge, backgroundColor: VISUAL_TOKENS.ui.panel },
  column: { flex: 1, gap: 9, justifyContent: 'center' },
  topRail: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 7, borderBottomWidth: 2, borderBottomColor: VISUAL_TOKENS.ui.panelEdge },
  topRailText: { color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  liveDot: { width: 7, height: 7, backgroundColor: VISUAL_TOKENS.feedback.noise },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 6 },
  titleBlock: { flex: 1 },
  eyebrow: { color: VISUAL_TOKENS.ui.cyan, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: VISUAL_TOKENS.ui.yellow, fontFamily: 'monospace', fontSize: 36, fontWeight: '900', letterSpacing: 2, textShadowColor: VISUAL_TOKENS.ui.magentaDark, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0 },
  subtitle: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', lineHeight: 11 },
  wallyBadge: { width: 68, height: 82, position: 'relative', backgroundColor: VISUAL_TOKENS.environment.wallDeep, borderWidth: 3, borderColor: VISUAL_TOKENS.ui.cyanDark },
  wallyCanvas: { width: 62, height: 76 },
  missionCard: { padding: 10, gap: 3, borderWidth: 2, borderColor: VISUAL_TOKENS.interactive.shadow, backgroundColor: VISUAL_TOKENS.ui.panelRaised },
  missionKicker: { color: VISUAL_TOKENS.interactive.focus, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  missionText: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 8, fontWeight: '900' },
  sectionLabel: { color: VISUAL_TOKENS.ui.cyanDark, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  button: { width: '100%', minHeight: 46, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 3, borderRightWidth: 6, borderBottomWidth: 6, backgroundColor: VISUAL_TOKENS.ui.panelRaised, position: 'relative', overflow: 'hidden' },
  buttonPrimary: { borderColor: VISUAL_TOKENS.ui.yellowDark },
  buttonSecondary: { minHeight: 42, borderColor: VISUAL_TOKENS.ui.cyanDark },
  buttonNotch: { position: 'absolute', right: -4, top: -4, width: 20, height: 20, backgroundColor: VISUAL_TOKENS.environment.wallDeep, transform: [{ rotate: '45deg' }] },
  buttonArrow: { color: VISUAL_TOKENS.interactive.focus, fontFamily: 'monospace', fontSize: 10, fontWeight: '900' },
  buttonText: { color: VISUAL_TOKENS.ui.ink, fontFamily: 'monospace', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  pressed: { transform: [{ translateX: 2 }, { translateY: 3 }], borderRightWidth: 3, borderBottomWidth: 3, opacity: 0.82 },
  disabled: { opacity: 0.24 },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: { flex: 1, minHeight: 34, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4, borderWidth: 2, borderRightWidth: 4, borderBottomWidth: 4, borderColor: VISUAL_TOKENS.ui.cyanDark, backgroundColor: VISUAL_TOKENS.ui.panelRaised },
  chipSelected: { borderColor: VISUAL_TOKENS.ui.yellowDark, backgroundColor: VISUAL_TOKENS.ui.panelEdge },
  chipText: { color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 8, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },
  chipTextSelected: { color: VISUAL_TOKENS.ui.ink },
  disabledHint: { marginTop: -6, color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 7, fontWeight: '900', textAlign: 'right' },
  footerRail: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 8, borderTopWidth: 2, borderTopColor: VISUAL_TOKENS.ui.panelEdge },
  footer: { color: VISUAL_TOKENS.ui.inkMuted, fontFamily: 'monospace', fontSize: 7, fontWeight: '900' },
  footerAccent: { color: VISUAL_TOKENS.ui.magenta, fontFamily: 'monospace', fontSize: 7, fontWeight: '900' },
});
