import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { GameState } from '../game/core/GameState';
import { getPocketLabel, RETRO_PALETTE } from '../game/render/VisualLanguage';

export function RetroHud({ gameState }: { gameState: GameState }) {
  return (
    <View style={styles.hud}>
      <View style={styles.group}>
        <Text style={styles.label}>LIFE</Text>
        <View style={styles.blocks}>
          {[0, 1, 2].map((value) => <View key={value} style={[styles.lifeBlock, value === 2 && styles.lifeAccent]} />)}
        </View>
      </View>

      <View style={[styles.group, styles.energyGroup]}>
        <Text style={styles.label}>DREAM</Text>
        <View style={styles.energyTrack}>
          {[0, 1, 2, 3, 4, 5].map((value) => <View key={value} style={styles.energyBlock} />)}
        </View>
      </View>

      <View style={[styles.group, styles.pocketGroup]}>
        <Text style={styles.label}>POCKET</Text>
        <View style={styles.pocket}><Text style={styles.pocketText}>{getPocketLabel(gameState)}</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    width: '100%',
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: RETRO_PALETTE.void,
    borderBottomWidth: 2,
    borderBottomColor: RETRO_PALETTE.yellow,
  },
  group: {
    minWidth: 84,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRightWidth: 1,
    borderRightColor: RETRO_PALETTE.purple,
    justifyContent: 'space-between',
  },
  energyGroup: { flex: 1 },
  pocketGroup: { minWidth: 92, borderRightWidth: 0 },
  label: {
    color: RETRO_PALETTE.cyan,
    fontFamily: 'monospace',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 1,
  },
  blocks: { flexDirection: 'row', gap: 4, marginTop: 5 },
  lifeBlock: { width: 14, height: 9, backgroundColor: RETRO_PALETTE.magenta },
  lifeAccent: { backgroundColor: RETRO_PALETTE.yellow },
  energyTrack: { flexDirection: 'row', gap: 3, marginTop: 5 },
  energyBlock: { flex: 1, maxWidth: 17, height: 9, backgroundColor: RETRO_PALETTE.green },
  pocket: {
    marginTop: 3,
    minHeight: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: RETRO_PALETTE.magenta,
    backgroundColor: '#171326',
  },
  pocketText: {
    color: RETRO_PALETTE.yellow,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: '900',
  },
});
