/**
 * One live, armed state per exploration room threat, plus each threat's own
 * hit test exactly as AdventureExplorationRuntime applies it. Shared by the
 * RoomThreatObservation consistency tests and the QA bot report.
 */
import { applyFalseEscape } from '../../src/game/adventure/AdventureExplorationRuntime';
import {
  createAdventureState,
  markRoomInspected,
  setRoomSwitch,
  type AdventureState,
  type RoomId,
} from '../../src/game/adventure/AdventureState';
import { armAtticCrates, ATTIC_CRATES, isPlayerHitByAtticCrate, resolveAtticCrates } from '../../src/game/adventure/AtticCrateHazard';
import {
  armBasementElectricalHazard,
  BASEMENT_ELECTRICAL_HAZARD,
  isInsideBasementElectricalHazard,
  resolveBasementElectricalHazard,
} from '../../src/game/adventure/BasementElectricalHazard';
import { isBathroomTwinActive, isPlayerTouchingBathroomTwin } from '../../src/game/adventure/BathroomTwinHazard';
import { armKitchenSurge, isPlayerHitByKitchenSurge, KITCHEN_SURGE, resolveKitchenSurge } from '../../src/game/adventure/KitchenSurgeHazard';
import { LABORATORY_ENCOUNTER_SWITCHES } from '../../src/game/adventure/LaboratoryEncounter';
import {
  isPlayerInsideResonatorElectricalPressure,
  RESONATOR_INSTABILITY_CYCLE_MS,
  resolveResonatorInstabilityState,
} from '../../src/game/adventure/LaboratoryResonatorInstability';
import { isPlayerInsideVesperPressure, resolveVesperControlState, VESPER_CONTROL_CYCLE_MS } from '../../src/game/adventure/LaboratoryVesperControl';
import {
  isPlayerInsideVesperNightmareAttack,
  resolveVesperNightmareState,
  VESPER_NIGHTMARE_CYCLE_MS,
} from '../../src/game/adventure/LaboratoryVesperNightmare';
import {
  armLivingRoomStatic,
  isPlayerHitByLivingRoomStatic,
  LIVING_ROOM_STATIC,
  resolveLivingRoomStatic,
} from '../../src/game/adventure/LivingRoomStaticHazard';
import {
  bedroomReaperCycle,
  bedroomReaperCycleMs,
  isPlayerHitByBedroomReaper,
  resolveBedroomReaper,
  type BedroomReaperState,
} from '../../src/game/adventure/BedroomReaperHazard';
import {
  isInsideObservedDanger,
  observeRoomThreats,
  TELEGRAPHED_THREAT_KINDS,
  type ThreatKind,
  type ThreatObservation,
} from '../../src/game/adventure/RoomThreatObservation';
import { createHauntedSession, type HauntedSessionState } from '../../src/game/haunted/HauntedSessionRuntime';
import { HAUNTED_PLAYER_BOUNDS } from '../../src/game/haunted/PlayerPhysics';

export const THREAT_SESSION: HauntedSessionState = (() => {
  const base = createHauntedSession('threat-observation');
  return applyFalseEscape({ ...base, objective: { phase: 'completed' } }, createAdventureState()).session;
})();

export function explorationIn(room: RoomId): AdventureState {
  const escaped = applyFalseEscape(THREAT_SESSION, createAdventureState()).adventure;
  return {
    ...escaped,
    currentRoom: room,
    currentEntry: `${room}-test`,
    visitedRooms: room === 'hallway' ? ['bedroom', 'hallway'] : ['bedroom', 'hallway', 'living-room', 'kitchen', 'bathroom', 'attic', 'basement', 'laboratory'],
  };
}

export function laboratoryIn(phase: 'vesper-control' | 'resonator' | 'nightmare'): AdventureState {
  let adventure = setRoomSwitch(explorationIn('laboratory'), 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.started, true);
  if (phase !== 'vesper-control') adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.vesperControlBroken, true);
  if (phase === 'nightmare') adventure = setRoomSwitch(adventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.resonatorDestabilized, true);
  return adventure;
}

