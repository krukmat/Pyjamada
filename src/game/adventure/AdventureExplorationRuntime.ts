import { consumeTransientActions, createHauntedInputState } from '../haunted/HauntedInput';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import { stepHauntedPlayerPhysics } from '../haunted/PlayerPhysics';
import {
  getRoomState,
  markRoomInteraction,
  setStoryFlag,
  type AdventureState,
  type RoomId,
} from './AdventureState';
import {
  applyRoomInteractionEffect,
  type RoomInteractionEffectEvent,
} from './RoomInteractionEffects';
import {
  getRoomExit,
  resolveRoomInteractionTarget,
  type ResolvedRoomInteractionTarget,
} from './RoomRegistry';

export type AdventureInteractionTarget = ResolvedRoomInteractionTarget;

export type AdventureExplorationEvent =
  | { type: 'ROOM_TRANSITION_REQUESTED'; targetRoom: RoomId; targetEntry: string }
  | { type: 'LIVING_ROOM_DOOR_REACHED' }
  | RoomInteractionEffectEvent;

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

export function isLivingRoomTvActivated(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'living-room').switches['tv-on'] === true;
}

export function hasLabTransmissionBeenSeen(adventure: AdventureState): boolean {
  return adventure.storyFlags.labTransmissionSeen;
}

export function isLivingRoomPhotoInspected(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'living-room').inspected.includes('photo-reflection');
}

export function isLivingRoomRadioInspected(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'living-room').inspected.includes('radio-static');
}

export function isLivingRoomPhotoFocused(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'living-room').switches['photo-focused'] === true;
}

export function isLivingRoomRadioFocused(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'living-room').switches['radio-focused'] === true;
}

export function isLivingRoomSourceCueRevealed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'living-room').switches['source-hum-traced'] === true;
}

export function isKitchenCircuitOverloaded(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'kitchen').switches['circuit-overloaded'] === true;
}

export function isKitchenPowerRerouted(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'kitchen').switches['power-rerouted'] === true;
}

export function isKitchenBreakerInspected(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'kitchen').inspected.includes('breaker-panel');
}

export function isBathroomMirrorAnomalySeen(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'bathroom').switches['mirror-anomaly-seen'] === true;
}

export function isBathroomLightOff(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'bathroom').switches['bathroom-light-off'] === true;
}

export function isBathroomRouteRevealed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'bathroom').switches['mirror-route-revealed'] === true;
}

export function isAtticLogInspected(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'attic').inspected.includes('attic-experiment-log');
}

export function isAtticSensorsInspected(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'attic').inspected.includes('attic-sensor-map');
}

export function isAtticExperimentRevealed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'attic').switches['experiment-revealed'] === true;
}

export function isAtticBasementRouteRevealed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'attic').switches['basement-route-revealed'] === true;
}

export function isAtticRecorderFocused(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'attic').switches['recorder-focused'] === true;
}

/** Legacy W1 review marker retained for save/screenshot compatibility. */
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
      const effect = applyRoomInteractionEffect(nextAdventure, adventure.currentRoom, target.behavior.effect);
      nextAdventure = effect.adventure;
      events.push(...effect.events);
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
