import { applyFalseEscape } from '../game/adventure/AdventureExplorationRuntime';
import {
  createAdventureState,
  markRoomInspected,
  markRoomInteraction,
  setRoomSwitch,
  setStoryFlag,
  type AdventureState,
} from '../game/adventure/AdventureState';
import { ADVENTURE_ENDING_SWITCHES } from '../game/adventure/AdventureEnding';
import { transitionAdventure } from '../game/adventure/RoomRegistry';
import { LABORATORY_ENCOUNTER_SWITCHES } from '../game/adventure/LaboratoryEncounter';
import { VESPER_CONTROL_DEVICES } from '../game/adventure/LaboratoryVesperControl';
import { RESONATOR_WEAK_POINTS } from '../game/adventure/LaboratoryResonatorInstability';
import { VESPER_NIGHTMARE_HIT_SWITCHES } from '../game/adventure/LaboratoryVesperNightmare';
import { PLAYER_GROUND_Y } from '../game/core/World';
import { createHauntedSession, type HauntedSessionState } from '../game/haunted/HauntedSessionRuntime';
import type { HauntedGhostState } from '../game/haunted/HauntedThreats';

export const HAUNTED_SCREENSHOT_SCENARIOS = [
  'sleepy',
  'wake',
  'ghost-telegraph',
  'ghost-active',
  'jump',
  'attack',
  'ghost-defeated',
  'hit',
  'dressed',
  'escape-ready',
  'success',
  'haunted-fail',
  'altered-bedroom',
  'hallway-arrival',
  'hallway-clock',
  'living-door',
  'living-room-arrival',
  'living-room-static',
  'living-room-transmission',
  'living-room-source-cue',
  'kitchen-arrival',
  'kitchen-overload',
  'kitchen-power-rerouted',
  'bathroom-arrival',
  'bathroom-mirror-mismatch',
  'bathroom-reflected-route',
  'bathroom-route-revealed',
  'attic-arrival',
  'attic-evidence',
  'attic-recording',
  'attic-basement-route',
  'basement-arrival',
  'basement-power-fault',
  'basement-control-reveal',
  'laboratory-boundary',
  'laboratory-arrival',
  'vesper-control',
  'resonator-runaway',
  'vesper-nightmare',
  'resonator-shutdown',
  'ending-awakening',
  'ending-evidence',
  'ending-ghost-sting',
  'ending-credits',
] as const;

export type HauntedScreenshotScenario = (typeof HAUNTED_SCREENSHOT_SCENARIOS)[number];

const FROZEN_SPAWN_MS = 999_999;

type AdventureScreenshotScenario = Extract<
  HauntedScreenshotScenario,
  | 'altered-bedroom'
  | 'hallway-arrival'
  | 'hallway-clock'
  | 'living-door'
  | 'living-room-arrival'
  | 'living-room-static'
  | 'living-room-transmission'
  | 'living-room-source-cue'
  | 'kitchen-arrival'
  | 'kitchen-overload'
  | 'kitchen-power-rerouted'
  | 'bathroom-arrival'
  | 'bathroom-mirror-mismatch'
  | 'bathroom-reflected-route'
  | 'bathroom-route-revealed'
  | 'attic-arrival'
  | 'attic-evidence'
  | 'attic-recording'
  | 'attic-basement-route'
  | 'basement-arrival'
  | 'basement-power-fault'
  | 'basement-control-reveal'
  | 'laboratory-boundary'
  | 'laboratory-arrival'
  | 'vesper-control'
  | 'resonator-runaway'
  | 'vesper-nightmare'
  | 'resonator-shutdown'
  | 'ending-awakening'
  | 'ending-evidence'
  | 'ending-ghost-sting'
  | 'ending-credits'
>;