/** The reaper carried in the session's threats: in the altered Bedroom, the current one standing at REAPER_X. */
const REAPER_X = 64;
function reaperAt(adventure: AdventureState, elapsedMs: number): BedroomReaperState | undefined {
  return adventure.currentRoom === 'bedroom' ? { cycle: bedroomReaperCycle(adventure, elapsedMs), x: REAPER_X, dispelled: false } : undefined;
}

export function observeAt(adventure: AdventureState, elapsedMs: number): ThreatObservation[] {
  const bedroomReaper = reaperAt(adventure, elapsedMs);
  const threats = bedroomReaper ? { ...THREAT_SESSION.threats, bedroomReaper } : THREAT_SESSION.threats;
  return observeRoomThreats({ ...THREAT_SESSION, elapsedMs, threats }, adventure);
}

export type ThreatScenario = {
  kind: ThreatKind;
  adventure: AdventureState;
  startMs: number;
  /** Long enough to show every distinct pattern of the threat. */
  cycleMs: number;
  /** The hazard's own hit test at `elapsedMs`, exactly as the exploration runtime applies it. */
  hit: (elapsedMs: number) => (x: number, grounded: boolean) => boolean;
};

const livingRoom = armLivingRoomStatic(setRoomSwitch(explorationIn('living-room'), 'living-room', 'tv-on', true), 1_000);
const kitchen = armKitchenSurge(setRoomSwitch(explorationIn('kitchen'), 'kitchen', 'circuit-overloaded', true), 1_000);
const attic = armAtticCrates(explorationIn('attic'), 1_000);
const basement = armBasementElectricalHazard(setRoomSwitch(explorationIn('basement'), 'basement', 'basement-control-revealed', true), 1_000);
const vesperControl = laboratoryIn('vesper-control');
const resonator = laboratoryIn('resonator');
const nightmare = laboratoryIn('nightmare');
const alteredBedroom = explorationIn('bedroom');
export const BATHROOM_TWIN_LIVE = setRoomSwitch(explorationIn('bathroom'), 'bathroom', 'bathroom-light-off', true);

export const THREAT_SCENARIOS: readonly ThreatScenario[] = [
  {
    kind: 'living-room-static',
    adventure: livingRoom.adventure,
    startMs: livingRoom.elapsedMs,
    cycleMs: LIVING_ROOM_STATIC.cycleMs,
    hit: t => { const wave = resolveLivingRoomStatic(livingRoom.adventure, t); return (x, grounded) => isPlayerHitByLivingRoomStatic({ x, grounded }, wave); },
  },
  {
    kind: 'kitchen-surge',
    adventure: kitchen.adventure,
    startMs: kitchen.elapsedMs,
    cycleMs: KITCHEN_SURGE.cycleMs,
    hit: t => { const surge = resolveKitchenSurge(kitchen.adventure, t); return (x, grounded) => isPlayerHitByKitchenSurge({ x, grounded }, surge); },
  },
  {
    kind: 'attic-crate',
    adventure: attic.adventure,
    startMs: attic.elapsedMs,
    // Drops rotate through 8 positions, 3 per cycle: 8 cycles show every drop at every slot.
    cycleMs: ATTIC_CRATES.cycleMs * 4,
    hit: t => { const crates = resolveAtticCrates(attic.adventure, t); return x => isPlayerHitByAtticCrate({ x }, crates); },
  },
  {
    kind: 'basement-discharge',
    adventure: basement.adventure,
    startMs: basement.elapsedMs,
    cycleMs: BASEMENT_ELECTRICAL_HAZARD.cycleMs,
    hit: t => {
      const hazard = resolveBasementElectricalHazard(basement.adventure, t);
      return x => basement.adventure.currentRoom === 'basement' && hazard.dangerous && isInsideBasementElectricalHazard(x);
    },
  },
  {
    kind: 'bathroom-twin',
    adventure: BATHROOM_TWIN_LIVE,
    startMs: 0,
    cycleMs: 1_000,
    hit: () => x => isBathroomTwinActive(BATHROOM_TWIN_LIVE) && isPlayerTouchingBathroomTwin(x),
  },
  {
    kind: 'vesper-pressure',
    adventure: vesperControl,
    startMs: 0,
    cycleMs: VESPER_CONTROL_CYCLE_MS,
    hit: t => { const pressure = resolveVesperControlState(vesperControl, t).pressure; return x => isPlayerInsideVesperPressure(x, pressure); },
  },
  {
    kind: 'resonator-electrical',
    adventure: resonator,
    startMs: 0,
    cycleMs: RESONATOR_INSTABILITY_CYCLE_MS,
    hit: t => { const electrical = resolveResonatorInstabilityState(resonator, t).electrical; return x => isPlayerInsideResonatorElectricalPressure(x, electrical); },
  },
  {
    kind: 'bedroom-reaper',
    adventure: alteredBedroom,
    startMs: 0,
    cycleMs: bedroomReaperCycleMs(alteredBedroom),
    hit: t => {
      const reaper = resolveBedroomReaper(alteredBedroom, t, reaperAt(alteredBedroom, t), REAPER_X);
      return (x, grounded) => isPlayerHitByBedroomReaper({ x, grounded }, reaper);
    },
  },
  {
    kind: 'nightmare-attack',
    adventure: nightmare,
    startMs: 0,
    cycleMs: VESPER_NIGHTMARE_CYCLE_MS,
    hit: t => { const state = resolveVesperNightmareState(nightmare, t); return x => isPlayerInsideVesperNightmareAttack(x, state); },
  },
];

