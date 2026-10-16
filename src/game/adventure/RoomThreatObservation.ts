import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import type { AdventureState } from './AdventureState';
import { difficultyProfile } from './AdventureDifficulty';
import { isAdventureExplorationActive } from './AdventureExplorationRuntime';
import { ATTIC_CRATES, resolveAtticCrates } from './AtticCrateHazard';
import { BASEMENT_ELECTRICAL_HAZARD, resolveBasementElectricalHazard } from './BasementElectricalHazard';
import { BATHROOM_TWIN, isBathroomTwinActive } from './BathroomTwinHazard';
import type { FloorWaveConfig } from './FloorWaveHazard';
import { KITCHEN_SURGE, resolveKitchenSurge } from './KitchenSurgeHazard';
import { resolveResonatorInstabilityState } from './LaboratoryResonatorInstability';
import { resolveVesperControlState } from './LaboratoryVesperControl';
import { resolveVesperNightmareState } from './LaboratoryVesperNightmare';
import { LIVING_ROOM_STATIC, resolveLivingRoomStatic } from './LivingRoomStaticHazard';
import { CUCKOO_FLIGHT, LOCKED_AIM, ROACH_CHARGE, resolveRoomBoss, roachChargeMs } from './RoomBossHazard';

/** How much of the Roach's opening charge its twitch marks as a jump zone. */
const ROACH_TWITCH_LANE_MS = 400;

export type ThreatPhase = 'warning' | 'danger';

export type ThreatKind =
  | 'living-room-static'
  | 'kitchen-surge'
  | 'attic-crate'
  | 'basement-discharge'
  | 'bathroom-twin'
  | 'room-boss'
  | 'vesper-pressure'
  | 'resonator-electrical'
  | 'nightmare-attack';

/**
 * One floor zone of a live room threat, as the player can see it right now.
 *
 * - `danger`: Wally standing anywhere in `minX..maxX` (inclusive) is hit by
 *   the threat's own hit test at this instant; when `jumpable` is true only a
 *   grounded Wally is hit.
 * - `warning`: the zone is telegraphed and will (or may) become dangerous; it
 *   never hits on its own.
 *
 * Every zone is derived from the hazards' resolve and snapshot functions and hit
 * widths, never from a parallel timing model, so a renderer drawing these
 * zones and a QA bot reacting to them both see exactly what the rules do.
 */
export type ThreatObservation = {
  kind: ThreatKind;
  phase: ThreatPhase;
  minX: number;
  maxX: number;
  jumpable: boolean;
};

/** Threat kinds whose dangers are always announced by a warning on the same floor zone first. */
export const TELEGRAPHED_THREAT_KINDS: readonly ThreatKind[] = [
  'living-room-static',
  'kitchen-surge',
  'attic-crate',
  'basement-discharge',
  'vesper-pressure',
  'resonator-electrical',
  'nightmare-attack',
];

