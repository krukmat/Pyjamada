import type { SystemicObjectId } from './SystemicState';

export type SystemicObjectTag = 'rest' | 'noise-source' | 'clothing' | 'equipment' | 'environment' | 'objective';
export type SystemicCommand =
  | { type: 'SET_DRESSED' }
  | { type: 'EQUIP'; itemId: SystemicObjectId }
  | { type: 'TOGGLE_WINDOW' }
  | { type: 'COLLECT'; itemId: SystemicObjectId };

export type SystemicObjectDefinition = {
  id: SystemicObjectId;
  label: string;
  x: number;
  radius: number;
  tags: readonly SystemicObjectTag[];
  baseEffect: { time: number; energy: number; noise: number };
  commands: readonly SystemicCommand[];
};

export const SYSTEMIC_OBJECTS: readonly SystemicObjectDefinition[] = [
  { id: 'bed', label: 'BED', x: 16, radius: 8, tags: ['rest'], baseEffect: { time: 5, energy: 30, noise: 0 }, commands: [] },
  { id: 'slippers', label: 'SLIPPERS', x: 32, radius: 6, tags: ['equipment'], baseEffect: { time: 1, energy: 0, noise: 1 }, commands: [{ type: 'EQUIP', itemId: 'slippers' }] },
  { id: 'alarm-clock', label: 'ALARM', x: 48, radius: 6, tags: ['noise-source'], baseEffect: { time: 1, energy: 0, noise: 18 }, commands: [] },
  { id: 'wardrobe', label: 'WARDROBE', x: 68, radius: 7, tags: ['clothing'], baseEffect: { time: 4, energy: -6, noise: 8 }, commands: [{ type: 'SET_DRESSED' }] },
  { id: 'keys', label: 'KEYS', x: 88, radius: 6, tags: ['objective'], baseEffect: { time: 1, energy: 0, noise: 2 }, commands: [{ type: 'COLLECT', itemId: 'keys' }] },
  { id: 'window', label: 'WINDOW', x: 108, radius: 7, tags: ['environment'], baseEffect: { time: 2, energy: 0, noise: 5 }, commands: [{ type: 'TOGGLE_WINDOW' }] },
] as const;

export function findSystemicObject(playerX: number): SystemicObjectDefinition | undefined {
  return SYSTEMIC_OBJECTS
    .map((object) => ({ object, distance: Math.abs(playerX - object.x) }))
    .filter(({ object, distance }) => distance <= object.radius)
    .sort((a, b) => a.distance - b.distance || a.object.x - b.object.x)[0]?.object;
}

export function getSystemicObject(id: SystemicObjectId): SystemicObjectDefinition {
  const object = SYSTEMIC_OBJECTS.find((candidate) => candidate.id === id);
  if (!object) throw new Error(`Unknown systemic object: ${id}`);
  return object;
}
