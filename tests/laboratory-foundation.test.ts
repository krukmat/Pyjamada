import { equal, test } from './assert';
import {
  applyFalseEscape,
  findAdventureInteractionTarget,
  isLaboratoryCombatEnabled,
  stepAdventureExploration,
  type AdventureExplorationEvent,
} from '../src/game/adventure/AdventureExplorationRuntime';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { createAdventureState, setRoomSwitch } from '../src/game/adventure/AdventureState';
import { applyRoomInteractionEffect } from '../src/game/adventure/RoomInteractionEffects';
import { transitionAdventure } from '../src/game/adventure/RoomRegistry';
import { createHauntedInputState, pressAction } from '../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function preparedSession(runId: string): HauntedSessionState {
  const base = createHauntedSession(runId);
  return {
    ...base,
    domestic: {
      ...base.domestic,
      wallyState: 'normal',
      flags: { ...base.domestic.flags, dressed: true },
      collected: ['keys'],
      objectStates: { ...base.domestic.objectStates, wardrobe: 'used', keys: 'collected' },
      interactionCounts: { ...base.domestic.interactionCounts, wardrobe: 1, keys: 1 },
    },
    objective: { phase: 'completed' },
  };
}

function at(session: HauntedSessionState, x: number): HauntedSessionState {
  return {
    ...session,
    player: { ...session.player, x, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...session.domestic, player: { x: Math.round(x), facing: 'right' } },
    input: pressAction(createHauntedInputState(), 'interact'),
  };
}

function transitionRequest(events: readonly AdventureExplorationEvent[]) {
  return events.find((event): event is Extract<AdventureExplorationEvent, { type: 'ROOM_TRANSITION_REQUESTED' }> => event.type === 'ROOM_TRANSITION_REQUESTED');
}

function setupBasement(runId: string) {
  const falseEscape = applyFalseEscape(preparedSession(runId), createAdventureState());
  let adventure = falseEscape.adventure;

  const hallway = transitionAdventure(adventure, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);
  adventure = setRoomSwitch(hallway.state, 'hallway', 'living-room-unlocked', true);

  const living = transitionAdventure(adventure, 'living-room', 'living-room-from-hallway');
  if (living.status !== 'ok') throw new Error(living.reason);
  adventure = setRoomSwitch(living.state, 'living-room', 'source-hum-traced', true);

  const kitchen = transitionAdventure(adventure, 'kitchen', 'kitchen-from-living-room');
  if (kitchen.status !== 'ok') throw new Error(kitchen.reason);
  adventure = setRoomSwitch(kitchen.state, 'kitchen', 'power-rerouted', true);

  const bathroom = transitionAdventure(adventure, 'bathroom', 'bathroom-from-kitchen');
  if (bathroom.status !== 'ok') throw new Error(bathroom.reason);
  adventure = setRoomSwitch(bathroom.state, 'bathroom', 'mirror-route-revealed', true);

  const attic = transitionAdventure(adventure, 'attic', 'attic-from-bathroom');
  if (attic.status !== 'ok') throw new Error(attic.reason);
  adventure = setRoomSwitch(attic.state, 'attic', 'basement-route-revealed', true);

  const basement = transitionAdventure(adventure, 'basement', 'basement-from-attic');
  if (basement.status !== 'ok') throw new Error(basement.reason);

  const session: HauntedSessionState = {
    ...falseEscape.session,
    player: { ...falseEscape.session.player, x: basement.spawn.x, y: basement.spawn.y, vx: 0, vy: 0, grounded: true, facing: basement.spawn.facing },
    domestic: { ...falseEscape.session.domestic, player: { x: Math.round(basement.spawn.x), facing: basement.spawn.facing } },
    input: createHauntedInputState(),
  };

  return { session, adventure: basement.state };
}

void test('W6 T1 keeps Laboratory unavailable until the accepted W5 route is revealed', () => {
  const base = setupBasement('w6-lab-gate');
  const blocked = transitionAdventure(base.adventure, 'laboratory', 'laboratory-from-basement');
  equal(blocked.status, 'invalid', 'Laboratory transition is rejected before W5 route reveal');

  let adventure = setRoomSwitch(base.adventure, 'basement', 'basement-loss-of-control-revealed', true);
  const traceTarget = findAdventureInteractionTarget(adventure, 116);
  equal(traceTarget?.id, 'basement-laboratory-feed-hatch', 'W5 hatch remains the trace target before route reveal');

  const traced = applyRoomInteractionEffect(adventure, 'basement', 'trace-basement-laboratory-route');
  adventure = traced.adventure;
  const entryTarget = findAdventureInteractionTarget(adventure, 116);
  equal(entryTarget?.id, 'basement-laboratory-entry', 'same physical boundary becomes the Laboratory entry after trace');
  equal(entryTarget?.displayLabel, 'LABORATORY', 'entry has concrete player-facing label');
});

