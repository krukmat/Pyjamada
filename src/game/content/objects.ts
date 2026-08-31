import { BEDROOM_KEY_ID } from '../core/GameState';
import type { InteractionTarget } from '../core/InteractionEngine';

export type GameObjectDefinition = InteractionTarget & { label: string };

export const V1_BEDROOM_KEY: GameObjectDefinition = {
  id: BEDROOM_KEY_ID,
  label: 'Bedroom key',
  roomId: 'room-01',
  x: 48,
  radius: 6,
  tags: ['collectible', 'key'],
};

export const V1_BEDROOM_DOOR: GameObjectDefinition = {
  id: 'bedroom-door',
  label: 'Bedroom door',
  roomId: 'room-01',
  x: 92,
  actionMinX: 84,
  actionMaxX: 96,
  tags: ['door', 'locked'],
};
