import type { TouchControlLayout } from '../settings/core/GameSettings';

/**
 * Pure geometry and multi-touch logic for the control deck. React Native's
 * responder system gives one Pressable the whole gesture, so holding a
 * direction used to block JUMP/ATTACK. The deck is now one touch surface:
 * every finger is resolved here against fixed zones.
 *
 * - Direction zones are held: a finger that lands on the pad steers by
 *   wherever it currently is on the pad, so sliding between left and right
 *   works without lifting.
 * - Action zones fire once, on touch-down (not on release), and keep that
 *   finger until it lifts, so sliding onto the pad never adds a direction.
 * - Slots never move: an unavailable action keeps its place, disabled.
 */
export type DirectionZoneId = 'left' | 'right';
export type ActionZoneId = 'jump' | 'attack' | 'interact';
export type ControlZoneId = DirectionZoneId | ActionZoneId;

export type ControlZone = { id: ControlZoneId; x: number; y: number; width: number; height: number; enabled: boolean };
export type DeckTouch = { id: string; x: number; y: number };
/** What each live finger landed on: the pad, an action slot, or nothing. */
export type DeckTouchBinding = 'pad' | ActionZoneId | 'none';
export type DeckTouchState = Readonly<Record<string, DeckTouchBinding>>;
export type DeckUpdate = { state: DeckTouchState; held: Record<DirectionZoneId, boolean>; taps: ActionZoneId[] };

export const ACTION_SLOT_ORDER: readonly ActionZoneId[] = ['jump', 'attack', 'interact'];

/** Half the deck is the pad (left, right), the other half three equal action slots. Mirrored swaps the halves. */
export function layoutControlZones(
  width: number,
  height: number,
  layout: TouchControlLayout,
  enabled: Readonly<Record<ActionZoneId, boolean>>,
): ControlZone[] {
  const half = width / 2;
  const padX = layout === 'standard' ? 0 : half;
  const actionsX = layout === 'standard' ? half : 0;
  const slot = half / ACTION_SLOT_ORDER.length;
  return [
    { id: 'left', x: padX, y: 0, width: half / 2, height, enabled: true },
    { id: 'right', x: padX + half / 2, y: 0, width: half / 2, height, enabled: true },
    ...ACTION_SLOT_ORDER.map((id, index) => ({ id, x: actionsX + index * slot, y: 0, width: slot, height, enabled: enabled[id] })),
  ];
}

export function zoneAt(zones: readonly ControlZone[], x: number, y: number): ControlZone | undefined {
  return zones.find(zone => x >= zone.x && x < zone.x + zone.width && y >= zone.y && y < zone.y + zone.height);
}

function isDirection(id: ControlZoneId | undefined): id is DirectionZoneId {
  return id === 'left' || id === 'right';
}

/** Applies the current set of fingers (all of them, as the touch event lists them) to the previous state. */
export function updateDeckTouches(previous: DeckTouchState, touches: readonly DeckTouch[], zones: readonly ControlZone[]): DeckUpdate {
  const state: Record<string, DeckTouchBinding> = {};
  const held: Record<DirectionZoneId, boolean> = { left: false, right: false };
  const taps: ActionZoneId[] = [];
  for (const touch of touches) {
    const under = zoneAt(zones, touch.x, touch.y);
    let binding = previous[touch.id];
    if (binding === undefined) {
      binding = under === undefined ? 'none' : isDirection(under.id) ? 'pad' : under.id;
      if (under && !isDirection(under.id) && under.enabled) taps.push(under.id);
    }
    state[touch.id] = binding;
    // A pad finger steers by where it is now; off the pad it holds nothing.
    if (binding === 'pad' && under && isDirection(under.id)) held[under.id] = true;
  }
  return { state, held, taps };
}
