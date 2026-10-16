import { equal, test } from './assert';
import {
  BEDROOM_REAPER,
  bedroomReaperCycleMs,
  isBedroomReaperVisible,
  isPlayerHitByBedroomReaper,
  resolveBedroomReaper,
  resolveBedroomReaperSparks,
  stepBedroomReaper,
  type BedroomReaperState,
} from '../src/game/adventure/BedroomReaperHazard';
import { createHauntedCombatState } from '../src/game/haunted/HauntedCombat';
import { explorationIn } from './support/ThreatScenarios';

const bedroom = explorationIn('bedroom');
const r = BEDROOM_REAPER;
const telegraphAt = r.gapMs + r.riseMs + r.glideMs;
const sweepAt = telegraphAt + r.telegraphMs;
const recoveryAt = sweepAt + r.sweepMs;

function run(fromMs: number, toMs: number, playerX: number, state?: BedroomReaperState): BedroomReaperState | undefined {
  let current = state;
  for (let t = fromMs; t <= toMs; t += 33) current = stepBedroomReaper(bedroom, t, playerX, current, 33);
  return current;
}

void test('a reaper rises at the wall farther from Wally and glides to him', () => {
  equal(stepBedroomReaper(bedroom, 0, 30, undefined, 33)?.x, r.rightSpawnX, 'Wally on the left: it comes from the right');
  equal(stepBedroomReaper(bedroom, 0, 100, undefined, 33)?.x, r.leftSpawnX, 'Wally on the right: it comes from the left');
  const reaper = run(0, telegraphAt - 1, 60);
  equal(Math.abs((reaper?.x ?? 0) - 60) <= r.stopDistance + 0.01, true, 'it reaches Wally by the end of the glide');
  equal(stepBedroomReaper(explorationIn('hallway'), 0, 60, undefined, 33), undefined, 'no reapers outside the altered Bedroom');
});

void test('the sweep cuts a grounded Wally within reach; a jump or distance clears it', () => {
  const state = run(0, sweepAt + 50, 60);
  const reaper = resolveBedroomReaper(bedroom, sweepAt + 50, state, 60);
  equal(isPlayerHitByBedroomReaper({ x: state!.x + r.reach - 1, grounded: true }, reaper), true, 'grounded inside the reach');
  equal(isPlayerHitByBedroomReaper({ x: state!.x, grounded: false }, reaper), false, 'mid-jump');
  equal(isPlayerHitByBedroomReaper({ x: state!.x + r.reach + 2, grounded: true }, reaper), false, 'out of reach');
  const telegraph = resolveBedroomReaper(bedroom, telegraphAt + 50, state, 60);
  equal(isPlayerHitByBedroomReaper({ x: state!.x, grounded: true }, telegraph), false, 'the raised scythe only warns');
});

void test('one spark dispels a reaper that is out, never one still rising, and another always follows', () => {
  const state = run(0, recoveryAt + 50, 60)!;
  const spark = { ...createHauntedCombatState(), projectiles: [{ id: 1, x: state.x, y: 90, vx: 1, damage: 1 as const }] };
  const rising = resolveBedroomReaper(bedroom, r.gapMs + 100, state, 60);
  equal(resolveBedroomReaperSparks(spark, rising, state, 0).events.length, 0, 'a spark passes through a rising reaper');
  const gliding = resolveBedroomReaper(bedroom, r.gapMs + r.riseMs + 100, state, 60);
  equal(resolveBedroomReaperSparks(spark, gliding, state, 0).events[0]?.type, 'BEDROOM_REAPER_DISPELLED', 'a spark dispels a gliding reaper');
  const spent = resolveBedroomReaper(bedroom, recoveryAt + 50, state, 60);
  const result = resolveBedroomReaperSparks(spark, spent, state, recoveryAt + 50);
  equal(result.events[0]?.type, 'BEDROOM_REAPER_DISPELLED', 'a spark dispels it while it is spent');
  equal(result.combat.projectiles.length, 0, 'the spark is used up');
  equal(isBedroomReaperVisible(resolveBedroomReaper(bedroom, recoveryAt + 150, result.state, 60)), true, 'it blinks away for a moment');
  equal(isBedroomReaperVisible(resolveBedroomReaper(bedroom, recoveryAt + 50 + r.dispelFadeMs, result.state, 60)), false, 'then it is gone');
  const next = stepBedroomReaper(bedroom, bedroomReaperCycleMs(bedroom) + 10, 60, result.state, 33);
  equal(next?.dispelled, false, 'the next reaper comes regardless');
});