export function createHauntedScreenshotScenario(scenario: HauntedScreenshotScenario): HauntedSessionState {
  if (isAdventureScenario(scenario)) return explorationScreenshotSession(scenario);

  const base = awakeBase(scenario);

  switch (scenario) {
    case 'sleepy':
      return {
        ...createHauntedSession('screenshot-sleepy'),
        threats: { ...createHauntedSession('screenshot-sleepy').threats, nextSpawnAtMs: FROZEN_SPAWN_MS },
      };

    case 'wake':
      return withPlayer({
        ...base,
        domestic: {
          ...base.domestic,
          energy: 65,
          objectStates: { ...base.domestic.objectStates, bed: 'used' },
          interactionCounts: { ...base.domestic.interactionCounts, bed: 1 },
        },
      }, 20);

    case 'ghost-telegraph':
      return {
        ...withPlayer(base, 42),
        elapsedMs: 9_000,
        threats: withGhost(base, ghost(1, 108, 82, 'telegraph', 9_400)),
      };

    case 'ghost-active':
      return {
        ...withPlayer(base, 46),
        elapsedMs: 11_000,
        threats: withGhost(base, ghost(1, 82, 80, 'active')),
      };

    case 'jump': {
      const next = withPlayer(base, 52);
      return {
        ...next,
        elapsedMs: 12_000,
        player: { ...next.player, y: 76, vy: -18, grounded: false },
        threats: withGhost(base, ghost(1, 96, 78, 'active')),
      };
    }

    case 'attack': {
      const next = withPlayer(base, 50);
      return {
        ...next,
        elapsedMs: 13_000,
        combat: {
          ...next.combat,
          nextAttackAllowedMs: 13_325,
          nextProjectileId: 2,
          projectiles: [{ id: 1, x: 62, y: PLAYER_GROUND_Y - 18, vx: 76, damage: 1 }],
        },
        threats: withGhost(base, ghost(1, 88, 80, 'active')),
      };
    }

    case 'ghost-defeated':
      return {
        ...withPlayer(base, 58),
        elapsedMs: 14_000,
        threats: withGhost(base, ghost(1, 78, 80, 'dying', 14_110)),
      };

    case 'hit': {
      const next = withPlayer(base, 56);
      return {
        ...next,
        elapsedMs: 15_000,
        player: { ...next.player, x: 56, y: 92, vx: -24, vy: -18, grounded: false },
        domestic: { ...next.domestic, player: { ...next.domestic.player, x: 56, facing: 'right' } },
        combat: { ...next.combat, hp: 2, invulnerableUntilMs: 15_700 },
        threats: withGhost(base, ghost(1, 84, 82, 'active')),
      };
    }

    case 'dressed': {
      const next = withPlayer(base, 70);
      return {
        ...next,
        elapsedMs: 20_000,
        domestic: {
          ...next.domestic,
          flags: { ...next.domestic.flags, dressed: true },
          objectStates: { ...next.domestic.objectStates, wardrobe: 'used' },
          interactionCounts: { ...next.domestic.interactionCounts, wardrobe: 1 },
        },
        threats: withGhost(base, ghost(1, 99, 79, 'active')),
      };
    }

    case 'escape-ready': {
      const next = withPlayer(base, 91);
      return {
        ...next,
        elapsedMs: 28_000,
        domestic: preparedDomestic(next),
        objective: { phase: 'escape-ready' },
        threats: withGhost(base, ghost(1, 108, 82, 'telegraph', 28_420)),
      };
    }

    case 'success': {
      const next = withPlayer(base, 114);
      return {
        ...next,
        elapsedMs: 31_000,
        domestic: preparedDomestic(next),
        objective: { phase: 'completed' },
        threats: { ...next.threats, ghosts: [], nextSpawnAtMs: FROZEN_SPAWN_MS },
      };
    }

    case 'haunted-fail': {
      const next = withPlayer(base, 76);
      return {
        ...next,
        elapsedMs: 34_000,
        combat: { ...next.combat, hp: 0 },
        objective: { phase: 'failed', reason: 'haunted' },
        threats: withGhost(base, ghost(1, 80, 82, 'active')),
      };
    }
  }
}

