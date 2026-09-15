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
import {
  getRoomExit,
  resolveRoomInteractionTarget,
  type ResolvedRoomInteractionTarget,
} from './RoomRegistry';

export type AdventureInteractionTarget = ResolvedRoomInteractionTarget;

export type AdventureExplorationEvent =
  | { type: 'ROOM_TRANSITION_REQUESTED'; targetRoom: RoomId; targetEntry: string }
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
    },
  };
}

export function findAdventureInteractionTarget(
  adventure: AdventureState,
  playerX: number,
): AdventureInteractionTarget | undefined {
  if (!isAdventureExplorationActive(adventure)) return undefined;
  return resolveRoomInteractionTarget(adventure, playerX);
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
    if (target?.available && target.behavior.type === 'exit') {
      const exit = getRoomExit(adventure.currentRoom, target.behavior.exitId);
      if (exit) {
        events.push({
          type: 'ROOM_TRANSITION_REQUESTED',
          targetRoom: exit.targetRoom,
          targetEntry: exit.targetEntry,
        });
      }
    } else if (target?.available && target.behavior.type === 'effect') {
      if (target.behavior.effect === 'inspect-backward-clock') {
        const wasInspected = isHallwayClockInspected(nextAdventure);
        nextAdventure = markRoomInspected(nextAdventure, 'hallway', 'backward-clock');
        nextAdventure = setRoomSwitch(nextAdventure, 'hallway', 'living-room-unlocked', true);
        if (!wasInspected) {
          events.push({ type: 'HALLWAY_CLOCK_INSPECTED' });
          events.push({ type: 'LIVING_ROOM_PATH_REVEALED' });
        }
      } else if (target.behavior.effect === 'reach-living-room-door') {
        const wasReached = isLivingRoomDoorReached(nextAdventure);
        nextAdventure = markRoomInteraction(nextAdventure, 'hallway', 'living-room-door');
        if (!wasReached) events.push({ type: 'LIVING_ROOM_DOOR_REACHED' });
      }
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
