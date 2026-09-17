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

equal(HAUNTED_SCREENSHOT_SCENARIOS.length, 31, 'visual tour has thirty-one deterministic gameplay/adventure presets through W4 Attic');

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

const kitchenArrival = createScreenshotAdventureState('kitchen-arrival');
equal(kitchenArrival.currentRoom, 'kitchen', 'Kitchen arrival screenshot enters the W3 room');
equal(kitchenArrival.currentEntry, 'kitchen-from-living-room', 'Kitchen screenshot uses the production Living Room entry');
ok(kitchenArrival.visitedRooms.includes('kitchen'), 'Kitchen becomes visited in deterministic evidence');
equal(getRoomState(kitchenArrival, 'kitchen').switches['circuit-overloaded'], undefined, 'Kitchen arrival precedes electrical manipulation');

const kitchenOverload = createScreenshotAdventureState('kitchen-overload');
equal(kitchenOverload.currentRoom, 'kitchen', 'overload screenshot remains in Kitchen');
equal(getRoomState(kitchenOverload, 'kitchen').switches['microwave-on'], true, 'overload screenshot powers the microwave');
equal(getRoomState(kitchenOverload, 'kitchen').switches['circuit-overloaded'], true, 'overload screenshot captures failed circuit state');
equal(getRoomState(kitchenOverload, 'kitchen').switches['power-rerouted'], undefined, 'overload screenshot precedes puzzle solution');

const kitchenRerouted = createScreenshotAdventureState('kitchen-power-rerouted');
equal(kitchenRerouted.currentRoom, 'kitchen', 'rerouted screenshot remains in Kitchen');
equal(getRoomState(kitchenRerouted, 'kitchen').inspected.includes('breaker-panel'), true, 'rerouted screenshot records breaker discovery');
equal(getRoomState(kitchenRerouted, 'kitchen').switches['circuit-overloaded'], false, 'rerouted screenshot clears the overload');
equal(getRoomState(kitchenRerouted, 'kitchen').switches['microwave-on'], false, 'rerouted screenshot shuts down the microwave');
equal(getRoomState(kitchenRerouted, 'kitchen').switches['power-rerouted'], true, 'rerouted screenshot captures the W3A solution');

const bathroomArrival = createScreenshotAdventureState('bathroom-arrival');
equal(bathroomArrival.currentRoom, 'bathroom', 'Bathroom arrival screenshot enters the W3B room');
equal(bathroomArrival.currentEntry, 'bathroom-from-kitchen', 'Bathroom screenshot uses the production Kitchen entry');
ok(bathroomArrival.visitedRooms.includes('bathroom'), 'Bathroom becomes visited in deterministic evidence');
equal(getRoomState(bathroomArrival, 'bathroom').switches['mirror-anomaly-seen'], undefined, 'Bathroom arrival precedes explicit mirror inspection');

const mirrorMismatch = createScreenshotAdventureState('bathroom-mirror-mismatch');
equal(mirrorMismatch.currentRoom, 'bathroom', 'mirror mismatch screenshot stays in Bathroom');
equal(getRoomState(mirrorMismatch, 'bathroom').inspected.includes('mirror-mismatch'), true, 'mirror screenshot records anomaly inspection');
equal(getRoomState(mirrorMismatch, 'bathroom').switches['mirror-anomaly-seen'], true, 'mirror mismatch becomes explicit state');
equal(getRoomState(mirrorMismatch, 'bathroom').switches['bathroom-light-off'], undefined, 'mirror mismatch precedes light experiment');

const reflectedRoute = createScreenshotAdventureState('bathroom-reflected-route');
equal(getRoomState(reflectedRoute, 'bathroom').switches['mirror-anomaly-seen'], true, 'reflected route follows mirror discovery');
equal(getRoomState(reflectedRoute, 'bathroom').switches['bathroom-light-off'], true, 'reflected route screenshot darkens the real room');
equal(getRoomState(reflectedRoute, 'bathroom').switches['mirror-route-revealed'], undefined, 'reflected route screenshot precedes real-wall reveal');

const bathroomRevealed = createScreenshotAdventureState('bathroom-route-revealed');
equal(bathroomRevealed.currentRoom, 'bathroom', 'route reveal stays at the W3B boundary');
equal(getRoomState(bathroomRevealed, 'bathroom').switches['bathroom-light-off'], true, 'route reveal keeps the real room dark');
equal(getRoomState(bathroomRevealed, 'bathroom').switches['mirror-route-revealed'], true, 'route reveal materializes the matching real-wall seam');
equal(getRoomState(bathroomRevealed, 'bathroom').interactions.includes('mirror-route-confirmed'), true, 'route confirmation is persisted in deterministic evidence');

const atticArrival = createScreenshotAdventureState('attic-arrival');
equal(atticArrival.currentRoom, 'attic', 'Attic arrival screenshot enters W4');
equal(atticArrival.currentEntry, 'attic-from-bathroom', 'Attic screenshot uses production Bathroom entry');
ok(atticArrival.visitedRooms.includes('attic'), 'Attic becomes visited in deterministic evidence');
equal(getRoomState(atticArrival, 'attic').inspected.length, 0, 'Attic arrival precedes evidence inspection');

const atticEvidence = createScreenshotAdventureState('attic-evidence');
equal(atticEvidence.currentRoom, 'attic', 'evidence screenshot remains in Attic');
equal(getRoomState(atticEvidence, 'attic').inspected.includes('attic-experiment-log'), true, 'evidence screenshot includes experiment log');
equal(getRoomState(atticEvidence, 'attic').inspected.includes('attic-sensor-map'), true, 'evidence screenshot includes sensor map');
equal(getRoomState(atticEvidence, 'attic').switches['experiment-revealed'], undefined, 'evidence screenshot precedes central recording');

const atticRecording = createScreenshotAdventureState('attic-recording');
equal(atticRecording.currentRoom, 'attic', 'recording screenshot remains in Attic');
equal(getRoomState(atticRecording, 'attic').switches['experiment-revealed'], true, 'recording screenshot captures W-01 experiment reveal');
equal(getRoomState(atticRecording, 'attic').switches['recorder-focused'], true, 'recording screenshot focuses the central recorder');
equal(getRoomState(atticRecording, 'attic').switches['basement-route-revealed'], undefined, 'recording screenshot precedes route trace');

const atticRoute = createScreenshotAdventureState('attic-basement-route');
equal(atticRoute.currentRoom, 'attic', 'Basement route screenshot stays at W4 boundary');
equal(getRoomState(atticRoute, 'attic').switches['experiment-revealed'], true, 'route screenshot follows experiment reveal');
equal(getRoomState(atticRoute, 'attic').switches['basement-route-revealed'], true, 'route screenshot materializes concrete downward destination');
equal(getRoomState(atticRoute, 'attic').interactions.includes('basement-route-traced'), true, 'Basement route trace persists in screenshot state');

console.log('haunted screenshot scenario tests passed');