export function createScreenshotAdventureState(scenario: HauntedScreenshotScenario): AdventureState {
  if (!isAdventureScenario(scenario)) return createAdventureState();

  const falseEscape = applyFalseEscape(explorationSeed(scenario), createAdventureState());
  let adventure = falseEscape.adventure;
  if (scenario === 'altered-bedroom') return adventure;

  const hallway = transitionAdventure(adventure, 'hallway', 'hallway-from-bedroom');
  if (hallway.status !== 'ok') throw new Error(hallway.reason);
  adventure = hallway.state;

  if (scenario !== 'hallway-arrival') {
    adventure = markRoomInspected(adventure, 'hallway', 'backward-clock');
    adventure = setRoomSwitch(adventure, 'hallway', 'living-room-unlocked', true);
  }
  if (scenario === 'living-door') {
    adventure = markRoomInteraction(adventure, 'hallway', 'living-room-door');
  }
  if (isLivingOrDeeperScenario(scenario)) {
    const livingRoom = transitionAdventure(adventure, 'living-room', 'living-room-from-hallway');
    if (livingRoom.status !== 'ok') throw new Error(livingRoom.reason);
    adventure = livingRoom.state;
  }
  if (isTvOnScenario(scenario)) {
    adventure = setRoomSwitch(adventure, 'living-room', 'tv-on', true);
    adventure = markRoomInteraction(adventure, 'living-room', 'tv-activated');
  }
  if (isTransmissionScenario(scenario)) {
    adventure = markRoomInspected(adventure, 'living-room', 'television');
    adventure = markRoomInteraction(adventure, 'living-room', 'tv-transmission');
    adventure = setStoryFlag(adventure, 'labTransmissionSeen', true);
  }
  if (isSourceCueScenario(scenario)) {
    adventure = markRoomInspected(adventure, 'living-room', 'photo-reflection');
    adventure = markRoomInteraction(adventure, 'living-room', 'photo-inspected');
    adventure = markRoomInspected(adventure, 'living-room', 'radio-static');
    adventure = markRoomInteraction(adventure, 'living-room', 'radio-inspected');
    adventure = markRoomInteraction(adventure, 'living-room', 'source-hum-traced');
    adventure = setRoomSwitch(adventure, 'living-room', 'photo-focused', false);
    adventure = setRoomSwitch(adventure, 'living-room', 'radio-focused', true);
    adventure = setRoomSwitch(adventure, 'living-room', 'source-hum-traced', true);
  }
  if (isKitchenOrDeeperScenario(scenario)) {
    const kitchen = transitionAdventure(adventure, 'kitchen', 'kitchen-from-living-room');
    if (kitchen.status !== 'ok') throw new Error(kitchen.reason);
    adventure = kitchen.state;
  }
  if (scenario === 'kitchen-overload' || scenario === 'kitchen-power-rerouted' || isBathroomOrDeeperScenario(scenario)) {
    adventure = markRoomInspected(adventure, 'kitchen', 'microwave');
    adventure = markRoomInteraction(adventure, 'kitchen', 'microwave-overload');
    adventure = setRoomSwitch(adventure, 'kitchen', 'microwave-on', true);
    adventure = setRoomSwitch(adventure, 'kitchen', 'circuit-overloaded', true);
  }
  if (scenario === 'kitchen-power-rerouted' || isBathroomOrDeeperScenario(scenario)) {
    adventure = markRoomInspected(adventure, 'kitchen', 'breaker-panel');
    adventure = markRoomInteraction(adventure, 'kitchen', 'breaker-inspected');
    adventure = markRoomInteraction(adventure, 'kitchen', 'power-rerouted');
    adventure = setRoomSwitch(adventure, 'kitchen', 'microwave-on', false);
    adventure = setRoomSwitch(adventure, 'kitchen', 'circuit-overloaded', false);
    adventure = setRoomSwitch(adventure, 'kitchen', 'power-rerouted', true);
  }
  if (isBathroomOrDeeperScenario(scenario)) {
    const bathroom = transitionAdventure(adventure, 'bathroom', 'bathroom-from-kitchen');
    if (bathroom.status !== 'ok') throw new Error(bathroom.reason);
    adventure = bathroom.state;
  }
  if (scenario === 'bathroom-mirror-mismatch' || scenario === 'bathroom-reflected-route' || scenario === 'bathroom-route-revealed' || isAtticOrDeeperScenario(scenario)) {
    adventure = markRoomInspected(adventure, 'bathroom', 'mirror-mismatch');
    adventure = markRoomInteraction(adventure, 'bathroom', 'mirror-inspected');
    adventure = setRoomSwitch(adventure, 'bathroom', 'mirror-anomaly-seen', true);
  }
  if (scenario === 'bathroom-reflected-route' || scenario === 'bathroom-route-revealed' || isAtticOrDeeperScenario(scenario)) {
    adventure = markRoomInteraction(adventure, 'bathroom', 'light-switch-tested');
    adventure = setRoomSwitch(adventure, 'bathroom', 'bathroom-light-off', true);
  }
  if (scenario === 'bathroom-route-revealed' || isAtticOrDeeperScenario(scenario)) {
    adventure = markRoomInteraction(adventure, 'bathroom', 'mirror-route-confirmed');
    adventure = setRoomSwitch(adventure, 'bathroom', 'mirror-route-revealed', true);
  }
  if (isAtticOrDeeperScenario(scenario)) {
    const attic = transitionAdventure(adventure, 'attic', 'attic-from-bathroom');
    if (attic.status !== 'ok') throw new Error(attic.reason);
    adventure = attic.state;
  }
  if (scenario === 'attic-evidence' || scenario === 'attic-recording' || scenario === 'attic-basement-route' || isBasementScenario(scenario)) {
    adventure = markRoomInspected(adventure, 'attic', 'attic-experiment-log');
    adventure = markRoomInteraction(adventure, 'attic', 'attic-log-inspected');
    adventure = markRoomInspected(adventure, 'attic', 'attic-sensor-map');
    adventure = markRoomInteraction(adventure, 'attic', 'attic-sensors-inspected');
    adventure = setRoomSwitch(adventure, 'attic', 'log-focused', false);
    adventure = setRoomSwitch(adventure, 'attic', 'sensors-focused', true);
  }
  if (scenario === 'attic-recording' || scenario === 'attic-basement-route' || isBasementScenario(scenario)) {
    adventure = markRoomInteraction(adventure, 'attic', 'attic-recording-played');
    adventure = setRoomSwitch(adventure, 'attic', 'sensors-focused', false);
    adventure = setRoomSwitch(adventure, 'attic', 'recorder-focused', true);
    adventure = setRoomSwitch(adventure, 'attic', 'experiment-revealed', true);
  }
  if (scenario === 'attic-basement-route' || isBasementScenario(scenario)) {
    adventure = markRoomInspected(adventure, 'attic', 'downward-cable-run');
    adventure = markRoomInteraction(adventure, 'attic', 'basement-route-traced');
    adventure = setRoomSwitch(adventure, 'attic', 'recorder-focused', false);
    adventure = setRoomSwitch(adventure, 'attic', 'basement-route-revealed', true);
  }
  if (isBasementScenario(scenario)) {
    const basement = transitionAdventure(adventure, 'basement', 'basement-from-attic');
    if (basement.status !== 'ok') throw new Error(basement.reason);
    adventure = basement.state;
  }
  if (scenario === 'basement-power-fault' || scenario === 'basement-control-reveal' || scenario === 'laboratory-boundary' || isLaboratoryScenario(scenario)) {
    adventure = markRoomInspected(adventure, 'basement', 'unstable-power-conduit');
    adventure = markRoomInteraction(adventure, 'basement', 'basement-fault-traced');
    adventure = setRoomSwitch(adventure, 'basement', 'basement-fault-traced', true);
    adventure = setRoomSwitch(adventure, 'basement', 'conduit-focused', false);
    adventure = setRoomSwitch(adventure, 'basement', 'relay-focused', scenario === 'basement-power-fault');
  }
  if (scenario === 'basement-control-reveal' || scenario === 'laboratory-boundary' || isLaboratoryScenario(scenario)) {
    adventure = markRoomInteraction(adventure, 'basement', 'basement-relay-stabilized');
    adventure = setRoomSwitch(adventure, 'basement', 'basement-power-stabilized', true);
    adventure = markRoomInspected(adventure, 'basement', 'resonance-control-terminal');
    adventure = markRoomInteraction(adventure, 'basement', 'basement-control-read');
    adventure = markRoomInteraction(adventure, 'basement', 'basement-electrical-hazard-armed');
    adventure = setRoomSwitch(adventure, 'basement', 'terminal-focused', scenario === 'basement-control-reveal');
    adventure = setRoomSwitch(adventure, 'basement', 'basement-control-revealed', true);
  }
  if (scenario === 'laboratory-boundary' || isLaboratoryScenario(scenario)) {
    adventure = markRoomInteraction(adventure, 'basement', 'basement-failsafe-attempted');
    adventure = setRoomSwitch(adventure, 'basement', 'basement-loss-of-control-revealed', true);
    adventure = markRoomInspected(adventure, 'basement', 'laboratory-feed-hatch');
    adventure = markRoomInteraction(adventure, 'basement', 'laboratory-route-traced');
    adventure = setRoomSwitch(adventure, 'basement', 'terminal-focused', false);
    adventure = setRoomSwitch(adventure, 'basement', 'laboratory-route-revealed', true);
  }

  if (isLaboratoryScenario(scenario)) {
    const laboratory = transitionAdventure(adventure, 'laboratory', 'laboratory-from-basement');
    if (laboratory.status !== 'ok') throw new Error(laboratory.reason);
    adventure = laboratory.state;

    if (scenario !== 'laboratory-arrival') {
      adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.started, true);
    }
    if (scenario === 'resonator-runaway' || scenario === 'vesper-nightmare' || scenario === 'resonator-shutdown' || isEndingScenario(scenario)) {
      adventure = setRoomSwitch(adventure, 'laboratory', VESPER_CONTROL_DEVICES.left.switchId, true);
      adventure = setRoomSwitch(adventure, 'laboratory', VESPER_CONTROL_DEVICES.right.switchId, true);
      adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.vesperControlBroken, true);
    }
    if (scenario === 'vesper-nightmare' || scenario === 'resonator-shutdown' || isEndingScenario(scenario)) {
      adventure = setRoomSwitch(adventure, 'laboratory', RESONATOR_WEAK_POINTS.left.switchId, true);
      adventure = setRoomSwitch(adventure, 'laboratory', RESONATOR_WEAK_POINTS.right.switchId, true);
      adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.resonatorDestabilized, true);
    }
    if (scenario === 'resonator-shutdown' || isEndingScenario(scenario)) {
      for (const switchId of VESPER_NIGHTMARE_HIT_SWITCHES) {
        adventure = setRoomSwitch(adventure, 'laboratory', switchId, true);
      }
      adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.nightmareDefeated, true);
      adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.complete, true);
    }
  }

  if (isEndingScenario(scenario)) {
    adventure = setRoomSwitch(adventure, 'bedroom', ADVENTURE_ENDING_SWITCHES.started, true);
    if (scenario === 'ending-evidence' || scenario === 'ending-ghost-sting' || scenario === 'ending-credits') {
      adventure = setRoomSwitch(adventure, 'bedroom', ADVENTURE_ENDING_SWITCHES.evidenceSeen, true);
    }
    if (scenario === 'ending-ghost-sting' || scenario === 'ending-credits') {
      adventure = setRoomSwitch(adventure, 'bedroom', ADVENTURE_ENDING_SWITCHES.ghostStingSeen, true);
    }
    if (scenario === 'ending-credits') {
      adventure = setRoomSwitch(adventure, 'bedroom', ADVENTURE_ENDING_SWITCHES.complete, true);
    }
    adventure = {
      ...adventure,
      currentRoom: 'bedroom',
      currentEntry: 'bedroom-default',
    };
  }
  return adventure;
}

