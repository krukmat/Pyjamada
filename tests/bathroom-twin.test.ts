import { equal, test } from './assert';
import {
  applyFalseEscape,
  isExplorationCombatEnabled,
  stepAdventureExploration,
} from '../src/game/adventure/AdventureExplorationRuntime';
import { createAdventureState, createRoomPersistentState, setRoomSwitch, type AdventureState } from '../src/game/adventure/AdventureState';
import {
  BATHROOM_TWIN,
  bathroomTwinX,
  isBathroomTwinActive,
  isBathroomTwinDispelled,
  isPlayerTouchingBathroomTwin,
} from '../src/game/adventure/BathroomTwinHazard';
import { applyRoomInteractionEffect } from '../src/game/adventure/RoomInteractionEffects';
import { createHauntedInputState } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function setup(runId: string, lightOff: boolean, routeRevealed = false) {
  const base = createHauntedSession(runId);
  const prepared: HauntedSessionState = {
    ...base,
    domestic: { ...base.domestic, wallyState: 'normal', flags: { ...base.domestic.flags, dressed: true }, collected: ['keys'] },
    objective: { phase: 'completed' },
  };
  const escaped = applyFalseEscape(prepared, createAdventureState());
  let adventure: AdventureState = {
    ...escaped.adventure,
    currentRoom: 'bathroom',
    currentEntry: 'bathroom-from-kitchen',
    visitedRooms: [...escaped.adventure.visitedRooms, 'bathroom'],
    rooms: { ...escaped.adventure.rooms, bathroom: createRoomPersistentState() },
  };
  adventure = setRoomSwitch(adventure, 'bathroom', 'mirror-anomaly-seen', true);
  if (lightOff) adventure = setRoomSwitch(adventure, 'bathroom', 'bathroom-light-off', true);
  if (routeRevealed) adventure = setRoomSwitch(adventure, 'bathroom', 'mirror-route-revealed', true);
  return { session: at({ ...escaped.session, elapsedMs: 5_000 }, 82, 'left'), adventure };
}

function at(session: HauntedSessionState, x: number, facing: 'left' | 'right' = 'left'): HauntedSessionState {
  return {
    ...session,
    player: { ...session.player, x, y: 104, vx: 0, vy: 0, grounded: true, facing },
    domestic: { ...session.domestic, player: { ...session.domestic.player, x: Math.round(x), facing } },
    input: createHauntedInputState(),
  };
}

function shootUntilSettled(session: HauntedSessionState, adventure: AdventureState) {
  let s: HauntedSessionState = { ...session, input: { ...session.input, attackPressed: true } };
  let a = adventure;
  const events: string[] = [];
  for (let i = 0; i < 60; i += 1) {
    const stepped = stepAdventureExploration(s, a, 16);
    events.push(...stepped.events.map(event => event.type));
    s = { ...stepped.session, input: createHauntedInputState() };
    a = stepped.adventure;
  }
  return { session: s, adventure: a, events };
}

void test('the reflection only steps out while the light is off and the route is unconfirmed', () => {
  equal(isBathroomTwinActive(setup('twin-light-on', false).adventure), false, 'no reflection with the light on');
  equal(isBathroomTwinActive(setup('twin-route', true, true).adventure), false, 'no reflection once the route is confirmed');
  const live = setup('twin-live', true).adventure;
  equal(isBathroomTwinActive(live), true, 'the reflection is out after the light test');
  equal(isExplorationCombatEnabled(live), true, 'Dream Sparks are enabled against the reflection');
});

void test('it mirrors Wally and only touches him at the glass', () => {
  equal(bathroomTwinX(82), 2 * BATHROOM_TWIN.mirrorX - 82, 'the reflection stands at the mirrored position');
  equal(isPlayerTouchingBathroomTwin(82), false, 'away from the mirror there is no contact');
  equal(isPlayerTouchingBathroomTwin(BATHROOM_TWIN.mirrorX), true, 'meeting at the glass is contact');
  const s = setup('twin-contact', true);
  const touching = stepAdventureExploration(at(s.session, BATHROOM_TWIN.mirrorX), s.adventure, 16);
  equal(touching.session.combat.hp, s.session.combat.hp - 1, 'touching the reflection costs a heart');
});

void test('the reflection blocks the mirror until two sparks dispel it', () => {
  const s = setup('twin-dispel', true);
  const blocked = applyRoomInteractionEffect(s.adventure, 'bathroom', 'inspect-bathroom-mirror');
  equal(blocked.events.some(event => event.type === 'BATHROOM_TWIN_BLOCKS_MIRROR'), true, 'the mirror is blocked');

  const first = shootUntilSettled(s.session, s.adventure);
  equal(first.events.includes('BATHROOM_TWIN_HIT'), true, 'the first spark wounds the reflection');
  equal(isBathroomTwinActive(first.adventure), true, 'one spark is not enough');

  const second = shootUntilSettled(first.session, first.adventure);
  equal(second.events.includes('BATHROOM_TWIN_DISPELLED'), true, 'the second spark dispels it');
  equal(isBathroomTwinDispelled(second.adventure), true, 'dispelled state is stored');
  equal(second.session.combat.hp, s.session.combat.hp, 'shooting from across the room never touches it');

  const confirmed = applyRoomInteractionEffect(second.adventure, 'bathroom', 'inspect-bathroom-mirror');
  equal(confirmed.events.some(event => event.type === 'BATHROOM_ROUTE_REVEALED'), true, 'the mirror works once the reflection is gone');
});

void test('a stopped threat clock cannot leave Wally stuck invulnerable', () => {
  const s = setup('twin-clamp', false);
  const stale = { ...s.session, combat: { ...s.session.combat, invulnerableUntilMs: s.session.elapsedMs + 500 } };
  const stepped = stepAdventureExploration(stale, s.adventure, 16);
  equal(stepped.session.combat.invulnerableUntilMs, stepped.session.elapsedMs, 'invulnerability expires in a calm room');
});

console.log('bathroom twin tests passed');
