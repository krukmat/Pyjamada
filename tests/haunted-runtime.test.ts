import { DREAM_SPARK } from '../src/game/haunted/HauntedCombat';
import { HAUNTED_STEP_MS, advanceFixedStep } from '../src/game/haunted/FixedStepClock';
import { pressAction, setHeldControl } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, stepHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function equal(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: ${String(actual)} !== ${String(expected)}`);
}
function ok(value: unknown, label: string) { if (!value) throw new Error(label); }

let fixed = advanceFixedStep(0, HAUNTED_STEP_MS * 3 + 5);
equal(fixed.steps, 3, 'fixed step emits deterministic step count');
ok(fixed.accumulatorMs >= 4.9 && fixed.accumulatorMs <= 5.1, 'fixed step preserves remainder');
fixed = advanceFixedStep(0, 10_000);
equal(fixed.steps, 5, 'fixed step bounds catch-up work');
ok(fixed.droppedMs > 0, 'fixed step reports suspended/background time as dropped');

let session = createHauntedSession('haunted-test');
const startX = session.player.x;
session = { ...session, input: setHeldControl(session.input, 'right', true) };
for (let i = 0; i < 15; i += 1) session = stepHauntedSession(session, HAUNTED_STEP_MS).state;
ok(session.player.x > startX, 'held right moves continuously');
ok(session.elapsedMs > 400, 'real-time clock advances independently of taps');

session = { ...session, input: pressAction(session.input, 'jump') };
let stepped = stepHauntedSession(session, HAUNTED_STEP_MS);
session = stepped.state;
ok(stepped.events.some((event) => event.type === 'PLAYER_JUMPED'), 'jump emits semantic event');
ok(!session.player.grounded && session.player.y < 104, 'jump enters airborne state');
for (let i = 0; i < 60 && !session.player.grounded; i += 1) session = stepHauntedSession(session, HAUNTED_STEP_MS).state;
ok(session.player.grounded, 'gravity returns player to ground');

session = createHauntedSession('domestic-real-time');
session = driveTo(session, 16);
const beforeBedElapsed = session.elapsedMs;
session = interact(session);
equal(session.domestic.wallyState, 'normal', 'bed still wakes Wally');
equal(session.penaltyMs, 5000, 'bed applies clock penalty instead of movement-tap time');
equal(session.elapsedMs, beforeBedElapsed + HAUNTED_STEP_MS, 'interaction step still advances real time once');

session = driveTo(session, 32);
session = interact(session);
ok(session.domestic.equipped.includes('slippers'), 'slippers remain systemic equipment');

const noiseBeforeQuietWalk = session.domestic.noise;
session = driveTo(session, 68);
ok(session.domestic.noise - noiseBeforeQuietWalk <= 2, 'slippers suppress continuous movement noise');
session = interact(session);
ok(session.domestic.flags.dressed, 'wardrobe still dresses Wally');

session = driveTo(session, 88);
session = interact(session);
ok(session.domestic.collected.includes('keys'), 'keys remain collectible');
equal(session.objective.phase, 'escape-ready', 'dressed plus keys unlocks escape instead of instant success');
ok(session.objective.phase !== 'completed', 'run does not complete before exit interaction');

let combatSession = createHauntedSession('dream-spark');
const initialNoise = combatSession.domestic.noise;
combatSession = { ...combatSession, input: pressAction(combatSession.input, 'attack') };
stepped = stepHauntedSession(combatSession, HAUNTED_STEP_MS);
combatSession = stepped.state;
ok(stepped.events.some((event) => event.type === 'DREAM_SPARK_FIRED'), 'attack fires Dream Spark');
equal(combatSession.combat.projectiles.length, 1, 'first attack creates one projectile');
equal(combatSession.domestic.noise, initialNoise + DREAM_SPARK.noisePerShot, 'Dream Spark adds noise');

combatSession = { ...combatSession, input: pressAction(combatSession.input, 'attack') };
stepped = stepHauntedSession(combatSession, HAUNTED_STEP_MS);
combatSession = stepped.state;
equal(combatSession.combat.projectiles.length, 1, 'cooldown rejects immediate repeated attack');
ok(!stepped.events.some((event) => event.type === 'DREAM_SPARK_FIRED'), 'rejected attack emits no fire event');

for (let i = 0; i < 10; i += 1) combatSession = stepHauntedSession(combatSession, HAUNTED_STEP_MS).state;
combatSession = { ...combatSession, input: pressAction(combatSession.input, 'attack') };
combatSession = stepHauntedSession(combatSession, HAUNTED_STEP_MS).state;
equal(combatSession.combat.projectiles.length, 2, 'second shot fires after cooldown');
const firstProjectileX = combatSession.combat.projectiles[0]?.x ?? 0;
combatSession = stepHauntedSession(combatSession, HAUNTED_STEP_MS).state;
ok((combatSession.combat.projectiles[0]?.x ?? 0) > firstProjectileX, 'Dream Spark moves as a physical projectile');

for (let i = 0; i < 10; i += 1) combatSession = stepHauntedSession(combatSession, HAUNTED_STEP_MS).state;
combatSession = { ...combatSession, input: pressAction(combatSession.input, 'attack') };
combatSession = stepHauntedSession(combatSession, HAUNTED_STEP_MS).state;
equal(combatSession.combat.projectiles.length, 2, 'active projectile cap prevents a third Dream Spark');

console.log('haunted runtime tests passed');

function driveTo(initial: HauntedSessionState, targetX: number): HauntedSessionState {
  let state = initial;
  const control = state.player.x < targetX ? 'right' as const : 'left' as const;
  state = { ...state, input: setHeldControl(state.input, control, true) };
  for (let i = 0; i < 300 && Math.abs(state.player.x - targetX) > 2; i += 1) {
    state = stepHauntedSession(state, HAUNTED_STEP_MS).state;
  }
  state = { ...state, input: setHeldControl(state.input, control, false) };
  for (let i = 0; i < 20 && Math.abs(state.player.vx) > 0.1; i += 1) state = stepHauntedSession(state, HAUNTED_STEP_MS).state;
  return state;
}

function interact(initial: HauntedSessionState): HauntedSessionState {
  const withInput = { ...initial, input: pressAction(initial.input, 'interact') };
  return stepHauntedSession(withInput, HAUNTED_STEP_MS).state;
}