void test('W6 T1 supports production Basement -> Laboratory -> Basement navigation', () => {
  const base = setupBasement('w6-lab-navigation');
  let adventure = setRoomSwitch(base.adventure, 'basement', 'basement-loss-of-control-revealed', true);
  adventure = applyRoomInteractionEffect(adventure, 'basement', 'trace-basement-laboratory-route').adventure;

  const step = stepAdventureExploration(at(base.session, 116), adventure, 33);
  const request = transitionRequest(step.events);
  equal(request?.targetRoom, 'laboratory', 'hatch requests Laboratory transition after route reveal');
  if (!request) return;

  const laboratory = transitionAdventure(step.adventure, request.targetRoom, request.targetEntry);
  equal(laboratory.status, 'ok', 'Laboratory transition succeeds');
  if (laboratory.status !== 'ok') return;
  equal(laboratory.state.currentRoom, 'laboratory', 'current room becomes Laboratory');
  equal(laboratory.state.currentEntry, 'laboratory-from-basement', 'Laboratory uses production Basement entry');
  equal(laboratory.state.visitedRooms.includes('laboratory'), true, 'Laboratory is tracked as visited');

  const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: step.session, adventure: laboratory.state });
  const restored = decodeAdventureGameSession(encoded);
  equal(restored.status, 'ok', 'Laboratory state remains valid under save envelope v3');
  if (restored.status !== 'ok') return;
  equal(restored.state.adventure.currentRoom, 'laboratory', 'Continue resumes in Laboratory');

  const returnStep = stepAdventureExploration(at(restored.state.haunted, 10), restored.state.adventure, 33);
  const returnRequest = transitionRequest(returnStep.events);
  equal(returnRequest?.targetRoom, 'basement', 'Laboratory exposes deterministic Basement return route');
  if (!returnRequest) return;
  const basement = transitionAdventure(returnStep.adventure, returnRequest.targetRoom, returnRequest.targetEntry);
  equal(basement.status, 'ok', 'Laboratory return transition succeeds');
  if (basement.status !== 'ok') return;
  equal(basement.state.currentEntry, 'basement-from-laboratory', 'return uses dedicated Basement entry');
});

void test('W6 T3 enables Dream Spark only inside Laboratory exploration', () => {
  const base = setupBasement('w6-lab-combat');
  let adventure = setRoomSwitch(base.adventure, 'basement', 'basement-loss-of-control-revealed', true);
  adventure = applyRoomInteractionEffect(adventure, 'basement', 'trace-basement-laboratory-route').adventure;

  const blockedAttack = {
    ...base.session,
    input: pressAction(createHauntedInputState(), 'attack'),
  };
  const blockedStep = stepAdventureExploration(blockedAttack, adventure, 33);
  equal(blockedStep.session.combat.projectiles.length, 0, 'attack remains disabled in non-Laboratory exploration');

  const laboratory = transitionAdventure(adventure, 'laboratory', 'laboratory-from-basement');
  equal(laboratory.status, 'ok', 'combat test enters Laboratory through production transition');
  if (laboratory.status !== 'ok') return;
  equal(isLaboratoryCombatEnabled(laboratory.state), true, 'Laboratory explicitly enables exploration combat');

  const labSession: HauntedSessionState = {
    ...base.session,
    player: { ...base.session.player, x: 36, y: 104, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...base.session.domestic, player: { x: 36, facing: 'right' } },
    input: pressAction(createHauntedInputState(), 'attack'),
  };
  const noiseBefore = labSession.domestic.noise;
  const elapsedBefore = labSession.elapsedMs;
  const fired = stepAdventureExploration(labSession, laboratory.state, 33);
  equal(fired.session.combat.projectiles.length, 1, 'Laboratory attack reuses Dream Spark projectile creation');
  equal(fired.session.domestic.noise, noiseBefore, 'Laboratory Dream Spark does not reactivate domestic noise');
  equal(fired.session.threats.ghosts.length, 0, 'Laboratory combat bridge does not reactivate Ghost spawning');
  equal(fired.session.combat.hp, labSession.combat.hp, 'Basement electrical hazard cannot leak damage into Laboratory');
  equal(fired.session.elapsedMs, elapsedBefore + 33, 'Laboratory advances only the combat clock needed by cooldowns');

  const firstX = fired.session.combat.projectiles[0]?.x ?? 0;
  const advanced = stepAdventureExploration(fired.session, laboratory.state, 33);
  equal((advanced.session.combat.projectiles[0]?.x ?? 0) > firstX, true, 'Laboratory Dream Spark advances using existing projectile physics');

  const immediateRetry: HauntedSessionState = {
    ...advanced.session,
    input: pressAction(createHauntedInputState(), 'attack'),
  };
  const cooldown = stepAdventureExploration(immediateRetry, laboratory.state, 33);
  equal(cooldown.session.combat.projectiles.length, 1, 'existing Dream Spark cooldown rejects immediate second shot');

  const back = transitionAdventure(laboratory.state, 'basement', 'basement-from-laboratory');
  equal(back.status, 'ok', 'combat test can return to Basement');
  if (back.status !== 'ok') return;
  const cleared = stepAdventureExploration(
    { ...cooldown.session, input: createHauntedInputState() },
    back.state,
    33,
  );
  equal(cleared.session.combat.projectiles.length, 0, 'leaving Laboratory clears transient exploration projectiles');
  equal(isLaboratoryCombatEnabled(back.state), false, 'combat bridge is disabled again outside Laboratory');
});

console.log('W6 Laboratory foundation tests passed');
