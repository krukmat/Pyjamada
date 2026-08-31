import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GameState } from '../game/core/GameState';
import { getPocketLabel, RETRO_PALETTE } from '../game/render/VisualLanguage';
import { PixelMeter } from './RetroUiKit';

export function RetroHud({ gameState }: { gameState: GameState }) {
  const hasKey = getPocketLabel(gameState) === 'KEY';
  return (
    <View style={styles.hud}>
      <View style={styles.group}>
        <Text style={styles.label}>LIFE</Text>
        <View style={styles.lifeRow}>
          {[0, 1, 2].map((value) => <LifeIcon key={value} accent={value === 2} />)}
        </View>
      </View>

      <View style={[styles.group, styles.dreamGroup]}>
        <View style={styles.dreamHeader}>
          <Text style={styles.label}>DREAM</Text>
          <Text style={styles.dreamValue}>06</Text>
        </View>
        <PixelMeter value={1} segments={6} accent={RETRO_PALETTE.green} />
      </View>

      <View style={[styles.group, styles.pocketGroup]}>
        <Text style={styles.label}>POCKET</Text>
        <View style={styles.pocket}>
          {hasKey ? <PocketKeyGlyph /> : <Text style={styles.emptyGlyph}>—</Text>}
          <Text style={styles.pocketText}>{hasKey ? 'KEY' : 'EMPTY'}</Text>
        </View>
      </View>
    </View>
  );
}

function LifeIcon({ accent }: { accent: boolean }) {
  return (
    <View style={[styles.lifeIcon, accent && styles.lifeIconAccent]}>
      <View style={styles.lifeHighlight} />
    </View>
  );
}

function PocketKeyGlyph() {
  return (
    <View style={styles.keyGlyph}>
      <View style={styles.keyRing}><View style={styles.keyHole} /></View>
      <View style={styles.keyShaft} />
      <View style={styles.keyTooth} />
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    width: '100%',
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: RETRO_PALETTE.panel,
    borderBottomWidth: 3,
    borderBottomColor: RETRO_PALETTE.yellowDark,
  },
  group: {
    minWidth: 82,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 2,
    borderRightColor: RETRO_PALETTE.purpleDark,
    justifyContent: 'space-between',
  },
  dreamGroup: { flex: 1 },
  pocketGroup: { minWidth: 94, borderRightWidth: 0 },
  label: {
    color: RETRO_PALETTE.cyan,
    fontFamily: 'monospace',
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 1,
  },
  lifeRow: { flexDirection: 'row', gap: 5, marginTop: 6 },
  lifeIcon: {
    width: 15,
    height: 11,
    borderWidth: 2,
    borderColor: RETRO_PALETTE.magentaDark,
    backgroundColor: RETRO_PALETTE.magenta,
  },
  lifeIconAccent: { borderColor: RETRO_PALETTE.yellowDark, backgroundColor: RETRO_PALETTE.yellow },
  lifeHighlight: { width: 4, height: 2, margin: 1, backgroundColor: 'rgba(247,240,207,0.5)' },
  dreamHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  dreamValue: { color: RETRO_PALETTE.yellow, fontFamily: 'monospace', fontSize: 11, fontWeight: '900' },
  pocket: {
    marginTop: 3,
    minHeight: 24,
    paddingHorizontal: 5,
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: RETRO_PALETTE.magentaDark,
    backgroundColor: RETRO_PALETTE.panelRaised,
  },
  pocketText: { color: RETRO_PALETTE.yellow, fontFamily: 'monospace', fontSize: 9, fontWeight: '900' },
  emptyGlyph: { color: RETRO_PALETTE.purple, fontFamily: 'monospace', fontSize: 11, fontWeight: '900' },
  keyGlyph: { width: 18, height: 10, position: 'relative' },
  keyRing: { position: 'absolute', left: 0, top: 1, width: 8, height: 8, borderWidth: 2, borderColor: RETRO_PALETTE.yellow },
  keyHole: { position: 'absolute', left: 1, top: 1, width: 2, height: 2, backgroundColor: RETRO_PALETTE.panelRaised },
  keyShaft: { position: 'absolute', left: 7, top: 4, width: 9, height: 3, backgroundColor: RETRO_PALETTE.yellow },
  keyTooth: { position: 'absolute', left: 13, top: 6, width: 3, height: 3, backgroundColor: RETRO_PALETTE.yellowDark },
});
