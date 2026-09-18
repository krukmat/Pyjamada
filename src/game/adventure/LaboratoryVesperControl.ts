import type { DreamSparkProjectile, HauntedCombatState } from '../haunted/HauntedCombat';
import { getRoomState, setRoomSwitch, type AdventureState } from './AdventureState';
import { getLaboratoryEncounterPhase, LABORATORY_ENCOUNTER_SWITCHES } from './LaboratoryEncounter';

export type VesperControlDeviceId = 'left' | 'right';
export type VesperControlDeviceState = 'sealed' | 'telegraph' | 'vulnerable' | 'disabled';
export type VesperPressureLane = 'left' | 'right';
export type VesperPressurePhase = 'idle' | 'telegraph' | 'active';

export type VesperControlDevice = {
  id: VesperControlDeviceId;
  x: number;
  y: number;
  switchId: string;
};

export type VesperPressureState = {
  phase: VesperPressurePhase;
  lane?: VesperPressureLane;
  minX?: number;
  maxX?: number;
};

export type VesperControlState = {
  active: boolean;
  cycleMs: number;
  devices: Record<VesperControlDeviceId, VesperControlDeviceState>;
  pressure: VesperPressureState;
};

export type VesperControlEvent =
  | { type: 'LABORATORY_CONTROL_DEVICE_BLOCKED'; deviceId: VesperControlDeviceId }
  | { type: 'LABORATORY_CONTROL_DEVICE_DISABLED'; deviceId: VesperControlDeviceId }
  | { type: 'LABORATORY_VESPER_CONTROL_BROKEN' };

export const VESPER_CONTROL_CYCLE_MS = 3_000;

export const VESPER_CONTROL_DEVICES: Readonly<Record<VesperControlDeviceId, VesperControlDevice>> = {
  left: {
    id: 'left',
    x: 52,
    y: 84,
    switchId: 'vesper-control-left-disabled',
  },
  right: {
    id: 'right',
    x: 108,
    y: 84,
    switchId: 'vesper-control-right-disabled',
  },
};

export const VESPER_PRESSURE_LANES: Readonly<Record<VesperPressureLane, { minX: number; maxX: number }>> = {
  left: { minX: 22, maxX: 58 },
  right: { minX: 86, maxX: 116 },
};

const DEVICE_HIT_RADIUS_X = 6;
const DEVICE_HIT_RADIUS_Y = 10;

export function resolveVesperControlState(adventure: AdventureState, elapsedMs: number): VesperControlState {
  const active = adventure.currentRoom === 'laboratory' && getLaboratoryEncounterPhase(adventure) === 'vesper-control';
  const cycleMs = positiveModulo(elapsedMs, VESPER_CONTROL_CYCLE_MS);
  if (!active) {
    return {
      active: false,
      cycleMs,
      devices: {
        left: isVesperControlDeviceDisabled(adventure, 'left') ? 'disabled' : 'sealed',
        right: isVesperControlDeviceDisabled(adventure, 'right') ? 'disabled' : 'sealed',
      },
      pressure: { phase: 'idle' },
    };
  }

  return {
    active: true,
    cycleMs,
    devices: {
      left: resolveDeviceState(adventure, 'left', cycleMs),
      right: resolveDeviceState(adventure, 'right', cycleMs),
    },
    pressure: resolvePressureState(cycleMs),
  };
}

export function isVesperControlDeviceDisabled(adventure: AdventureState, deviceId: VesperControlDeviceId): boolean {
  return getRoomState(adventure, 'laboratory').switches[VESPER_CONTROL_DEVICES[deviceId].switchId] === true;
}

export function isPlayerInsideVesperPressure(playerX: number, pressure: VesperPressureState): boolean {
  return pressure.phase === 'active'
    && pressure.minX !== undefined
    && pressure.maxX !== undefined
    && playerX >= pressure.minX
    && playerX <= pressure.maxX;
}

