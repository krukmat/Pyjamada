import {
  applyHauntedPlayerHit,
  stepDreamSparks,
  tryFireDreamSpark,
} from '../haunted/HauntedCombat';
import { consumeTransientActions, createHauntedInputState } from '../haunted/HauntedInput';
import {
  applyResonatorDistortionInput,
  isPlayerInsideResonatorElectricalPressure,
  resolveResonatorInstabilityState,
  resolveResonatorProjectileHits,
  type ResonatorWeakPointId,
} from './LaboratoryResonatorInstability';
import type { HauntedSessionState } from '../haunted/HauntedSessionRuntime';
import {
  isPlayerInsideVesperNightmareAttack,
  resolveVesperNightmareProjectileHits,
  resolveVesperNightmareState,
  VESPER_NIGHTMARE_STRIKE_EXTRA_DAMAGE,
} from './LaboratoryVesperNightmare';
import { applyHauntedKnockback, stepHauntedPlayerPhysics } from '../haunted/PlayerPhysics';
import { getLaboratoryEncounterPhase } from './LaboratoryEncounter';
import {
  getRoomState,
  markRoomInteraction,
  setStoryFlag,
  type AdventureState,
  type RoomId,
} from './AdventureState';
import {
  isPlayerInsideVesperPressure,
  resolveVesperControlProjectileHits,
  resolveVesperControlState,
  type VesperControlDeviceId,
} from './LaboratoryVesperControl';
import {
  armBasementElectricalHazard,
  isInsideBasementElectricalHazard,
  resolveBasementElectricalHazard,
} from './BasementElectricalHazard';
import {
  armKitchenSurge,
  isKitchenSurgeLive,
  isPlayerHitByKitchenSurge,
  resolveKitchenSurge,
} from './KitchenSurgeHazard';
import {
  armLivingRoomStatic,
  isLivingRoomStaticLive,
  isPlayerHitByLivingRoomStatic,
  resolveLivingRoomStatic,
} from './LivingRoomStaticHazard';
import {
  armAtticCrates,
  isAtticCratesLive,
  isPlayerHitByAtticCrate,
  resolveAtticCrates,
} from './AtticCrateHazard';
import {
  bathroomTwinX,
  isBathroomTwinActive,
  isPlayerTouchingBathroomTwin,
  resolveBathroomTwinSparks,
} from './BathroomTwinHazard';
import {
  activeRoomBoss,
  armRoomBoss,
  isPlayerTouchingRoomBoss,
  lockRoomBossAim,
  resolveRoomBoss,
  resolveRoomBossSparks,
  type RoomBossRoom,
} from './RoomBossHazard';
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
  | { type: 'BASEMENT_DISCHARGE_HIT' }
  | { type: 'KITCHEN_SURGE_HIT' }
  | { type: 'LIVING_ROOM_STATIC_HIT' }
  | { type: 'ATTIC_CRATE_HIT' }
  | { type: 'BATHROOM_TWIN_HIT' }
  | { type: 'BATHROOM_TWIN_DISPELLED' }
  | { type: 'BATHROOM_TWIN_CONTACT_HIT' }
  | { type: 'ROOM_BOSS_HIT'; room: RoomBossRoom }
  | { type: 'ROOM_BOSS_DISPELLED'; room: RoomBossRoom }
  | { type: 'ROOM_BOSS_REPELLED'; room: RoomBossRoom }
  | { type: 'ROOM_BOSS_CONTACT_HIT'; room: RoomBossRoom }
  | { type: 'LABORATORY_CONTROL_DEVICE_BLOCKED'; deviceId: VesperControlDeviceId }
  | { type: 'LABORATORY_CONTROL_DEVICE_DISABLED'; deviceId: VesperControlDeviceId }
  | { type: 'LABORATORY_VESPER_CONTROL_BROKEN' }
  | { type: 'LABORATORY_VESPER_PULSE_HIT' }
  | { type: 'LABORATORY_RESONATOR_NODE_BLOCKED'; nodeId: ResonatorWeakPointId }
  | { type: 'LABORATORY_RESONATOR_NODE_DISABLED'; nodeId: ResonatorWeakPointId }
  | { type: 'LABORATORY_RESONATOR_DESTABILIZED' }
  | { type: 'LABORATORY_RESONATOR_SURGE_HIT' }
  | { type: 'LABORATORY_NIGHTMARE_HIT_BLOCKED' }
  | { type: 'LABORATORY_NIGHTMARE_HIT_ACCEPTED'; hit: 1 | 2 | 3 }
  | { type: 'LABORATORY_VESPER_NIGHTMARE_DEFEATED' }
  | { type: 'LABORATORY_NIGHTMARE_ATTACK_HIT' }
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

