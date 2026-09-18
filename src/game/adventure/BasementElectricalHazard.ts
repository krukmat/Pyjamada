import {
  getRoomState,
  markRoomInteraction,
  type AdventureState,
} from './AdventureState';

export type BasementElectricalHazardPhase =
  | 'inactive'
  | 'safe'
  | 'telegraph'
  | 'discharge'
  | 'recovery';

export type BasementElectricalHazardSnapshot = {
  phase: BasementElectricalHazardPhase;
  dangerous: boolean;
  cycleElapsedMs: number;
  responseWindowMs: number;
};

/**
 * W5-T5 is deliberately Basement-specific. This is not a reusable hazard engine:
 * one overloaded resonance feed, one fixed danger lane, one deterministic cycle.
 */
export const BASEMENT_ELECTRICAL_HAZARD = {
  cycleMs: 4_000,
  safeLeadMs: 400,
  telegraphMs: 1_200,
  dischargeMs: 360,
  zoneMinX: 100,
  zoneMaxX: 116,
} as const;

const ARMED_INTERACTION = 'basement-electrical-hazard-armed';

export function isBasementElectricalHazardArmed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'basement').interactions.includes(ARMED_INTERACTION);
}

export function armBasementElectricalHazard(
  adventure: AdventureState,
  elapsedMs: number,
): { adventure: AdventureState; elapsedMs: number; armedNow: boolean } {
  if (adventure.currentRoom !== 'basement') {
    return { adventure, elapsedMs, armedNow: false };
  }

  const basement = getRoomState(adventure, 'basement');
  if (basement.switches['basement-control-revealed'] !== true || isBasementElectricalHazardArmed(adventure)) {
    return { adventure, elapsedMs, armedNow: false };
  }

  // Align the first cycle to a known safe boundary so reading the terminal can
  // never produce an immediate, untelegraphed hit.
  const cycle = BASEMENT_ELECTRICAL_HAZARD.cycleMs;
  const alignedElapsedMs = Math.ceil(Math.max(0, elapsedMs) / cycle) * cycle;
  return {
    adventure: markRoomInteraction(adventure, 'basement', ARMED_INTERACTION),
    elapsedMs: alignedElapsedMs,
    armedNow: true,
  };
}

export function resolveBasementElectricalHazard(
  adventure: AdventureState,
  elapsedMs: number,
): BasementElectricalHazardSnapshot {
  if (
    adventure.currentRoom !== 'basement'
    || getRoomState(adventure, 'basement').switches['basement-control-revealed'] !== true
    || !isBasementElectricalHazardArmed(adventure)
  ) {
    return { phase: 'inactive', dangerous: false, cycleElapsedMs: 0, responseWindowMs: 0 };
  }

  const rules = BASEMENT_ELECTRICAL_HAZARD;
  const cycleElapsedMs = positiveModulo(elapsedMs, rules.cycleMs);
  const telegraphStartMs = rules.safeLeadMs;
  const dischargeStartMs = telegraphStartMs + rules.telegraphMs;
  const dischargeEndMs = dischargeStartMs + rules.dischargeMs;

  if (cycleElapsedMs < telegraphStartMs) {
    return { phase: 'safe', dangerous: false, cycleElapsedMs, responseWindowMs: dischargeStartMs - cycleElapsedMs };
  }
  if (cycleElapsedMs < dischargeStartMs) {
    return { phase: 'telegraph', dangerous: false, cycleElapsedMs, responseWindowMs: dischargeStartMs - cycleElapsedMs };
  }
  if (cycleElapsedMs < dischargeEndMs) {
    return { phase: 'discharge', dangerous: true, cycleElapsedMs, responseWindowMs: 0 };
  }
  return { phase: 'recovery', dangerous: false, cycleElapsedMs, responseWindowMs: 0 };
}

export function isInsideBasementElectricalHazard(playerX: number): boolean {
  return playerX >= BASEMENT_ELECTRICAL_HAZARD.zoneMinX
    && playerX <= BASEMENT_ELECTRICAL_HAZARD.zoneMaxX;
}

function positiveModulo(value: number, modulus: number): number {
  const remainder = value % modulus;
  return remainder < 0 ? remainder + modulus : remainder;
}