export function resolveVesperControlProjectileHits(
  adventure: AdventureState,
  combat: HauntedCombatState,
  elapsedMs: number,
): { adventure: AdventureState; combat: HauntedCombatState; events: VesperControlEvent[] } {
  if (adventure.currentRoom !== 'laboratory' || getLaboratoryEncounterPhase(adventure) !== 'vesper-control') {
    return { adventure, combat, events: [] };
  }

  let nextAdventure = adventure;
  const events: VesperControlEvent[] = [];
  const remaining: DreamSparkProjectile[] = [];

  for (const projectile of combat.projectiles) {
    const hitDevice = findProjectileDeviceHit(nextAdventure, projectile);
    if (!hitDevice) {
      remaining.push(projectile);
      continue;
    }

    const state = resolveVesperControlState(nextAdventure, elapsedMs).devices[hitDevice.id];
    if (state !== 'vulnerable') {
      events.push({ type: 'LABORATORY_CONTROL_DEVICE_BLOCKED', deviceId: hitDevice.id });
      continue;
    }

    nextAdventure = setRoomSwitch(nextAdventure, 'laboratory', hitDevice.switchId, true);
    events.push({ type: 'LABORATORY_CONTROL_DEVICE_DISABLED', deviceId: hitDevice.id });
  }

  const bothDisabled = isVesperControlDeviceDisabled(nextAdventure, 'left')
    && isVesperControlDeviceDisabled(nextAdventure, 'right');
  if (bothDisabled && getRoomState(nextAdventure, 'laboratory').switches[LABORATORY_ENCOUNTER_SWITCHES.vesperControlBroken] !== true) {
    nextAdventure = setRoomSwitch(nextAdventure, 'laboratory', LABORATORY_ENCOUNTER_SWITCHES.vesperControlBroken, true);
    events.push({ type: 'LABORATORY_VESPER_CONTROL_BROKEN' });
  }

  const projectiles = bothDisabled ? [] : remaining;
  const nextCombat = projectiles.length === combat.projectiles.length
    && projectiles.every((projectile, index) => projectile === combat.projectiles[index])
    ? combat
    : { ...combat, projectiles };

  return { adventure: nextAdventure, combat: nextCombat, events };
}

function findProjectileDeviceHit(
  adventure: AdventureState,
  projectile: DreamSparkProjectile,
): VesperControlDevice | undefined {
  return (Object.values(VESPER_CONTROL_DEVICES) as VesperControlDevice[])
    .filter(device => !isVesperControlDeviceDisabled(adventure, device.id))
    .filter(device => Math.abs(projectile.x - device.x) <= DEVICE_HIT_RADIUS_X)
    .filter(device => Math.abs(projectile.y - device.y) <= DEVICE_HIT_RADIUS_Y)
    .sort((a, b) => Math.abs(projectile.x - a.x) - Math.abs(projectile.x - b.x))[0];
}

function resolveDeviceState(
  adventure: AdventureState,
  deviceId: VesperControlDeviceId,
  cycleMs: number,
): VesperControlDeviceState {
  if (isVesperControlDeviceDisabled(adventure, deviceId)) return 'disabled';

  if (deviceId === 'right') {
    if (cycleMs < 300) return 'telegraph';
    if (cycleMs < 1_050) return 'vulnerable';
    return 'sealed';
  }

  if (cycleMs >= 1_500 && cycleMs < 1_800) return 'telegraph';
  if (cycleMs >= 1_800 && cycleMs < 2_550) return 'vulnerable';
  return 'sealed';
}

function resolvePressureState(cycleMs: number): VesperPressureState {
  if (cycleMs < 600) {
    return { phase: 'telegraph', lane: 'left', ...VESPER_PRESSURE_LANES.left };
  }
  if (cycleMs < 1_050) {
    return { phase: 'active', lane: 'left', ...VESPER_PRESSURE_LANES.left };
  }
  if (cycleMs < 1_500) return { phase: 'idle' };
  if (cycleMs < 2_100) {
    return { phase: 'telegraph', lane: 'right', ...VESPER_PRESSURE_LANES.right };
  }
  if (cycleMs < 2_550) {
    return { phase: 'active', lane: 'right', ...VESPER_PRESSURE_LANES.right };
  }
  return { phase: 'idle' };
}

function positiveModulo(value: number, modulo: number): number {
  return ((value % modulo) + modulo) % modulo;
}
