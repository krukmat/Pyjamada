import { getRoomState, markRoomInteraction, type AdventureState } from './AdventureState';
import {
  INACTIVE_FLOOR_WAVE,
  alignFloorWaveStart,
  isPlayerHitByFloorWave,
  resolveFloorWave,
  type FloorWaveConfig,
  type FloorWaveSnapshot,
} from './FloorWaveHazard';

/**
 * Living Room room threat: once the television is on and until the radio
 * traces the source, the set throws two waves of static along the floor each
 * cycle. They are far enough apart that each needs its own jump. Waves start
 * 8 units left of the TV and die before the Hallway entry, so standing at the
 * television and arriving from the Hallway are always safe.
 */
export const LIVING_ROOM_STATIC = {
  cycleMs: 3_500,
  safeMs: 800,
  telegraphMs: 700,
  travelMs: 1_100,
  waveOffsetsMs: [0, 900],
  sourceX: 101,
  targetX: 24,
  halfWidth: 4,
} as const satisfies FloorWaveConfig;

const ARMED_INTERACTION = 'living-room-static-armed';

export function isLivingRoomStaticLive(adventure: AdventureState): boolean {
  const livingRoom = getRoomState(adventure, 'living-room');
  return livingRoom.switches['tv-on'] === true && livingRoom.switches['source-hum-traced'] !== true;
}

export function isLivingRoomStaticArmed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'living-room').interactions.includes(ARMED_INTERACTION);
}

export function armLivingRoomStatic(
  adventure: AdventureState,
  elapsedMs: number,
): { adventure: AdventureState; elapsedMs: number } {
  if (adventure.currentRoom !== 'living-room' || !isLivingRoomStaticLive(adventure) || isLivingRoomStaticArmed(adventure)) {
    return { adventure, elapsedMs };
  }
  return {
    adventure: markRoomInteraction(adventure, 'living-room', ARMED_INTERACTION),
    elapsedMs: alignFloorWaveStart(LIVING_ROOM_STATIC, elapsedMs),
  };
}

export function resolveLivingRoomStatic(adventure: AdventureState, elapsedMs: number): FloorWaveSnapshot {
  if (adventure.currentRoom !== 'living-room' || !isLivingRoomStaticLive(adventure) || !isLivingRoomStaticArmed(adventure)) {
    return INACTIVE_FLOOR_WAVE;
  }
  return resolveFloorWave(LIVING_ROOM_STATIC, elapsedMs);
}

export function isPlayerHitByLivingRoomStatic(player: { x: number; grounded: boolean }, wave: FloorWaveSnapshot): boolean {
  return isPlayerHitByFloorWave(LIVING_ROOM_STATIC, player, wave);
}