/** Pure read of the live exploration hazards in the current room; empty in the haunted bedroom run. */
export function observeRoomThreats(session: HauntedSessionState, adventure: AdventureState): ThreatObservation[] {
  if (!isAdventureExplorationActive(adventure)) return [];
  const elapsedMs = session.elapsedMs;
  const observations: ThreatObservation[] = [];
  const push = (kind: ThreatKind, phase: ThreatPhase, minX: number, maxX: number, jumpable = false) => {
    observations.push({ kind, phase, minX, maxX, jumpable });
  };

  // A room boss touches Wally within contactHalfWidth of its body; the Roach
  // only reaches a grounded Wally. The Wraith's faint telegraph is a warning.
  const boss = resolveRoomBoss(adventure, session.elapsedMs, session.player.x, session.threats.roomBossChase);
  if (boss) {
    const reach = boss.config.contactHalfWidth;
    if (boss.config.kind === 'roach' && boss.pose === 'telegraph') {
      // The twitch announces the charge: the stretch it covers in its first
      // moments is already worth jumping, as a player near that wall would.
      const lane = (ROACH_CHARGE.rightX - ROACH_CHARGE.leftX) * Math.min(1, ROACH_TWITCH_LANE_MS / roachChargeMs(boss.hits, difficultyProfile(adventure).rush));
      const minX = boss.facing > 0 ? boss.x - reach : boss.x - reach - lane;
      const maxX = boss.facing > 0 ? boss.x + reach + lane : boss.x + reach;
      push('room-boss', 'danger', minX, maxX, true);
    } else if (boss.dangerous) push('room-boss', 'danger', boss.x - reach, boss.x + reach, boss.config.kind === 'roach');
    else push('room-boss', 'warning', boss.x - reach, boss.x + reach);
    // A Cuckoo with a locked aim marks its landing spot (and the low end of its dive) from the call on.
    if (boss.config.kind === 'cuckoo' && boss.aimX !== undefined && (boss.pose === 'telegraph' || boss.pose === 'dive')) {
      const tail = (CUCKOO_FLIGHT.clockX - boss.aimX) * (LOCKED_AIM.landReachLift / CUCKOO_FLIGHT.doorLift);
      push('room-boss', 'warning', Math.min(boss.aimX, boss.aimX + tail) - reach, Math.max(boss.aimX, boss.aimX + tail) + reach);
    }
  }

  switch (adventure.currentRoom) {
    case 'living-room': {
      const wave = resolveLivingRoomStatic(adventure, elapsedMs);
      observeFloorWave(push, 'living-room-static', LIVING_ROOM_STATIC, wave.phase === 'telegraph' || wave.phase === 'wave', wave.dangerous ? wave.fronts : []);
      break;
    }
    case 'kitchen': {
      const surge = resolveKitchenSurge(adventure, elapsedMs);
      const fronts = surge.dangerous && surge.frontX !== undefined ? [surge.frontX] : [];
      observeFloorWave(push, 'kitchen-surge', KITCHEN_SURGE, surge.phase === 'telegraph' || surge.phase === 'surge', fronts);
      break;
    }
    case 'attic': {
      const { halfWidth } = ATTIC_CRATES;
      for (const drop of resolveAtticCrates(adventure, elapsedMs).drops) {
        if (drop.dangerous) push('attic-crate', 'danger', drop.x - halfWidth, drop.x + halfWidth);
        else if (drop.stage === 'shadow' || drop.stage === 'falling') push('attic-crate', 'warning', drop.x - halfWidth, drop.x + halfWidth);
      }
      break;
    }
    case 'basement': {
      const hazard = resolveBasementElectricalHazard(adventure, elapsedMs);
      const { zoneMinX, zoneMaxX } = BASEMENT_ELECTRICAL_HAZARD;
      if (hazard.dangerous) push('basement-discharge', 'danger', zoneMinX, zoneMaxX);
      else if (hazard.phase === 'telegraph') push('basement-discharge', 'warning', zoneMinX, zoneMaxX);
      break;
    }
    case 'bathroom': {
      // The reflection stands at 2 * mirrorX - x, so it touches Wally exactly
      // when |x - mirrorX| <= contactHalfWidth / 2. It has no telegraph: the
      // zone is dangerous for as long as the reflection is out.
      if (isBathroomTwinActive(adventure)) {
        const reach = BATHROOM_TWIN.contactHalfWidth / 2;
        push('bathroom-twin', 'danger', BATHROOM_TWIN.mirrorX - reach, BATHROOM_TWIN.mirrorX + reach);
      }
      break;
    }
    case 'laboratory': {
      const pressure = resolveVesperControlState(adventure, elapsedMs).pressure;
      observeLane(push, 'vesper-pressure', pressure.phase, pressure.minX, pressure.maxX);
      const electrical = resolveResonatorInstabilityState(adventure, elapsedMs).electrical;
      observeLane(push, 'resonator-electrical', electrical.phase, electrical.minX, electrical.maxX);
      const nightmare = resolveVesperNightmareState(adventure, elapsedMs);
      if (nightmare.active) observeLane(push, 'nightmare-attack', nightmare.phase, nightmare.minX, nightmare.maxX);
      break;
    }
    default:
      break;
  }
  return observations;
}

/** True when an observed danger zone would hit a Wally standing at `x` (respecting jumpable zones). */
export function isInsideObservedDanger(
  observations: readonly ThreatObservation[],
  x: number,
  grounded: boolean,
  kind?: ThreatKind,
): boolean {
  return observations.some(observation =>
    observation.phase === 'danger'
    && (kind === undefined || observation.kind === kind)
    && x >= observation.minX
    && x <= observation.maxX
    && (!observation.jumpable || grounded));
}

type Push = (kind: ThreatKind, phase: ThreatPhase, minX: number, maxX: number, jumpable?: boolean) => void;

function observeFloorWave(push: Push, kind: ThreatKind, config: FloorWaveConfig, live: boolean, fronts: readonly number[]) {
  if (!live) return;
  // From the telegraph until the last wave dies the whole path is charged.
  const pathMin = Math.min(config.sourceX, config.targetX) - config.halfWidth;
  const pathMax = Math.max(config.sourceX, config.targetX) + config.halfWidth;
  push(kind, 'warning', pathMin, pathMax, true);
  for (const front of fronts) push(kind, 'danger', front - config.halfWidth, front + config.halfWidth, true);
}

function observeLane(push: Push, kind: ThreatKind, phase: string, minX: number | undefined, maxX: number | undefined) {
  if (minX === undefined || maxX === undefined) return;
  if (phase === 'active') push(kind, 'danger', minX, maxX);
  else if (phase === 'telegraph') push(kind, 'warning', minX, maxX);
}