export const THREAT_X_SAMPLES: readonly number[] = (() => {
  const samples: number[] = [];
  for (let x = HAUNTED_PLAYER_BOUNDS.minX - 2; x <= HAUNTED_PLAYER_BOUNDS.maxX + 2; x += 0.25) samples.push(x);
  return samples;
})();

export type WarningLead = { kind: ThreatKind; onsets: number; minLeadMs: number; unwarned: { x: number; t: number }[] };

/**
 * Walks a threat through two cycles in 1 ms steps and, for every floor point
 * that becomes dangerous, measures how long it had been inside a warning zone
 * of the same threat beforehand (0 onsets warned = unwarned danger).
 */
export function measureWarningLead(scenario: ThreatScenario, xSamples: readonly number[] = THREAT_X_SAMPLES.filter((_, index) => index % 2 === 0)): WarningLead {
  const warnedSince = new Map<number, number>();
  const wasDanger = new Set<number>();
  const unwarned: { x: number; t: number }[] = [];
  let minLeadMs = Number.POSITIVE_INFINITY;
  let onsets = 0;
  for (let t = scenario.startMs; t < scenario.startMs + 2 * scenario.cycleMs; t += 1) {
    const observations = observeAt(scenario.adventure, t);
    for (const x of xSamples) {
      const danger = isInsideObservedDanger(observations, x, true);
      if (danger && !wasDanger.has(x) && t > scenario.startMs) {
        onsets += 1;
        const since = warnedSince.get(x);
        if (since === undefined) {
          if (unwarned.length < 5) unwarned.push({ x, t });
          minLeadMs = 0;
        } else {
          minLeadMs = Math.min(minLeadMs, t - since);
        }
      }
      if (danger) wasDanger.add(x); else wasDanger.delete(x);
      const warned = observations.some(observation => observation.phase === 'warning' && x >= observation.minX && x <= observation.maxX);
      if (!warned) warnedSince.delete(x);
      else if (!warnedSince.has(x)) warnedSince.set(x, t);
    }
  }
  return { kind: scenario.kind, onsets, minLeadMs, unwarned };
}

export function isTelegraphed(kind: ThreatKind): boolean {
  return TELEGRAPHED_THREAT_KINDS.includes(kind);
}