function explorationScreenshotSession(scenario: AdventureScreenshotScenario): HauntedSessionState {
  const falseEscape = applyFalseEscape(explorationSeed(scenario), createAdventureState());
  const x = scenario === 'altered-bedroom'
    ? 24
    : scenario === 'hallway-arrival'
      ? 20
      : scenario === 'hallway-clock'
        ? 64
        : scenario === 'living-door'
          ? 110
          : scenario === 'living-room-arrival'
            ? 20
            : scenario === 'living-room-source-cue'
              ? 84
              : scenario === 'kitchen-arrival'
                ? 20
                : scenario === 'kitchen-overload'
                  ? 108
                  : scenario === 'kitchen-power-rerouted'
                    ? 116
                    : scenario === 'bathroom-arrival'
                      ? 20
                      : scenario === 'bathroom-mirror-mismatch'
                        ? 64
                        : scenario === 'bathroom-reflected-route'
                          ? 64
                          : scenario === 'bathroom-route-revealed'
                            ? 108
                            : scenario === 'attic-arrival'
                              ? 20
                              : scenario === 'attic-evidence'
                                ? 70
                                : scenario === 'attic-recording'
                                  ? 98
                                  : scenario === 'attic-basement-route'
                                    ? 117
                                    : scenario === 'basement-arrival'
                                      ? 24
                                      : scenario === 'basement-power-fault'
                                        ? 92
                                        : scenario === 'basement-control-reveal'
                                          ? 120
                                          : scenario === 'laboratory-boundary'
                                            ? 109
                                            : scenario === 'laboratory-arrival'
                                              ? 24
                                              : scenario === 'vesper-control'
                                                ? 90
                                                : scenario === 'resonator-runaway'
                                                  ? 40
                                                  : scenario === 'vesper-nightmare'
                                                    ? 90
                                                    : scenario === 'resonator-shutdown'
                                                      ? 70
                                                      : scenario === 'ending-awakening'
                                                        ? 16
                                                        : scenario === 'ending-evidence'
                                                          ? 56
                                                          : scenario === 'ending-ghost-sting'
                                                            ? 108
                                                            : scenario === 'ending-credits'
                                                              ? 108
                                                              : 99;
  const positioned = withPlayer(falseEscape.session, x);
  if (scenario === 'basement-control-reveal') return { ...positioned, elapsedMs: 1_000 };
  if (scenario === 'laboratory-boundary') return { ...positioned, elapsedMs: 1_720 };
  if (scenario === 'vesper-control') return { ...positioned, elapsedMs: 700 };
  if (scenario === 'resonator-runaway') return { ...positioned, elapsedMs: 2_400 };
  if (scenario === 'vesper-nightmare') return { ...positioned, elapsedMs: 600 };
  return positioned;
}

