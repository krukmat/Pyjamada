import { getRoomState, markRoomInteraction, type AdventureState } from './AdventureState';

export type HallwayPendulumPhase = 'inactive' | 'raised' | 'dropping' | 'sweep';

export type HallwayPendulumSnapshot = {
  phase: HallwayPendulumPhase;
  dangerous: boolean;
  bobX: number;
  bobY: number;
};

/**
 * Hallway room threat: once the backward clock is inspected and until Wally
 * first reaches the Living Room, a phantom pendulum hangs from the clock. It
 * waits raised at one end of its arc, drops (the warning), sweeps the middle
 * of the corridor at body height, then rises at the other end. Jumping does
 * not clear it; the counterplay is crossing while it is raised. It only arms
 * once Wally has stepped away from the clock (`clockReach`), so reading the
 * clock the first time is always safe (once armed, the sweep crosses the clock
 * like any other spot, with its telegraph). It arms raised on the door side and swings back toward
 * the clock after `firstWarningMs`, long enough to see it drop and walk clear.
 * Both room entries sit outside its reach.
 */
export const HALLWAY_PENDULUM = {
  cycleMs: 6_000,
  holdMs: 2_000,
  sweepMs: 1_000,
  dropMs: 700,
  /** Raised time left plus the drop when the pendulum arms on the door side. */
  firstWarningMs: 1_800,
  /** Clock x and the distance from it inside which the pendulum waits to arm (clock reach plus the bob's width). */
  clockX: 64,
  clockReach: 14,
  pivotX: 64,
  pivotY: 43,
  leftX: 39,
  rightX: 89,
  raisedY: 30,
  lowY: 86,
  halfWidth: 5,
} as const;

const ARMED_INTERACTION = 'hallway-pendulum-armed';

export function isHallwayPendulumLive(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'hallway').inspected.includes('backward-clock')
    && !adventure.visitedRooms.includes('living-room');
}

export function isHallwayPendulumArmed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'hallway').interactions.includes(ARMED_INTERACTION);
}

export function armHallwayPendulum(
  adventure: AdventureState,
  elapsedMs: number,
  playerX: number,
): { adventure: AdventureState; elapsedMs: number } {
  if (adventure.currentRoom !== 'hallway' || !isHallwayPendulumLive(adventure) || isHallwayPendulumArmed(adventure)) {
    return { adventure, elapsedMs };
  }
  if (Math.abs(playerX - HALLWAY_PENDULUM.clockX) <= HALLWAY_PENDULUM.clockReach) return { adventure, elapsedMs };
  // Start raised at the door end with `firstWarningMs` left before the sweep
  // back toward the clock; the clock only moves forward.
  const { cycleMs, holdMs, sweepMs, firstWarningMs } = HALLWAY_PENDULUM;
  const offset = 2 * holdMs + sweepMs - firstWarningMs;
  const aligned = Math.ceil((Math.max(0, elapsedMs) - offset) / cycleMs) * cycleMs + offset;
  return { adventure: markRoomInteraction(adventure, 'hallway', ARMED_INTERACTION), elapsedMs: aligned };
}

const INACTIVE: HallwayPendulumSnapshot = {
  phase: 'inactive',
  dangerous: false,
  bobX: HALLWAY_PENDULUM.pivotX,
  bobY: HALLWAY_PENDULUM.raisedY,
};

function hold(t: number, x: number): HallwayPendulumSnapshot {
  const { holdMs, dropMs, raisedY, lowY } = HALLWAY_PENDULUM;
  const dropStart = holdMs - dropMs;
  if (t < dropStart) return { phase: 'raised', dangerous: false, bobX: x, bobY: raisedY };
  return { phase: 'dropping', dangerous: false, bobX: x, bobY: raisedY + (lowY - raisedY) * ((t - dropStart) / dropMs) };
}

function sweep(t: number, fromX: number, toX: number): HallwayPendulumSnapshot {
  const eased = 0.5 - 0.5 * Math.cos(Math.PI * (t / HALLWAY_PENDULUM.sweepMs));
  return { phase: 'sweep', dangerous: true, bobX: fromX + (toX - fromX) * eased, bobY: HALLWAY_PENDULUM.lowY };
}

export function resolveHallwayPendulum(adventure: AdventureState, elapsedMs: number): HallwayPendulumSnapshot {
  if (adventure.currentRoom !== 'hallway' || !isHallwayPendulumLive(adventure) || !isHallwayPendulumArmed(adventure)) return INACTIVE;
  const { cycleMs, holdMs, sweepMs, leftX, rightX } = HALLWAY_PENDULUM;
  const t = ((elapsedMs % cycleMs) + cycleMs) % cycleMs;
  if (t < holdMs) return hold(t, leftX);
  if (t < holdMs + sweepMs) return sweep(t - holdMs, leftX, rightX);
  if (t < 2 * holdMs + sweepMs) return hold(t - holdMs - sweepMs, rightX);
  return sweep(t - 2 * holdMs - sweepMs, rightX, leftX);
}

export function isPlayerHitByHallwayPendulum(player: { x: number }, pendulum: HallwayPendulumSnapshot): boolean {
  return pendulum.dangerous && Math.abs(player.x - pendulum.bobX) <= HALLWAY_PENDULUM.halfWidth;
}
