import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import type { TouchControlLayout } from '../settings/core/GameSettings';
import {
  layoutControlZones,
  updateDeckTouches,
  type ActionZoneId,
  type ControlZone,
  type DeckColumns,
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
  /** Landscape: controls in the side columns around the stage (see layoutControlZones). */
  columns?: DeckColumns;
  style?: StyleProp<ViewStyle>;
};

const SLOT_LABEL: Record<ActionZoneId, string> = { jump: 'JUMP', attack: 'ATTACK', interact: 'USE' };
const SLOT_TEST_ID: Record<ActionZoneId, string> = { jump: 'jump-button', attack: 'attack-button', interact: 'action-button' };

/**
 * One touch surface for the whole control deck (see TouchControlZones): any
 * number of fingers, directions held, actions fired on touch-down. Children
 * draw the controls but never take touches, so every finger lands here.
 */
export function TouchDeck({ layout, enabled, useTarget, onHeldControl, onAction, columns, style }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [pressed, setPressed] = useState<ReadonlySet<string>>(new Set());
  const zones = useMemo(
    () => layoutControlZones(size.width, size.height, layout, enabled, columns),
    [size, layout, enabled, columns?.centerWidth, columns?.top],
  );
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
    applyTouches(event.nativeEvent.touches.map(touch => ({ id: String(touch.identifier), x: touch.locationX, y: touch.locationY })));
  }

  // Web: pointer events cover both the mouse and touch screens (browsers do not
  // send touch events for a mouse). Each pressed pointer is one "finger".
  const pointers = useRef(new Map<string, { x: number; y: number }>());
  function handlePointer(event: { nativeEvent: unknown; currentTarget: unknown }) {
    const pointer = event.nativeEvent as PointerEvent;
    const target = event.currentTarget as HTMLElement;
    const id = String(pointer.pointerId);
    if (pointer.type === 'pointerup' || pointer.type === 'pointercancel') pointers.current.delete(id);
    else if (pointer.type === 'pointerdown' || pointers.current.has(id)) {
      if (pointer.type === 'pointerdown') target.setPointerCapture?.(pointer.pointerId);
      const rect = target.getBoundingClientRect();
      pointers.current.set(id, { x: pointer.clientX - rect.left, y: pointer.clientY - rect.top });
    } else return; // a hovering mouse presses nothing
    applyTouches([...pointers.current].map(([key, at]) => ({ id: key, ...at })));
  }

  function applyTouches(list: { id: string; x: number; y: number }[]) {
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

  // Each control is drawn centred in its own touch zone, so what you see is what you touch.
  const control = (zone: ControlZone) => {
    const isPad = zone.id === 'left' || zone.id === 'right';
    return (
      <View key={zone.id} style={[styles.cell, { left: zone.x, top: zone.y, width: zone.width, height: zone.height }]} pointerEvents="none">
        {isPad ? (
          <View testID={`move-${zone.id}-button`} style={[styles.padKey, pressed.has(zone.id) && styles.pressed]}>
            <Text style={styles.padText}>{zone.id === 'left' ? '◀' : '▶'}</Text>
          </View>
        ) : (
          <View
            testID={SLOT_TEST_ID[zone.id as ActionZoneId]}
            style={[
              styles.button,
              zone.id === 'attack' && styles.attackButton,
              zone.id === 'interact' && styles.useButton,
              !zone.enabled && styles.disabled,
              pressed.has(zone.id) && styles.pressed,
            ]}
          >
            <Text style={styles.buttonText}>{SLOT_LABEL[zone.id as ActionZoneId]}</Text>
            {zone.id === 'interact' && useTarget && <Text numberOfLines={1} style={styles.targetText}>{useTarget}</Text>}
          </View>
        )}
      </View>
    );
  };

  return (
    <View
      testID="touch-deck"
      style={[styles.deck, Platform.OS === 'web' && WEB_NO_GESTURES, style]}
      onLayout={(event: LayoutChangeEvent) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height })}
      {...(Platform.OS === 'web'
        ? { onPointerDown: handlePointer, onPointerMove: handlePointer, onPointerUp: handlePointer, onPointerCancel: handlePointer }
        : { onTouchStart: handleTouches, onTouchMove: handleTouches, onTouchEnd: handleTouches, onTouchCancel: handleTouches })}
    >
      {zones.map(control)}
    </View>
  );
}

// Mobile browsers would otherwise claim a held or sliding finger for scroll/zoom
// and cancel its pointer mid-run.
const WEB_NO_GESTURES = { touchAction: 'none', userSelect: 'none' } as unknown as ViewStyle;

const styles = StyleSheet.create({
  // flex: 1 so the deck fills its row; without it the halves collapse to zero width.
  deck: { flex: 1, alignSelf: 'stretch', flexDirection: 'row', minHeight: 132 },
  cell: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  padKey: { width: 60, height: 104, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#6b5aa0', borderRadius: 8, backgroundColor: '#352a5a' },
  padText: { color: '#f4f1de', fontSize: 30, fontWeight: '900' },
  button: { width: 68, height: 68, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#5c86a8', borderRadius: 34, backgroundColor: '#1f8fa8' },
  attackButton: { borderColor: '#ff9aa8', backgroundColor: '#d23a5a' },
  useButton: { borderColor: '#fff2a0', backgroundColor: '#c89a2a' },
  disabled: { opacity: 0.25 },
  buttonText: { color: '#f4f1de', fontFamily: 'monospace', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  targetText: { maxWidth: 64, color: '#0b0a12', fontFamily: 'monospace', fontSize: 7, fontWeight: '900' },
  pressed: { opacity: 0.7, transform: [{ translateY: 2 }] },
});