function explorationSeed(scenario: HauntedScreenshotScenario): HauntedSessionState {
  const base = awakeBase(scenario);
  return {
    ...base,
    domestic: preparedDomestic(base),
    objective: { phase: 'completed' },
    threats: { ...base.threats, ghosts: [], nextSpawnAtMs: FROZEN_SPAWN_MS },
  };
}

function isLivingOrDeeperScenario(scenario: AdventureScreenshotScenario): boolean {
  return scenario === 'living-room-arrival'
    || isTvOnScenario(scenario)
    || isKitchenOrDeeperScenario(scenario);
}

function isTvOnScenario(scenario: AdventureScreenshotScenario): boolean {
  return scenario === 'living-room-static'
    || isTransmissionScenario(scenario);
}

function isTransmissionScenario(scenario: AdventureScreenshotScenario): boolean {
  return scenario === 'living-room-transmission'
    || isSourceCueScenario(scenario);
}

function isSourceCueScenario(scenario: AdventureScreenshotScenario): boolean {
  return scenario === 'living-room-source-cue'
    || isKitchenOrDeeperScenario(scenario);
}

function isKitchenOrDeeperScenario(scenario: AdventureScreenshotScenario): boolean {
  return scenario === 'kitchen-arrival'
    || scenario === 'kitchen-overload'
    || scenario === 'kitchen-power-rerouted'
    || isBathroomOrDeeperScenario(scenario);
}