/** Entering a room for the first time restores one heart, capped at max HP. */
export function applyFirstVisitRecovery(
  session: HauntedSessionState,
  adventureBeforeTransition: AdventureState,
  targetRoom: RoomId,
): HauntedSessionState {
  if (adventureBeforeTransition.visitedRooms.includes(targetRoom)) return session;
  const hp = Math.min(session.combat.maxHp, session.combat.hp + 1);
  return hp === session.combat.hp ? session : { ...session, combat: { ...session.combat, hp } };
}

/** Dream Sparks are available in exploration during the Laboratory fight, against the Bathroom reflection and room bosses. */
export function isExplorationCombatEnabled(adventure: AdventureState): boolean {
  return isLaboratoryCombatEnabled(adventure) || isBathroomTwinActive(adventure) || activeRoomBoss(adventure) !== undefined;
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

export function isBasementFaultTraced(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'basement').switches['basement-fault-traced'] === true;
}

export function isBasementPowerStabilized(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'basement').switches['basement-power-stabilized'] === true;
}

export function isBasementRelayProbed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'basement').interactions.includes('basement-relay-probed');
}

export function isBasementControlRevealed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'basement').switches['basement-control-revealed'] === true;
}

export function isBasementLossOfControlRevealed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'basement').switches['basement-loss-of-control-revealed'] === true;
}

export function isBasementLaboratoryRouteRevealed(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'basement').switches['laboratory-route-revealed'] === true;
}

export function isBasementTerminalFocused(adventure: AdventureState): boolean {
  return getRoomState(adventure, 'basement').switches['terminal-focused'] === true;
}

