import { PLAYER_GROUND_Y } from '../core/World';
import { horizontalIntent, type HauntedInputState } from './HauntedInput';

export type HauntedPlayerPhysicsState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  facing: 'left' | 'right';
};

export const HAUNTED_PLAYER_BOUNDS = { minX: 8, maxX: 116 } as const;
export const HAUNTED_PLAYER_PHYSICS = {
  maxSpeed: 36,
  acceleration: 240,
  friction: 300,
  gravity: 180,
  jumpVelocity: -72,
  hitKnockbackX: 34,
  hitKnockbackY: -34,
  /**
   * A Ghost hit shoves harder: friction still applies in the air, so 72 u/s
   * carries Wally about 8.6 units clear (34 u/s barely moved him 2 units, less
   * than a Ghost's contact radius) even while the player holds toward it.
   */
  ghostKnockbackX: 72,
  ghostKnockbackY: -40,
} as const;

export type HauntedKnockbackImpulse = { x: number; y: number };
const HAZARD_KNOCKBACK: HauntedKnockbackImpulse = { x: HAUNTED_PLAYER_PHYSICS.hitKnockbackX, y: HAUNTED_PLAYER_PHYSICS.hitKnockbackY };
export const GHOST_KNOCKBACK: HauntedKnockbackImpulse = { x: HAUNTED_PLAYER_PHYSICS.ghostKnockbackX, y: HAUNTED_PLAYER_PHYSICS.ghostKnockbackY };

export function createHauntedPlayerPhysics(x = 24): HauntedPlayerPhysicsState {
  return { x, y: PLAYER_GROUND_Y, vx: 0, vy: 0, grounded: true, facing: 'right' };
}

export function stepHauntedPlayerPhysics(
  state: HauntedPlayerPhysicsState,
  input: HauntedInputState,
  deltaSeconds: number,
): HauntedPlayerPhysicsState {
  const dt = Math.max(0, deltaSeconds);
  const intent = horizontalIntent(input);
  let vx = state.vx;

  if (intent !== 0) {
    vx = approach(vx, intent * HAUNTED_PLAYER_PHYSICS.maxSpeed, HAUNTED_PLAYER_PHYSICS.acceleration * dt);
  } else {
    vx = approach(vx, 0, HAUNTED_PLAYER_PHYSICS.friction * dt);
  }

  let vy = state.vy;
  let grounded = state.grounded;
  if (input.jumpPressed && grounded) {
    vy = HAUNTED_PLAYER_PHYSICS.jumpVelocity;
    grounded = false;
  }
  if (!grounded) vy += HAUNTED_PLAYER_PHYSICS.gravity * dt;

  let x = clamp(state.x + vx * dt, HAUNTED_PLAYER_BOUNDS.minX, HAUNTED_PLAYER_BOUNDS.maxX);
  if ((x === HAUNTED_PLAYER_BOUNDS.minX && vx < 0) || (x === HAUNTED_PLAYER_BOUNDS.maxX && vx > 0)) vx = 0;

  let y = state.y + vy * dt;
  if (y >= PLAYER_GROUND_Y) {
    y = PLAYER_GROUND_Y;
    vy = 0;
    grounded = true;
  }

  const facing = intent < 0 ? 'left' : intent > 0 ? 'right' : state.facing;
  return { x, y, vx, vy, grounded, facing };
}

export function applyHauntedKnockback(
  state: HauntedPlayerPhysicsState,
  direction: -1 | 1,
  impulse: HauntedKnockbackImpulse = HAZARD_KNOCKBACK,
): HauntedPlayerPhysicsState {
  return {
    ...state,
    vx: impulse.x * direction,
    vy: impulse.y,
    grounded: false,
  };
}

function approach(value: number, target: number, amount: number): number {
  if (value < target) return Math.min(value + amount, target);
  if (value > target) return Math.max(value - amount, target);
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
