import { consumeTransientActions, createHauntedInputState } from '../haunted/HauntedInput';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { stepHauntedPlayerPhysics } from '../haunted/PlayerPhysics';
import {
  getRoomState,
  markRoomInspected,
  markRoomInteraction,
  setRoomSwitch,
  setStoryFlag,
  type AdventureState,
  type RoomId,
} from './AdventureState';

export const W1_INTERACTIONS = {
  bedroomHallwayDoor: { id: 'bedroom-hallway-door', roomId: 'bedroom', x: 112, radius: 8, label: 'HALLWAY' },
  hallwayBedroomDoor: { id: 'hallway-bedroom-door', roomId: 'hallway', x: 10, radius: 8, label: 'BEDROOM' },
  hallwayClock: { id: 'backward-clock', roomId: 'hallway', x: 64, radius: 9, label: 'STRANGE CLOCK' },
  hallwayLivingDoor: { id: 'living-room-door', roomId: 'hallway', x: 114, radius: 8, label: 'LIVING ROOM' },
} as const;

export type AdventureInteractionTarget = {
  id: string;
  label: string;
  x: number;
  radius: number;
  roomId: RoomId;
  available: boolean;
};

export type AdventureExplorationEvent =
  | { type: 'ROOM_TRANSITION_REQUESTED'; targetRoom: 'bedroom' | 'hallway'; targetEntry: string }
  | { type: 'HALLWAY_CLOCK_INSPECTED' }
  | { type: 'LIVING_ROOM_PATH_REVEALED' }
  | { type: 'LIVING_ROOM_DOOR_REACHED' };

export type AdventureExplorationStep = {
  session: HauntedSessionState;
  adventure: AdventureState;
  events: AdventureExplorationEvent[];
};

export function isAdventureExplorationActive(adventure: AdventureState): boolean {
  return adventure.storyFlags.bedroomEscapeAttempted;
}

export function applyFalseEscape(
  session: HauntedSessionState,
  adventure: AdventureState,
): AdventureExplorationStep {
  let nextAdventure = setStoryFlag(adventure, 'bedroomEscapeAttempted', true);
  nextAdventure = setStoryFlag(nextAdventure, 'hallwayUnlocked', true);
  nextAdventure = markRoomInteraction(nextAdventure, 'bedroom', 'false-escape');

  const player = {
    ...session.player,
    x: 24,
    y: 104,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: 'right' as const,
  };

  return {
    adventure: nextAdventure,
    events: [],
    session: {
      ...session,
      player,
      domestic: {
        ...session.domestic,
        player: { x: 24, facing: 'right' },
      },
      input: createHauntedInputState(),
      combat: {
        ...session.combat,
        projectiles: [],
        invulnerableUntilMs: 0,
      },
      threats: {
        ...session.threats,
        ghosts: [],
      },
      objective: { phase: 'exploration' },
    },
  };
}

export function findAdventureInteractionTarget(
  adventure: AdventureState,
  playerX: number,
): AdventureInteractionTarget | undefined {
  if (!isAdventureExplorationActive(adventure)) return undefined;

  const candidates = adventure.currentRoom === 'bedroom'
    ? [W1_INTERACTIONS.bedroomHallwayDoor]
    : adventure.currentRoom === 'hallway'
      ? [W1_INTERACTIONS.hallwayBedroomDoor, W1_INTERACTIONS.hallwayClock, W1_INTERACTIONS.hallwayLivingDoor]
      : [];

  return candidates
    .map(target => ({
      ...target,
      available: target.id !== 'living-room-door' || isLivingRoomPathRevealed(adventure),
      distance: Math.abs(playerX - target.x),
    }))
    .filter(target => target.distance <= target.radius)
    .sort((a, b) => a.distance - b.distance || a.x - b.x)
    .map(({ distance: _distance, ...target }) => target)[0];
}

export function isHallwayClockInspected(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'hallway').inspected.includes('backward-clock');
}

export function isLivingRoomPathRevealed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'hallway').switches['living-room-unlocked'] === true;
}

export function isLivingRoomDoorReached(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'hallway').interactions.includes('living-room-door');
}

export function stepAdventureExploration(
  session: HauntedSessionState,
  adventure: AdventureState,
  deltaMs: number,
): AdventureExplorationStep {
  if (!isAdventureExplorationActive(adventure)) return { session, adventure, events: [] };

  const player = stepHauntedPlayerPhysics(session.player, session.input, Math.max(0, deltaMs) / 1000);
  let nextAdventure = adventure;
  const events: AdventureExplorationEvent[] = [];

  if (session.input.interactPressed) {
    const target = findAdventureInteractionTarget(adventure, player.x);
    if (target?.id === 'bedroom-hallway-door' && adventure.storyFlags.hallwayUnlocked) {
      events.push({ type: 'ROOM_TRANSITION_REQUESTED', targetRoom: 'hallway', targetEntry: 'hallway-from-bedroom' });
    } else if (target?.id === 'hallway-bedroom-door') {
      events.push({ type: 'ROOM_TRANSITION_REQUESTED', targetRoom: 'bedroom', targetEntry: 'bedroom-from-hallway' });
    } else if (target?.id === 'backward-clock') {
      const wasInspected = isHallwayClockInspected(nextAdventure);
      nextAdventure = markRoomInspected(nextAdventure, 'hallway', 'backward-clock');
      nextAdventure = setRoomSwitch(nextAdventure, 'hallway', 'living-room-unlocked', true);
      if (!wasInspected) {
        events.push({ type: 'HALLWAY_CLOCK_INSPECTED' });
        events.push({ type: 'LIVING_ROOM_PATH_REVEALED' });
      }
    } else if (target?.id === 'living-room-door' && target.available) {
      const wasReached = isLivingRoomDoorReached(nextAdventure);
      nextAdventure = markRoomInteraction(nextAdventure, 'hallway', 'living-room-door');
      if (!wasReached) events.push({ type: 'LIVING_ROOM_DOOR_REACHED' });
    }
  }

  return {
    adventure: nextAdventure,
    events,
    session: {
      ...session,
      player,
      domestic: {
        ...session.domestic,
        player: { x: Math.round(player.x), facing: player.facing },
      },
      input: consumeTransientActions(session.input),
    },
  };
}