export function isLaboratoryCombatEnabled(adventure: AdventureState): boolean {
  return isAdventureExplorationActive(adventure)
    && adventure.currentRoom === 'laboratory'
    && getLaboratoryEncounterPhase(adventure) !== 'complete';
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

  const dtMs = Math.max(0, deltaMs);
  let elapsedMs = session.elapsedMs;
  let nextAdventure = adventure;

  // Exploration otherwise keeps the bedroom deadline frozen. Basement advances
  // only for its electrical cycle; Laboratory advances the combat clock required
  // by Dream Spark cooldowns without reactivating domestic deadline/noise rules.
  const laboratoryCombat = isLaboratoryCombatEnabled(adventure);
  const twinCombat = isBathroomTwinActive(adventure);
  const bossCombat = activeRoomBoss(adventure) !== undefined;
  const combatEnabled = laboratoryCombat || twinCombat || bossCombat;
  let clockAdvanced = false;
  if (bossCombat) {
    elapsedMs += dtMs;
    const armed = armRoomBoss(nextAdventure, elapsedMs);
    nextAdventure = armed.adventure;
    elapsedMs = armed.elapsedMs;
  } else if (adventure.currentRoom === 'basement' && isBasementControlRevealed(adventure)) {
    elapsedMs += dtMs;
    const armed = armBasementElectricalHazard(nextAdventure, elapsedMs);
    nextAdventure = armed.adventure;
    elapsedMs = armed.elapsedMs;
  } else if (adventure.currentRoom === 'kitchen' && isKitchenSurgeLive(adventure)) {
    elapsedMs += dtMs;
    const armed = armKitchenSurge(nextAdventure, elapsedMs);
    nextAdventure = armed.adventure;
    elapsedMs = armed.elapsedMs;
  } else if (adventure.currentRoom === 'living-room' && isLivingRoomStaticLive(adventure)) {
    elapsedMs += dtMs;
    const armed = armLivingRoomStatic(nextAdventure, elapsedMs);
    nextAdventure = armed.adventure;
    elapsedMs = armed.elapsedMs;
  } else if (adventure.currentRoom === 'attic' && isAtticCratesLive(adventure)) {
    elapsedMs += dtMs;
    const armed = armAtticCrates(nextAdventure, elapsedMs);
    nextAdventure = armed.adventure;
    elapsedMs = armed.elapsedMs;
  } else if (combatEnabled) {
    elapsedMs += dtMs;
  }
  clockAdvanced = elapsedMs !== session.elapsedMs;

  const resonatorBeforeMove = resolveResonatorInstabilityState(nextAdventure, elapsedMs);
  const movementInput = applyResonatorDistortionInput(
    session.input,
    session.player.x,
    resonatorBeforeMove.distortion,
  );
  let player = stepHauntedPlayerPhysics(session.player, movementInput, dtMs / 1000);
  let combat = combatEnabled
    ? stepDreamSparks(session.combat, dtMs / 1000)
    : session.combat.projectiles.length > 0
      ? { ...session.combat, projectiles: [] }
      : session.combat;
  let objective = session.objective;
  const events: AdventureExplorationEvent[] = [];

  if (combatEnabled && session.input.attackPressed) {
    combat = tryFireDreamSpark(combat, player, elapsedMs).combat;
  }

  const controlHits = resolveVesperControlProjectileHits(nextAdventure, combat, elapsedMs);
  nextAdventure = controlHits.adventure;
  combat = controlHits.combat;
  events.push(...controlHits.events);
  if (controlHits.events.some(event => event.type === 'LABORATORY_VESPER_CONTROL_BROKEN')) {
    combat = {
      ...combat,
      projectiles: [],
      nextAttackAllowedMs: elapsedMs,
      invulnerableUntilMs: Math.max(combat.invulnerableUntilMs, elapsedMs + 600),
    };
  }

  const resonatorHits = resolveResonatorProjectileHits(nextAdventure, combat, elapsedMs);
  nextAdventure = resonatorHits.adventure;
  combat = resonatorHits.combat;
  events.push(...resonatorHits.events);
  if (resonatorHits.events.some(event => event.type === 'LABORATORY_RESONATOR_DESTABILIZED')) {
    combat = {
      ...combat,
      projectiles: [],
      nextAttackAllowedMs: elapsedMs,
      invulnerableUntilMs: Math.max(combat.invulnerableUntilMs, elapsedMs + 600),
    };
  }

  const nightmareHits = resolveVesperNightmareProjectileHits(nextAdventure, combat, elapsedMs);
  nextAdventure = nightmareHits.adventure;
  combat = nightmareHits.combat;
  events.push(...nightmareHits.events);
  if (nightmareHits.events.some(event => event.type === 'LABORATORY_VESPER_NIGHTMARE_DEFEATED')) {
    combat = {
      ...combat,
      projectiles: [],
      nextAttackAllowedMs: elapsedMs,
      invulnerableUntilMs: Math.max(combat.invulnerableUntilMs, elapsedMs + 600),
    };
  }

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
      if (effect.events.some(event => event.type === 'LABORATORY_ENCOUNTER_STARTED')) {
        combat = {
          ...combat,
          projectiles: [],
          nextAttackAllowedMs: elapsedMs,
          invulnerableUntilMs: Math.max(combat.invulnerableUntilMs, elapsedMs + 600),
        };
      }
      if (effect.events.some(event => event.type === 'LABORATORY_ENCOUNTER_COMPLETED')) {
        combat = {
          ...combat,
          projectiles: [],
          nextAttackAllowedMs: elapsedMs,
          invulnerableUntilMs: 0,
        };
      }
    }
  }

  const nightmare = resolveVesperNightmareState(nextAdventure, elapsedMs);
  if (isPlayerInsideVesperNightmareAttack(player.x, nightmare) && objective.phase !== 'failed') {
    const hit = applyHauntedPlayerHit(combat, elapsedMs);
    combat = hit.combat;
    if (hit.accepted) {
      // The final nightmare hits hard: each strike costs an extra heart.
      combat = { ...combat, hp: Math.max(0, combat.hp - VESPER_NIGHTMARE_STRIKE_EXTRA_DAMAGE) };
      const attackCenter = ((nightmare.minX ?? player.x) + (nightmare.maxX ?? player.x)) / 2;
      player = applyHauntedKnockback(player, player.x <= attackCenter ? 1 : -1);
      events.push({ type: 'LABORATORY_NIGHTMARE_ATTACK_HIT' });
      if (combat.hp <= 0) objective = { phase: 'failed', reason: 'haunted' };
    }
  }

  const resonatorElectrical = resolveResonatorInstabilityState(nextAdventure, elapsedMs).electrical;
  if (isPlayerInsideResonatorElectricalPressure(player.x, resonatorElectrical) && objective.phase !== 'failed') {
    const hit = applyHauntedPlayerHit(combat, elapsedMs);
    combat = hit.combat;
    if (hit.accepted) {
      const laneCenter = ((resonatorElectrical.minX ?? player.x) + (resonatorElectrical.maxX ?? player.x)) / 2;
      player = applyHauntedKnockback(player, player.x <= laneCenter ? 1 : -1);
      events.push({ type: 'LABORATORY_RESONATOR_SURGE_HIT' });
      if (combat.hp <= 0) objective = { phase: 'failed', reason: 'haunted' };
    }
  }

  const vesperPressure = resolveVesperControlState(nextAdventure, elapsedMs).pressure;
  if (isPlayerInsideVesperPressure(player.x, vesperPressure) && objective.phase !== 'failed') {
    const hit = applyHauntedPlayerHit(combat, elapsedMs);
    combat = hit.combat;
    if (hit.accepted) {
      const laneCenter = ((vesperPressure.minX ?? player.x) + (vesperPressure.maxX ?? player.x)) / 2;
      player = applyHauntedKnockback(player, player.x <= laneCenter ? 1 : -1);
      events.push({ type: 'LABORATORY_VESPER_PULSE_HIT' });
      if (combat.hp <= 0) objective = { phase: 'failed', reason: 'haunted' };
    }
  }

  const hazard = resolveBasementElectricalHazard(nextAdventure, elapsedMs);
  if (adventure.currentRoom === 'basement' && hazard.dangerous && isInsideBasementElectricalHazard(player.x) && objective.phase !== 'failed') {
    const hit = applyHauntedPlayerHit(combat, elapsedMs);
    combat = hit.combat;
    if (hit.accepted) {
      player = applyHauntedKnockback(player, -1);
      events.push({ type: 'BASEMENT_DISCHARGE_HIT' });
      if (combat.hp <= 0) objective = { phase: 'failed', reason: 'haunted' };
    }
  }

  const surge = resolveKitchenSurge(nextAdventure, elapsedMs);
  if (isPlayerHitByKitchenSurge(player, surge) && objective.phase !== 'failed') {
    const hit = applyHauntedPlayerHit(combat, elapsedMs);
    combat = hit.combat;
    if (hit.accepted) {
      player = applyHauntedKnockback(player, -1);
      events.push({ type: 'KITCHEN_SURGE_HIT' });
      if (combat.hp <= 0) objective = { phase: 'failed', reason: 'haunted' };
    }
  }

  const staticWave = resolveLivingRoomStatic(nextAdventure, elapsedMs);
  if (isPlayerHitByLivingRoomStatic(player, staticWave) && objective.phase !== 'failed') {
    const hit = applyHauntedPlayerHit(combat, elapsedMs);
    combat = hit.combat;
    if (hit.accepted) {
      player = applyHauntedKnockback(player, -1);
      events.push({ type: 'LIVING_ROOM_STATIC_HIT' });
      if (combat.hp <= 0) objective = { phase: 'failed', reason: 'haunted' };
    }
  }

  const twinSparks = resolveBathroomTwinSparks(nextAdventure, combat, player.x);
  nextAdventure = twinSparks.adventure;
  combat = twinSparks.combat;
  events.push(...twinSparks.events);
  if (isBathroomTwinActive(nextAdventure) && isPlayerTouchingBathroomTwin(player.x) && objective.phase !== 'failed') {
    const hit = applyHauntedPlayerHit(combat, elapsedMs);
    combat = hit.combat;
    if (hit.accepted) {
      player = applyHauntedKnockback(player, player.x < bathroomTwinX(player.x) ? -1 : 1);
      events.push({ type: 'BATHROOM_TWIN_CONTACT_HIT' });
      if (combat.hp <= 0) objective = { phase: 'failed', reason: 'haunted' };
    }
  }

  nextAdventure = lockRoomBossAim(nextAdventure, elapsedMs, player.x);
  const boss = resolveRoomBoss(nextAdventure, elapsedMs, player.x);
  const bossSparks = resolveRoomBossSparks(nextAdventure, combat, boss);
  nextAdventure = bossSparks.adventure;
  combat = bossSparks.combat;
  events.push(...bossSparks.events);
  // Beating a boss refills one heart: a little margin for the next fight.
  if (bossSparks.events.some(event => event.type === 'ROOM_BOSS_DISPELLED')) {
    combat = { ...combat, hp: Math.min(combat.maxHp, combat.hp + 1) };
  }
  if (boss && bossSparks.events.length === 0 && isPlayerTouchingRoomBoss(player, boss) && objective.phase !== 'failed') {
    const hit = applyHauntedPlayerHit(combat, elapsedMs);
    combat = hit.combat;
    if (hit.accepted) {
      player = applyHauntedKnockback(player, player.x < boss.x ? -1 : 1);
      events.push({ type: 'ROOM_BOSS_CONTACT_HIT', room: boss.config.room });
      if (combat.hp <= 0) objective = { phase: 'failed', reason: 'haunted' };
    }
  }

  // A room whose threat clock stopped (or never ran) cannot keep Wally
  // invulnerable: the frozen clock would otherwise hold the hit pose forever.
  if (!clockAdvanced && combat.invulnerableUntilMs > elapsedMs) {
    combat = { ...combat, invulnerableUntilMs: elapsedMs };
  }

  const crates = resolveAtticCrates(nextAdventure, elapsedMs);
  if (isPlayerHitByAtticCrate(player, crates) && objective.phase !== 'failed') {
    const hit = applyHauntedPlayerHit(combat, elapsedMs);
    combat = hit.combat;
    if (hit.accepted) {
      const crateX = crates.drops.find(drop => drop.dangerous)?.x ?? player.x;
      player = applyHauntedKnockback(player, player.x < crateX ? -1 : 1);
      events.push({ type: 'ATTIC_CRATE_HIT' });
      if (combat.hp <= 0) objective = { phase: 'failed', reason: 'haunted' };
    }
  }

  return {
    adventure: nextAdventure,
    events,
    session: {
      ...session,
      player,
      elapsedMs,
      combat,
      objective,
      domestic: {
        ...session.domestic,
        player: { x: Math.round(player.x), facing: player.facing },
      },
      input: consumeTransientActions(session.input),
    },
  };
}
