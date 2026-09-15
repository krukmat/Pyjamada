import {
  createHauntedScreenshotScenario,
  createScreenshotAdventureState,
  HAUNTED_SCREENSHOT_SCENARIOS,
} from '../src/app/HauntedScreenshotScenarios';
import { getRoomState } from '../src/game/adventure/AdventureState';
import { GHOST_RULES } from '../src/game/haunted/HauntedThreats';

function equal(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: ${String(actual)} !== ${String(expected)}`);
}
function ok(value: unknown, label: string) { if (!value) throw new Error(label); }

equal(HAUNTED_SCREENSHOT_SCENARIOS.length, 16, 'visual tour has sixteen deterministic gameplay and W1 adventure presets');

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
const defeatedGhost = defeated.threats.ghosts[0];
const defeatedRemaining = (defeatedGhost?.phaseUntilMs ?? defeated.elapsedMs) - defeated.elapsedMs;
ok(defeatedRemaining > 0 && defeatedRemaining < GHOST_RULES.dyingMs, 'defeated preset freezes inside the death transition rather than at an edge frame');
ok(Math.abs(defeatedRemaining - GHOST_RULES.dyingMs / 2) <= 5, 'defeated preset captures the fragmentation midpoint');

const hit = createHauntedScreenshotScenario('hit');
equal(hit.combat.hp, 2, 'hit preset removes one heart');
ok(hit.combat.invulnerableUntilMs > hit.elapsedMs, 'hit preset freezes Wally inside invulnerability feedback');
ok(hit.player.vx < 0, 'hit preset preserves visible knockback direction');
ok(hit.player.grounded === false, 'hit preset captures Wally airborne after contact');
const hitGhost = hit.threats.ghosts[0];
ok(Boolean(hitGhost) && Math.abs((hitGhost?.x ?? hit.player.x) - hit.player.x) >= 28, 'hit preset leaves an unmistakable post-contact gap between actors');

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

const alteredBedroom = createHauntedScreenshotScenario('altered-bedroom');
const alteredAdventure = createScreenshotAdventureState('altered-bedroom');
equal(alteredBedroom.objective.phase, 'exploration', 'altered Bedroom screenshot is post-false-escape exploration');
equal(alteredAdventure.currentRoom, 'bedroom', 'altered Bedroom remains in Bedroom');
equal(alteredAdventure.storyFlags.bedroomEscapeAttempted, true, 'altered Bedroom remembers false escape');

const hallwayArrival = createScreenshotAdventureState('hallway-arrival');
equal(hallwayArrival.currentRoom, 'hallway', 'hallway arrival screenshot selects Hallway');
equal(getRoomState(hallwayArrival, 'hallway').inspected.length, 0, 'arrival precedes anomaly inspection');

const hallwayClock = createScreenshotAdventureState('hallway-clock');
equal(getRoomState(hallwayClock, 'hallway').inspected.includes('backward-clock'), true, 'clock screenshot records anomaly');
equal(getRoomState(hallwayClock, 'hallway').switches['living-room-unlocked'], true, 'clock screenshot reveals Living Room path');

const livingDoor = createScreenshotAdventureState('living-door');
equal(getRoomState(livingDoor, 'hallway').interactions.includes('living-room-door'), true, 'Living Room screenshot captures W1 end gate');

console.log('haunted screenshot scenario tests passed');