function isBathroomOrDeeperScenario(scenario: AdventureScreenshotScenario): boolean {
  return scenario === 'bathroom-arrival'
    || scenario === 'bathroom-mirror-mismatch'
    || scenario === 'bathroom-reflected-route'
    || scenario === 'bathroom-route-revealed'
    || isAtticOrDeeperScenario(scenario);
}

function isAtticOrDeeperScenario(scenario: AdventureScreenshotScenario): boolean {
  return scenario === 'attic-arrival'
    || scenario === 'attic-evidence'
    || scenario === 'attic-recording'
    || scenario === 'attic-basement-route'
    || isBasementScenario(scenario);
}

function isBasementScenario(scenario: AdventureScreenshotScenario): boolean {
  return scenario === 'basement-arrival'
    || scenario === 'basement-power-fault'
    || scenario === 'basement-control-reveal'
    || scenario === 'laboratory-boundary'
    || isLaboratoryScenario(scenario);
}

function isLaboratoryScenario(scenario: AdventureScreenshotScenario): boolean {
  return scenario === 'laboratory-arrival'
    || scenario === 'vesper-control'
    || scenario === 'resonator-runaway'
    || scenario === 'vesper-nightmare'
    || scenario === 'resonator-shutdown'
    || isEndingScenario(scenario);
}

