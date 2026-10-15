import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import type { TouchControlLayout } from '../settings/core/GameSettings';
import {
  ACTION_SLOT_ORDER,
  layoutControlZones,
  updateDeckTouches,
  type ActionZoneId,
  type DeckTouchState,
  type DirectionZoneId,
} from './TouchControlZones';

type Props = {
  layout: TouchControlLayout;
  enabled: Readonly<Record<ActionZoneId, boolean>>;
  /** Name of what INTERACT would use right now, shown on the button. */
  useTarget?: string;
  onHeldControl: (control: DirectionZoneId, pressed: boolean) => void;
  onAction: (action: ActionZoneId) => void;
};

const SLOT_LABEL: Record<ActionZoneId, string> = { jump: 'JUMP', attack: 'ATTACK', interact: 'USE' };
const SLOT_TEST_ID: Record<ActionZoneId, string> = { jump: 'jump-button', attack: 'attack-button', interact: 'action-button' };

/**
 * One touch surface for the whole control deck (see TouchControlZones): any
 * number of fingers, directions held, actions fired on touch-down. Children
 * draw the controls but never take touches, so every finger lands here.
 */
export function TouchDeck({ layout, enabled, useTarget, onHeldControl, onAction }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
  const zones = useMemo(() => layoutControlZones(size.width, size.height, layout, enabled), [size, layout, enabled]);
  const touches = useRef<DeckTouchState>({});
  const held = useRef<Record<DirectionZoneId, boolean>>({ left: false, right: false });
  const callbacks = useRef({ onHeldControl, onAction });
  callbacks.current = { onHeldControl, onAction };

  // Release any held direction when the deck goes away (failure, menu, ending).
  useEffect(() => () => {
    for (const control of ['left', 'right'] as const) {
      if (held.current[control]) callbacks.current.onHeldControl(control, false);
    }
  }, []);

  function handleTouches(event: GestureResponderEvent) {
    const list = event.nativeEvent.touches.map(touch => ({ id: String(touch.identifier), x: touch.locationX, y: touch.locationY }));
    const update = updateDeckTouches(touches.current, list, zones);
    touches.current = update.state;
    for (const control of ['left', 'right'] as const) {
      if (update.held[control] !== held.current[control]) callbacks.current.onHeldControl(control, update.held[control]);
    }
    held.current = update.held;
    for (const action of update.taps) callbacks.current.onAction(action);
    const next = new Set<string>(Object.values(update.state).filter(binding => binding !== 'pad' && binding !== 'none'));
    if (update.held.left) next.add('left');
    if (update.held.right) next.add('right');
    setPressed(next);
  }

  const pad = (
    <View style={styles.half} pointerEvents="none">
      {(['left', 'right'] as const).map(control => (
        <View key={control} style={styles.cell}>
          <View testID={`move-${control}-button`} style={[styles.padKey, pressed.has(control) && styles.pressed]}>
            <Text style={styles.padText}>{control === 'left' ? '◀' : '▶'}</Text>
          </View>
        </View>
      ))}
    </View>
  );
  const actions = (
    <View style={styles.half} pointerEvents="none">
      {ACTION_SLOT_ORDER.map(action => (
        <View key={action} style={styles.cell}>
          <View
            testID={SLOT_TEST_ID[action]}
            style={[
              styles.button,
              action === 'attack' && styles.attackButton,
              action === 'interact' && styles.useButton,
              !enabled[action] && styles.disabled,
              pressed.has(action) && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>{SLOT_LABEL[action]}</Text>
            {action === 'interact' && useTarget && <Text numberOfLines={1} style={styles.targetText}>{useTarget}</Text>}
          </View>
        </View>
      ))}
    </View>
  );

  return (
    <View
      testID="touch-deck"
      style={styles.deck}
      onLayout={(event: LayoutChangeEvent) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
      onTouchStart={handleTouches}
      onTouchMove={handleTouches}
      onTouchEnd={handleTouches}
      onTouchCancel={handleTouches}
    >
      {layout === 'standard' ? pad : actions}
      {layout === 'standard' ? actions : pad}
    </View>
  );
}

const styles = StyleSheet.create({
  deck: { alignSelf: 'stretch', flexDirection: 'row', minHeight: 132 },
  half: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  padKey: { width: 64, height: 76, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#6b5aa0', borderRadius: 8, backgroundColor: '#352a5a' },
  padText: { color: '#f4f1de', fontSize: 24, fontWeight: '900' },
  button: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#5c86a8', borderRadius: 30, backgroundColor: '#1f8fa8' },
  attackButton: { borderColor: '#ff9aa8', backgroundColor: '#d23a5a' },
  useButton: { borderColor: '#fff2a0', backgroundColor: '#c89a2a' },
  disabled: { opacity: 0.25 },
  buttonText: { color: '#f4f1de', fontFamily: 'monospace', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  targetText: { maxWidth: 54, color: '#0b0a12', fontFamily: 'monospace', fontSize: 6, fontWeight: '900' },
  pressed: { opacity: 0.7, transform: [{ translateY: 2 }] },
});
