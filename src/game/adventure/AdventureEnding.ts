import { createHauntedInputState } from '../haunted/HauntedInput';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import {
  getRoomState,
  markRoomInteraction,
  setRoomSwitch,
  type AdventureState,
} from './AdventureState';
import { LABORATORY_ENCOUNTER_SWITCHES } from './LaboratoryEncounter';

export const ADVENTURE_ENDING_SWITCHES = {
  started: 'ending-started',
  evidenceSeen: 'ending-evidence-seen',
  ghostStingSeen: 'ending-ghost-sting-seen',
  complete: 'ending-complete',
} as const;

export type AdventureEndingPhase =
  | 'locked'
  | 'ready'
  | 'awakening'
  | 'evidence'
  | 'ghost-sting'
  | 'complete';

export type AdventureEndingStart = {
  session: HauntedSessionState;
  adventure: AdventureState;
};

export function getAdventureEndingPhase(adventure: AdventureState): AdventureEndingPhase {
  const laboratory = getRoomState(adventure, 'laboratory');
  if (laboratory.switches[LABORATORY_ENCOUNTER_SWITCHES.complete] !== true) return 'locked';

  const bedroom = getRoomState(adventure, 'bedroom');
  if (bedroom.switches[ADVENTURE_ENDING_SWITCHES.complete] === true) return 'complete';
  if (bedroom.switches[ADVENTURE_ENDING_SWITCHES.ghostStingSeen] === true) return 'ghost-sting';
  if (bedroom.switches[ADVENTURE_ENDING_SWITCHES.evidenceSeen] === true) return 'evidence';
  if (bedroom.switches[ADVENTURE_ENDING_SWITCHES.started] === true) return 'awakening';
  return 'ready';
}

export function shouldBeginAdventureEnding(adventure: AdventureState): boolean {
  return getAdventureEndingPhase(adventure) === 'ready';
}

export function isAdventureEndingActive(adventure: AdventureState): boolean {
  const phase = getAdventureEndingPhase(adventure);
  return phase === 'awakening' || phase === 'evidence' || phase === 'ghost-sting';
}

export function isAdventureEndingComplete(adventure: AdventureState): boolean {
  return getAdventureEndingPhase(adventure) === 'complete';
}

export function beginAdventureEnding(
  session: HauntedSessionState,
  adventure: AdventureState,
): AdventureEndingStart {
  if (!shouldBeginAdventureEnding(adventure)) return { session, adventure };

  let nextAdventure = markRoomInteraction(adventure, 'bedroom', 'ending-awakening');
  nextAdventure = setRoomSwitch(nextAdventure, 'bedroom', ADVENTURE_ENDING_SWITCHES.started, true);
  nextAdventure = {
    ...nextAdventure,
    currentRoom: 'bedroom',
    currentEntry: 'bedroom-default',
  };

  const player = {
    ...session.player,
    x: 16,
    y: 104,
    vx: 0,
    vy: 0,
    grounded: true,
    facing: 'right' as const,
  };

  return {
    adventure: nextAdventure,
    session: {
      ...session,
      player,
      domestic: {
        ...session.domestic,
        player: { x: 16, facing: 'right' },
      },
      input: createHauntedInputState(),
      combat: {
        ...session.combat,
        hp: session.combat.maxHp,
        projectiles: [],
        nextAttackAllowedMs: session.elapsedMs,
        invulnerableUntilMs: 0,
      },
      threats: {
        ...session.threats,
        ghosts: [],
      },
    },
  };
}

export function completeAdventureEnding(adventure: AdventureState): AdventureState {
  if (getAdventureEndingPhase(adventure) !== 'ghost-sting') return adventure;
  let next = markRoomInteraction(adventure, 'bedroom', 'ending-complete');
  next = setRoomSwitch(next, 'bedroom', ADVENTURE_ENDING_SWITCHES.complete, true);
  return next;
}