function isEndingScenario(scenario: AdventureScreenshotScenario): boolean {
  return scenario === 'ending-awakening'
    || scenario === 'ending-evidence'
    || scenario === 'ending-ghost-sting'
    || scenario === 'ending-credits';
}

function isAdventureScenario(scenario: HauntedScreenshotScenario): scenario is AdventureScreenshotScenario {
  return scenario === 'altered-bedroom'
    || scenario === 'hallway-arrival'
    || scenario === 'hallway-clock'
    || scenario === 'living-door'
    || scenario === 'living-room-arrival'
    || scenario === 'living-room-static'
    || scenario === 'living-room-transmission'
    || scenario === 'living-room-source-cue'
    || scenario === 'kitchen-arrival'
    || scenario === 'kitchen-overload'
    || scenario === 'kitchen-power-rerouted'
    || scenario === 'bathroom-arrival'
    || scenario === 'bathroom-mirror-mismatch'
    || scenario === 'bathroom-reflected-route'
    || scenario === 'bathroom-route-revealed'
    || scenario === 'attic-arrival'
    || scenario === 'attic-evidence'
    || scenario === 'attic-recording'
    || scenario === 'attic-basement-route'
    || scenario === 'basement-arrival'
    || scenario === 'basement-power-fault'
    || scenario === 'basement-control-reveal'
    || scenario === 'laboratory-boundary'
    || scenario === 'laboratory-arrival'
    || scenario === 'vesper-control'
    || scenario === 'resonator-runaway'
    || scenario === 'vesper-nightmare'
    || scenario === 'resonator-shutdown'
    || scenario === 'ending-awakening'
    || scenario === 'ending-evidence'
    || scenario === 'ending-ghost-sting'
    || scenario === 'ending-credits';
}

function awakeBase(scenario: HauntedScreenshotScenario): HauntedSessionState {
  const base = createHauntedSession(`screenshot-${scenario}`);
  return {
    ...base,
    domestic: {
      ...base.domestic,
      wallyState: 'normal',
      energy: 62,
      objectStates: { ...base.domestic.objectStates, bed: 'used' },
      interactionCounts: { ...base.domestic.interactionCounts, bed: 1 },
    },
    threats: { ...base.threats, nextSpawnAtMs: FROZEN_SPAWN_MS },
  };
}

function withPlayer(session: HauntedSessionState, x: number): HauntedSessionState {
  return {
    ...session,
    player: { ...session.player, x, y: PLAYER_GROUND_Y, vx: 0, vy: 0, grounded: true, facing: 'right' },
    domestic: { ...session.domestic, player: { x: Math.round(x), facing: 'right' } },
  };
}

function withGhost(session: HauntedSessionState, item: HauntedGhostState): HauntedSessionState['threats'] {
  return { ...session.threats, ghosts: [item], nextEnemyId: 2, nextSpawnAtMs: FROZEN_SPAWN_MS };
}

function ghost(id: number, x: number, y: number, phase: HauntedGhostState['phase'], phaseUntilMs = 0): HauntedGhostState {
  return { id, x, y, phase, phaseUntilMs };
}

function preparedDomestic(session: HauntedSessionState): HauntedSessionState['domestic'] {
  return {
    ...session.domestic,
    flags: { ...session.domestic.flags, dressed: true },
    collected: ['keys'],
    objectStates: { ...session.domestic.objectStates, wardrobe: 'used', keys: 'collected' },
    interactionCounts: { ...session.domestic.interactionCounts, wardrobe: 1, keys: 1 },
  };
}