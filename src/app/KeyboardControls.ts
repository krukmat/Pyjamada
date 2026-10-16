import type { ActionZoneId, DirectionZoneId } from './TouchControlZones';

export type KeyBinding = { kind: 'held'; control: DirectionZoneId } | { kind: 'action'; control: ActionZoneId };

// Keyboard play for the web build: the same commands the touch deck sends.
const BINDINGS: Readonly<Record<string, KeyBinding>> = {
  ArrowLeft: { kind: 'held', control: 'left' },
  a: { kind: 'held', control: 'left' },
  ArrowRight: { kind: 'held', control: 'right' },
  d: { kind: 'held', control: 'right' },
  ArrowUp: { kind: 'action', control: 'jump' },
  w: { kind: 'action', control: 'jump' },
  ' ': { kind: 'action', control: 'jump' },
  x: { kind: 'action', control: 'attack' },
  j: { kind: 'action', control: 'attack' },
  ArrowDown: { kind: 'action', control: 'interact' },
  e: { kind: 'action', control: 'interact' },
  Enter: { kind: 'action', control: 'interact' },
};

/** The command a `KeyboardEvent.key` stands for; letters ignore case so Caps Lock and Shift still play. */
export function keyBinding(key: string): KeyBinding | undefined {
  return BINDINGS[key.length === 1 ? key.toLowerCase() : key];
}
