import { createHauntedScreenshotScenario, HAUNTED_SCREENSHOT_SCENARIOS } from '../src/app/HauntedScreenshotScenarios';

function equal(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: ${String(actual)} !== ${String(expected)}`);
}
function ok(value: unknown, label: string) { if (!value) throw new Error(label); }

equal(HAUNTED_SCREENSHOT_SCENARIOS.length, 12, 'visual tour has twelve deterministic haunted gameplay presets');

const sleepy = createHauntedScreenshotScenario('sleepy');
equal(sleepy.domestic.wallyState, 'sleepy', 'sleepy preset preserves the starting state');
equal(sleepy.objective.phase, 'prepare', 'sleepy preset remains playable');

const telegraph = createHauntedScreenshotScenario('ghost-telegraph');
equal(telegraph.threats.ghosts[0]?.phase, 'telegraph', 'telegraph preset freezes Ghost materialization');

const active = createHauntedScreenshotScenario('ghost-active');
equal(active.threats.ghosts[0]?.phase, 'active', 'active preset shows an attacking Ghost');

const jump = createHauntedScreenshotScenario('jump');
equal(jump.player.grounded, false, 'jump preset puts Wally airborne');
ok(jump.player.y < 104, 'jump preset moves Wally above the floor');

const attack = createHauntedScreenshotScenario('attack');
equal(attack.combat.projectiles.length, 1, 'attack preset shows Dream Spark in flight');
ok(Math.abs((attack.combat.projectiles[0]?.x ?? 999) - attack.player.x) <= 22, 'Dream Spark remains close enough to select Wally attack pose');

const defeated = createHauntedScreenshotScenario('ghost-defeated');
equal(defeated.threats.ghosts[0]?.phase, 'dying', 'defeated preset shows the Ghost death pose');

const hit = createHauntedScreenshotScenario('hit');
equal(hit.combat.hp, 2, 'hit preset removes one heart');
ok(hit.combat.invulnerableUntilMs > hit.elapsedMs, 'hit preset freezes Wally inside invulnerability feedback');

const dressed = createHauntedScreenshotScenario('dressed');
equal(dressed.domestic.flags.dressed, true, 'dressed preset uses the alternate Wally palette');

const escape = createHauntedScreenshotScenario('escape-ready');
equal(escape.objective.phase, 'escape-ready', 'escape preset opens the exit phase');
equal(escape.domestic.flags.dressed, true, 'escape preset keeps Wally dressed');
ok(escape.domestic.collected.includes('keys'), 'escape preset includes the keys');
equal(escape.threats.ghosts[0]?.phase, 'telegraph', 'escape preset shows the final fair Ghost warning');

const success = createHauntedScreenshotScenario('success');
equal(success.objective.phase, 'completed', 'success preset renders terminal victory');

const fail = createHauntedScreenshotScenario('haunted-fail');
equal(fail.objective.phase, 'failed', 'failure preset renders terminal defeat');
equal(fail.objective.reason, 'haunted', 'failure preset is specifically combat defeat');
equal(fail.combat.hp, 0, 'haunted failure has no hearts remaining');

console.log('haunted screenshot scenario tests passed');
