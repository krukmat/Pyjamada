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

equal(HAUNTED_SCREENSHOT_SCENARIOS.length, 20, 'visual tour has twenty deterministic gameplay/adventure presets through W2 closeout');

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
equal(alteredBedroom.objective.phase, 'completed', 'Haunted slice remains completed after the false escape');
equal(alteredAdventure.currentRoom, 'bedroom', 'altered Bedroom remains in Bedroom');
equal(alteredAdventure.storyFlags.bedroomEscapeAttempted, true, 'Adventure state owns post-false-escape exploration');

const hallwayArrival = createScreenshotAdventureState('hallway-arrival');
equal(hallwayArrival.currentRoom, 'hallway', 'hallway arrival screenshot selects Hallway');
equal(getRoomState(hallwayArrival, 'hallway').inspected.length, 0, 'arrival precedes anomaly inspection');

const hallwayClock = createScreenshotAdventureState('hallway-clock');
equal(getRoomState(hallwayClock, 'hallway').inspected.includes('backward-clock'), true, 'clock screenshot records anomaly');
equal(getRoomState(hallwayClock, 'hallway').switches['living-room-unlocked'], true, 'clock screenshot reveals Living Room path');

const livingDoor = createScreenshotAdventureState('living-door');
equal(livingDoor.currentRoom, 'hallway', 'Living Room door screenshot remains at the Hallway threshold');
equal(getRoomState(livingDoor, 'hallway').switches['living-room-unlocked'], true, 'Living Room door is unlocked for the threshold screenshot');

const livingRoomArrival = createScreenshotAdventureState('living-room-arrival');
equal(livingRoomArrival.currentRoom, 'living-room', 'W2 Gate A screenshot enters Living Room');
equal(livingRoomArrival.currentEntry, 'living-room-from-hallway', 'Living Room screenshot uses production Hallway entry');
ok(livingRoomArrival.visitedRooms.includes('living-room'), 'Living Room becomes visited in the screenshot state');
equal(getRoomState(livingRoomArrival, 'hallway').switches['living-room-unlocked'], true, 'Living Room arrival preserves Hallway unlock state');

const livingRoomStatic = createScreenshotAdventureState('living-room-static');
equal(livingRoomStatic.currentRoom, 'living-room', 'TV static screenshot remains in Living Room');
equal(getRoomState(livingRoomStatic, 'living-room').switches['tv-on'], true, 'TV static screenshot powers on the television');
equal(livingRoomStatic.storyFlags.labTransmissionSeen, false, 'static screenshot precedes lab transmission');

const livingRoomTransmission = createScreenshotAdventureState('living-room-transmission');
equal(livingRoomTransmission.currentRoom, 'living-room', 'transmission screenshot remains in Living Room');
equal(livingRoomTransmission.storyFlags.labTransmissionSeen, true, 'transmission screenshot records the global mystery hook');
equal(getRoomState(livingRoomTransmission, 'living-room').inspected.includes('television'), true, 'transmission screenshot records TV discovery');
equal(getRoomState(livingRoomTransmission, 'living-room').interactions.includes('tv-transmission'), true, 'transmission screenshot records TV interaction history');

const sourceCue = createScreenshotAdventureState('living-room-source-cue');
equal(sourceCue.currentRoom, 'living-room', 'source-cue screenshot stays inside W2');
equal(sourceCue.storyFlags.labTransmissionSeen, true, 'source cue follows the lab transmission');
equal(getRoomState(sourceCue, 'living-room').inspected.includes('photo-reflection'), true, 'source-cue screenshot includes the photo anomaly');
equal(getRoomState(sourceCue, 'living-room').inspected.includes('radio-static'), true, 'source-cue screenshot includes the radio clue');
equal(getRoomState(sourceCue, 'living-room').switches['source-hum-traced'], true, 'source-cue screenshot exposes the directional hook');
equal(getRoomState(sourceCue, 'living-room').switches['radio-focused'], true, 'source-cue screenshot focuses the radio feedback');

console.log('haunted screenshot scenario tests passed');
