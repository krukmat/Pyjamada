import type { HauntedCombatState } from '../haunted/HauntedCombat';
import { difficultyProfile, reactionWindowMs, type DifficultyProfile } from './AdventureDifficulty';
import { getRoomState, markRoomInteraction, updateRoomState, type AdventureState, type RoomId } from './AdventureState';

/**
 * Room bosses before the Bathroom: solving a room's puzzle wakes its guardian,
 * which seals the way forward until enough Dream Sparks dispel it. Each one
 * moves differently, so each needs a different answer:
 *
 * - Hallway, Dust Moth: flutters across the room, leaning toward Wally;
 *   keep away and shoot. Once it is dispelled the cuckoo clock's bird, a
 *   mini boss, bursts out: it calls, dives at Wally and hops after him,
 *   pecking; it can be hit only while it hops, then it flies back home.
 * - Living Room, Static Wraith: blinks between three spots and, once solid,
 *   drifts toward Wally; it can be hit only once solid.
 * - Kitchen, Giant Roach: waits at a wall, then charges along the floor to
 *   the other one; jump it, shoot it while it waits.
 *
 * Every wound makes a boss meaner: the Moth leans harder toward Wally, the
 * Wraith warns for less time and drifts further, the Roach charges faster.
 * Wally's position only bends the pattern (no stored aim), so the boss never
 * jumps when he moves.
 *
 * A fight runs in rounds: a harmless rise (long enough to finish reading the
 * object that woke it), one shielded attack cycle that shows the pattern, and
 * then three vulnerable ones that take one wound each, after which the boss
 * catches its breath where it started. Positions are a pure function of the
 * room clock, aligned to a round start when the boss wakes, so only the
 * arm/hit/dispelled marks are stored, as room interactions.
 */
export type RoomBossKind = 'moth' | 'wraith' | 'roach' | 'cuckoo';
export type RoomBossRoom = 'hallway' | 'living-room' | 'kitchen';

export type RoomBossConfig = {
  kind: RoomBossKind;
  room: RoomBossRoom;
  name: string;
  /** Prefix of the room interactions that record its arming, wounds and dispel. */
  markPrefix: string;
  /** Room switch set by the puzzle that opens the forward exit; it also wakes the boss. */
  guardSwitch: string;
  exitId: string;
  hp: number;
  cycleMs: number;
  contactHalfWidth: number;
  sparkHitRadius: number;
};

export const ROOM_BOSSES: Record<RoomBossRoom, RoomBossConfig> = {
  hallway: {
    kind: 'moth', room: 'hallway', name: 'DUST MOTH', markPrefix: 'hallway-boss', guardSwitch: 'living-room-unlocked',
    exitId: 'hallway-to-living-room', hp: 3, cycleMs: 4_800, contactHalfWidth: 11, sparkHitRadius: 12,
  },
  'living-room': {
    kind: 'wraith', room: 'living-room', name: 'STATIC WRAITH', markPrefix: 'living-room-boss', guardSwitch: 'source-hum-traced',
    exitId: 'living-room-to-kitchen', hp: 3, cycleMs: 4_500, contactHalfWidth: 11, sparkHitRadius: 12,
  },
  kitchen: {
    kind: 'roach', room: 'kitchen', name: 'GIANT ROACH', markPrefix: 'kitchen-boss', guardSwitch: 'power-rerouted',
    exitId: 'kitchen-to-bathroom', hp: 3, cycleMs: 4_400, contactHalfWidth: 13, sparkHitRadius: 14,
  },
};

/** The Hallway's mini boss, woken when the Dust Moth is dispelled. */
export const CUCKOO_BOSS: RoomBossConfig = {
  kind: 'cuckoo', room: 'hallway', name: 'CUCKOO', markPrefix: 'hallway-cuckoo', guardSwitch: 'living-room-unlocked',
  exitId: 'hallway-to-living-room', hp: 2, cycleMs: 4_200, contactHalfWidth: 10, sparkHitRadius: 11,
};

/** Each room's bosses in the order they wake; the next one wakes when the previous is dispelled. */
export const ROOM_BOSS_SEQUENCES: Record<RoomBossRoom, readonly RoomBossConfig[]> = {
  hallway: [ROOM_BOSSES.hallway, CUCKOO_BOSS],
  'living-room': [ROOM_BOSSES['living-room']],
  kitchen: [ROOM_BOSSES.kitchen],
};

/**
 * Cuckoo, one cycle: calls from the clock door (harmless), dives toward one of
 * two landing spots bent toward Wally, hops after him pecking (the only time it
 * can be hit), flies back up and hides. It hurts only when low enough to reach
 * him (`reachLift`). Landing spots alternate between cycles.
 */
export const CUCKOO_FLIGHT = {
  clockX: 64,
  doorLift: 62,
  reachLift: 16,
  landX: [36, 92],
  callMs: 700,
  diveMs: 700,
  hopMs: 1_000,
  returnMs: 700,
  /** Share of the gap to Wally its landing spot closes: leanBase plus leanPerHit per wound. */
  leanBase: 0.4,
  leanPerHit: 0.25,
} as const;

/** Moth: x = center + amplitude * cos(phase); it starts beside the forward exit. */
export const MOTH_PATH = { centerX: 64, amplitude: 36 } as const;
/**
 * Wraith: one blink per spot; faint and harmless for telegraphMs, then solid.
 * It rises far from the television that wakes it and never blinks onto it.
 */
export const WRAITH_BLINK = { spots: [28, 68, 46], blinkMs: 1_500, telegraphMs: 450 } as const;
/**
 * Per wound the Wraith's warning shrinks by telegraphCutMs and its drift toward
 * Wally grows. It stays between minX and maxX, so the hallway door Wally wakes
 * at after a knock-out is always safe.
 */
export const WRAITH_HUNT = { telegraphCutMs: 75, driftMax: 20, driftPerHit: 20, minX: 34, maxX: 104 } as const;
/** Share of the gap to Wally the Moth closes: leanBase plus leanPerHit per wound. */
export const MOTH_HUNT = { leanBase: 0.08, leanPerHit: 0.08 } as const;
/** Roach: waits at a wall (the last telegraphMs twitching), then charges to the other one. */
export const ROACH_CHARGE = { leftX: 24, rightX: 104, waitMs: 1_300, telegraphMs: 450, chargeMs: 900 } as const;
/**
 * Each wound takes chargeCutMs off the Roach's charge (adding it to its wait, so
 * the cycle keeps its length) and telegraphCutMs off its twitch: the last
 * wounds are won by reading its rhythm, not by waiting for the warning.
 */
export const ROACH_HUNT = { chargeCutMs: 150, telegraphCutMs: 175 } as const;

/** How long a Roach with this many wounds takes to cross the kitchen. */
export function roachChargeMs(hits: number, rush = 1): number {
  return (ROACH_CHARGE.chargeMs - ROACH_HUNT.chargeCutMs * hits) / rush;
}

/** Harmless, untouchable rise at the start of every round. */
export const ROOM_BOSS_RISE_MS = 3_000;
/**
 * The first attack cycle of every round is shielded: the boss shows its attack
 * once (it still hurts) and blocks Dream Sparks before it can be wounded.
 */
const SHIELDED_CYCLES = 1;
const CYCLES_PER_ROUND = 4;

export function roomBossRoundMs(config: RoomBossConfig): number {
  return ROOM_BOSS_RISE_MS + CYCLES_PER_ROUND * config.cycleMs;
}

export type RoomBossPose = 'rise' | 'fly' | 'telegraph' | 'solid' | 'wait' | 'charge' | 'dive' | 'hop' | 'hide';

export type RoomBossSnapshot = {
  config: RoomBossConfig;
  pose: RoomBossPose;
  x: number;
  /** Height of the body above the floor, for rendering. */
  lift: number;
  facing: 1 | -1;
  /** Touching it costs a heart (the Roach only reaches grounded players). */
  dangerous: boolean;
  /** Dream Sparks can land. */
  hittable: boolean;
  /** Attacking behind a shield that blocks Dream Sparks. */
  shielded: boolean;
  hits: number;
  /** A Dream Spark repelled this attack: it stays harmless until the next cycle. */
  repelled?: boolean;
  /** This round's one repel is already spent: the shield only swallows sparks. */
  repelSpent?: boolean;
  /** Identifies the current attack cycle (round and cycle), for the repel mark. */
  attackKey?: string;
  /** Where a boss with a locked aim is heading this attack (it lands or passes there). */
  aimX?: number;
};

const armedMark = (config: RoomBossConfig) => `${config.markPrefix}-armed`;
const hitMark = (config: RoomBossConfig, hit: number) => `${config.markPrefix}-hit-${hit}`;
const roundFromMark = (config: RoomBossConfig, hits: number) => `${config.markPrefix}-round-from-${hits}`;
const repelRoundPrefix = (config: RoomBossConfig, round: number) => `${config.markPrefix}-repel-${round}-`;
const dispelledMark = (config: RoomBossConfig) => `${config.markPrefix}-dispelled`;
const aimPrefix = (config: RoomBossConfig) => `${config.markPrefix}-aim-`;

/**
 * Locked aim: on levels that lock it, the Cuckoo picks its landing spot as it
 * calls (where Wally stands then) and lands right there; it only hurts in the
 * last part of the dive (lift at most landReachLift) and while it hops, so a
 * quick step away from the marked spot dodges it. Only the current aim is stored, as one room
 * interaction.
 */
export const LOCKED_AIM = { landReachLift: 6 } as const;

function aimSegment(config: RoomBossConfig, elapsedMs: number): string | undefined {
  if (config.kind !== 'cuckoo') return undefined;
  const roundMs = roomBossRoundMs(config);
  const roundT = Math.max(0, elapsedMs) % roundMs;
  if (roundT < ROOM_BOSS_RISE_MS) return undefined;
  return `${Math.floor(Math.max(0, elapsedMs) / roundMs)}-${Math.floor((roundT - ROOM_BOSS_RISE_MS) / config.cycleMs)}`;
}

function lockedAim(adventure: AdventureState, config: RoomBossConfig, segment: string): number | undefined {
  const prefix = `${aimPrefix(config)}${segment}@`;
  const mark = getRoomState(adventure, config.room).interactions.find(item => item.startsWith(prefix));
  return mark === undefined ? undefined : Number(mark.slice(prefix.length));
}

/** Stores where Wally stands as a new aim segment starts, on levels that lock the aim. */
export function lockRoomBossAim(adventure: AdventureState, elapsedMs: number, playerX: number): AdventureState {
  const config = activeRoomBoss(adventure);
  if (!config || !difficultyProfile(adventure).lockAim) return adventure;
  if (!getRoomState(adventure, config.room).interactions.includes(armedMark(config))) return adventure;
  const segment = aimSegment(config, elapsedMs);
  if (segment === undefined || lockedAim(adventure, config, segment) !== undefined) return adventure;
  const prefix = aimPrefix(config);
  return updateRoomState(adventure, config.room, room => ({
    ...room,
    interactions: [...room.interactions.filter(item => !item.startsWith(prefix)), `${prefix}${segment}@${Math.round(playerX)}`],
  }));
}

/** The room's first boss, if the room has any. */
export function roomBossFor(room: RoomId): RoomBossConfig | undefined {
  return Object.prototype.hasOwnProperty.call(ROOM_BOSSES, room) ? ROOM_BOSSES[room as RoomBossRoom] : undefined;
}

export function isBossDispelled(adventure: AdventureState, config: RoomBossConfig): boolean {
  return getRoomState(adventure, config.room).interactions.includes(dispelledMark(config));
}

/** Every boss of the room is dispelled. */
export function isRoomBossDispelled(adventure: AdventureState, room: RoomBossRoom): boolean {
  return ROOM_BOSS_SEQUENCES[room].every(config => isBossDispelled(adventure, config));
}

export function roomBossHits(adventure: AdventureState, config: RoomBossConfig): number {
  const interactions = getRoomState(adventure, config.room).interactions;
  let hits = 0;
  while (interactions.includes(hitMark(config, hits + 1))) hits += 1;
  return hits;
}

/** The room's bosses are awake and not all dispelled, wherever Wally currently is. */
export function isRoomBossLive(adventure: AdventureState, room: RoomBossRoom): boolean {
  return getRoomState(adventure, room).switches[ROOM_BOSSES[room].guardSwitch] === true && !isRoomBossDispelled(adventure, room);
}

/** The current room's awake boss: the first of its sequence not yet dispelled. */
export function activeRoomBoss(adventure: AdventureState): RoomBossConfig | undefined {
  const first = roomBossFor(adventure.currentRoom);
  if (!first || !isRoomBossLive(adventure, first.room)) return undefined;
  return ROOM_BOSS_SEQUENCES[first.room].find(config => !isBossDispelled(adventure, config));
}

export function isRoomBossGuardingExit(adventure: AdventureState, room: RoomId, exitId: string): boolean {
  const config = roomBossFor(room);
  return Boolean(config && config.exitId === exitId && isRoomBossLive(adventure, config.room));
}

/** Marks the boss awake and aligns the room clock so its pattern starts from the beginning. */
export function armRoomBoss(adventure: AdventureState, elapsedMs: number): { adventure: AdventureState; elapsedMs: number } {
  const config = activeRoomBoss(adventure);
  if (!config || getRoomState(adventure, config.room).interactions.includes(armedMark(config))) return { adventure, elapsedMs };
  return {
    adventure: markRoomInteraction(adventure, config.room, armedMark(config)),
    elapsedMs: Math.ceil(Math.max(0, elapsedMs) / roomBossRoundMs(config)) * roomBossRoundMs(config),
  };
}

/**
 * After a knock-out the boss starts a fresh round (wounds kept): Wally wakes at
 * the door to its harmless rise and has time to cross back to the fight.
 */
export function restartRoomBossRound(adventure: AdventureState, elapsedMs: number): { adventure: AdventureState; elapsedMs: number } {
  const config = activeRoomBoss(adventure);
  if (!config || !getRoomState(adventure, config.room).interactions.includes(armedMark(config))) return { adventure, elapsedMs };
  const roundMs = roomBossRoundMs(config);
  return {
    adventure: markRoomInteraction(adventure, config.room, roundFromMark(config, roomBossHits(adventure, config))),
    elapsedMs: Math.ceil(Math.max(0, elapsedMs) / roundMs) * roundMs,
  };
}

/** Wounds the boss had when its round was last restarted: its vulnerable cycles count from there. */
function roundStartHits(adventure: AdventureState, config: RoomBossConfig): number {
  const interactions = getRoomState(adventure, config.room).interactions;
  let start = 0;
  for (let hit = 1; hit < config.hp; hit += 1) if (interactions.includes(roundFromMark(config, hit))) start = hit;
  return start;
}

/** `playerX` lets the boss hunt Wally; without it the pattern is the bare one. */
export function resolveRoomBoss(adventure: AdventureState, elapsedMs: number, playerX?: number): RoomBossSnapshot | undefined {
  const config = activeRoomBoss(adventure);
  if (!config || !getRoomState(adventure, config.room).interactions.includes(armedMark(config))) return undefined;
  const hits = roomBossHits(adventure, config);
  const roundT = Math.max(0, elapsedMs) % roomBossRoundMs(config);
  if (roundT < ROOM_BOSS_RISE_MS) {
    const start = config.kind === 'moth' ? MOTH_PATH.centerX + MOTH_PATH.amplitude
      : config.kind === 'wraith' ? WRAITH_BLINK.spots[0] : config.kind === 'cuckoo' ? CUCKOO_FLIGHT.clockX : ROACH_CHARGE.leftX;
    const lift = config.kind === 'moth' ? 26 : config.kind === 'wraith' ? 14 : config.kind === 'cuckoo' ? CUCKOO_FLIGHT.doorLift : 0;
    return { config, pose: 'rise', hits, dangerous: false, hittable: false, shielded: false, x: start, lift, facing: config.kind === 'roach' ? 1 : -1 };
  }
  // Shielded through the opening cycle, and again after each wound until the
  // next cycle: one wound per vulnerable cycle (missed cycles can be caught up),
  // so a fight lasts several attacks instead of one burst of sparks.
  const cycle = Math.floor((roundT - ROOM_BOSS_RISE_MS) / config.cycleMs);
  const vulnerableCycle = cycle - SHIELDED_CYCLES;
  const shielded = vulnerableCycle < 0 || hits - roundStartHits(adventure, config) > vulnerableCycle;
  const level = difficultyProfile(adventure);
  const segment = level.lockAim ? aimSegment(config, elapsedMs) : undefined;
  const aimX = segment === undefined ? undefined : lockedAim(adventure, config, segment) ?? playerX;
  const pose = config.kind === 'cuckoo'
    ? cuckooPoseAt(config, hits, cycle, (roundT - ROOM_BOSS_RISE_MS) % config.cycleMs, playerX, level, aimX)
    : poseAt(config, hits, (roundT - ROOM_BOSS_RISE_MS) % config.cycleMs, playerX, level);
  // A spark that met the attack behind the shield cancels the rest of it, once per round.
  const roundPrefix = repelRoundPrefix(config, Math.floor(Math.max(0, elapsedMs) / roomBossRoundMs(config)));
  const attackKey = `${roundPrefix}${cycle}`;
  const interactions = getRoomState(adventure, config.room).interactions;
  if (interactions.includes(attackKey)) {
    return { ...pose, shielded, attackKey, aimX, repelled: true, repelSpent: true, dangerous: false, hittable: false };
  }
  const repelSpent = interactions.some(mark => mark.startsWith(roundPrefix));
  return { ...pose, shielded, attackKey, aimX, repelSpent, hittable: pose.hittable && !shielded };
}

function poseAt(config: RoomBossConfig, hits: number, t: number, playerX: number | undefined, level: DifficultyProfile): Omit<RoomBossSnapshot, 'shielded'> {
  if (config.kind === 'moth') {
    const phase = (2 * Math.PI * t) / config.cycleMs;
    const pathX = MOTH_PATH.centerX + MOTH_PATH.amplitude * Math.cos(phase);
    const lean = Math.min(1, (MOTH_HUNT.leanBase + MOTH_HUNT.leanPerHit * hits) * level.hunt);
    return {
      config, pose: 'fly', hits, dangerous: true, hittable: true,
      x: playerX === undefined ? pathX : pathX + (playerX - pathX) * lean,
      lift: 26 + 5 * Math.sin(phase * 3),
      facing: Math.sin(phase) > 0 ? -1 : 1,
    };
  }
  if (config.kind === 'wraith') {
    const blink = Math.floor(t / WRAITH_BLINK.blinkMs);
    const local = t % WRAITH_BLINK.blinkMs;
    const telegraphMs = reactionWindowMs(WRAITH_BLINK.telegraphMs - WRAITH_HUNT.telegraphCutMs * hits, level);
    const solid = local >= telegraphMs;
    const spot = WRAITH_BLINK.spots[blink % WRAITH_BLINK.spots.length];
    // Once solid it drifts toward Wally, a little further after every wound.
    const reach = (WRAITH_HUNT.driftMax + WRAITH_HUNT.driftPerHit * hits) * level.hunt;
    const drift = solid && playerX !== undefined
      ? Math.max(-reach, Math.min(reach, playerX - spot)) * ((local - telegraphMs) / (WRAITH_BLINK.blinkMs - telegraphMs))
      : 0;
    return {
      config, pose: solid ? 'solid' : 'telegraph', hits, dangerous: solid, hittable: solid,
      x: Math.max(WRAITH_HUNT.minX, Math.min(WRAITH_HUNT.maxX, spot + drift)), lift: 14, facing: playerX !== undefined && playerX > spot ? 1 : -1,
    };
  }
  const { leftX, rightX } = ROACH_CHARGE;
  const telegraphMs = reactionWindowMs(Math.max(0, ROACH_CHARGE.telegraphMs - ROACH_HUNT.telegraphCutMs * hits), level);
  const chargeMs = roachChargeMs(hits, level.rush);
  const waitMs = ROACH_CHARGE.waitMs + ROACH_CHARGE.chargeMs - chargeMs;
  const leg = waitMs + chargeMs;
  const outbound = t < leg;
  const local = outbound ? t : t - leg;
  const from = outbound ? leftX : rightX;
  const to = outbound ? rightX : leftX;
  const facing: 1 | -1 = to > from ? 1 : -1;
  if (local < waitMs) {
    return { config, pose: local >= waitMs - telegraphMs ? 'telegraph' : 'wait', hits, dangerous: true, hittable: true, x: from, lift: 0, facing };
  }
  const progress = (local - waitMs) / chargeMs;
  return { config, pose: 'charge', hits, dangerous: true, hittable: true, x: from + (to - from) * progress, lift: 0, facing };
}

function cuckooPoseAt(config: RoomBossConfig, hits: number, cycle: number, t: number, playerX: number | undefined, level: DifficultyProfile, aimX?: number): Omit<RoomBossSnapshot, 'shielded'> {
  const { clockX, doorLift, reachLift, landX, diveMs, hopMs, returnMs, leanBase, leanPerHit } = CUCKOO_FLIGHT;
  // Higher levels cut the call short: the bird dives sooner.
  const callMs = reactionWindowMs(CUCKOO_FLIGHT.callMs, level);
  const base = landX[cycle % landX.length];
  // A locked aim lands right where Wally stood when the bird called.
  const land = aimX !== undefined ? Math.max(landX[0] - 28, Math.min(landX[1] + 24, aimX))
    : playerX === undefined ? base : base + (playerX - base) * Math.min(1, (leanBase + leanPerHit * hits) * level.hunt);
  const facing: 1 | -1 = (playerX ?? base) >= land ? 1 : -1;
  const outward: 1 | -1 = land < clockX ? -1 : 1;
  const flightReach = aimX === undefined ? reachLift : LOCKED_AIM.landReachLift;
  const flight = (pose: RoomBossPose, x: number, lift: number, heading: 1 | -1) => ({
    config, pose, hits, x, lift, facing: heading, dangerous: lift <= flightReach, hittable: false,
  });
  if (t < callMs) return { config, pose: 'telegraph', hits, dangerous: false, hittable: false, x: clockX, lift: doorLift, facing: -1 };
  if (t < callMs + diveMs) {
    const progress = (t - callMs) / diveMs;
    return flight('dive', clockX + (land - clockX) * progress, doorLift * (1 - progress), outward);
  }
  if (t < callMs + diveMs + hopMs) {
    // Hops after Wally on the floor, pecking: the window to shoot it.
    const hop = Math.abs(Math.sin(((t - callMs - diveMs) / 260) * Math.PI)) * 3;
    return { config, pose: 'hop', hits, dangerous: true, hittable: true, x: land, lift: hop, facing };
  }
  if (t < callMs + diveMs + hopMs + returnMs) {
    const progress = (t - callMs - diveMs - hopMs) / returnMs;
    // A bird with a locked aim takes off straight up: only its landing hurts.
    const back = flight('fly', land + (clockX - land) * progress, doorLift * progress, outward === 1 ? -1 : 1);
    return aimX === undefined ? back : { ...back, dangerous: false };
  }
  return { config, pose: 'hide', hits, dangerous: false, hittable: false, x: clockX, lift: doorLift, facing: -1 };
}

export function isPlayerTouchingRoomBoss(player: { x: number; grounded: boolean }, boss: RoomBossSnapshot | undefined): boolean {
  if (!boss?.dangerous) return false;
  if (boss.config.kind === 'roach' && !player.grounded) return false;
  return Math.abs(player.x - boss.x) <= boss.config.contactHalfWidth;
}

/** Dream Sparks fly at Wally's chest height: a boss higher than this (the Cuckoo at its door) is out of reach. */
const SPARK_REACH_LIFT = 36;

export type RoomBossEvent =
  | { type: 'ROOM_BOSS_HIT'; room: RoomBossRoom }
  | { type: 'ROOM_BOSS_DISPELLED'; room: RoomBossRoom }
  | { type: 'ROOM_BOSS_REPELLED'; room: RoomBossRoom };

/** Consumes a Dream Spark that reaches the boss (or its shield); the last wound needed dispels it. */
export function resolveRoomBossSparks(
  adventure: AdventureState,
  combat: HauntedCombatState,
  boss: RoomBossSnapshot | undefined,
): { adventure: AdventureState; combat: HauntedCombatState; events: RoomBossEvent[] } {
  if (!boss || !(boss.hittable || boss.shielded) || boss.pose === 'hide' || boss.lift > SPARK_REACH_LIFT || combat.projectiles.length === 0) {
    return { adventure, combat, events: [] };
  }
  const hit = combat.projectiles.find(projectile => Math.abs(projectile.x - boss.x) <= boss.config.sparkHitRadius);
  if (!hit) return { adventure, combat, events: [] };
  // The shield swallows the spark without a wound, but the first spark of a
  // round that meets a shielded attack repels it: the boss is harmless until
  // its next cycle.
  if (!boss.hittable) {
    const blocked = { ...combat, projectiles: combat.projectiles.filter(projectile => projectile !== hit) };
    if (!boss.dangerous || boss.repelSpent || boss.attackKey === undefined) return { adventure, combat: blocked, events: [] };
    return {
      adventure: markRoomInteraction(adventure, boss.config.room, boss.attackKey),
      combat: blocked,
      events: [{ type: 'ROOM_BOSS_REPELLED', room: boss.config.room }],
    };
  }
  const { config } = boss;
  const room = config.room;
  const remaining = { ...combat, projectiles: combat.projectiles.filter(projectile => projectile !== hit) };
  const hits = boss.hits + 1;
  if (hits < config.hp) {
    return { adventure: markRoomInteraction(adventure, room, hitMark(config, hits)), combat: remaining, events: [{ type: 'ROOM_BOSS_HIT', room }] };
  }
  return {
    adventure: markRoomInteraction(markRoomInteraction(adventure, room, hitMark(config, hits)), room, dispelledMark(config)),
    combat: { ...remaining, projectiles: [] },
    events: [{ type: 'ROOM_BOSS_DISPELLED', room }],
  };
}

/** Staging helper (screenshots, tests): every boss of this room counts as already dispelled. */
export function dispelRoomBoss(adventure: AdventureState, room: RoomBossRoom): AdventureState {
  return ROOM_BOSS_SEQUENCES[room].reduce((state, config) => markRoomInteraction(state, room, dispelledMark(config)), adventure);
}

/** Staging helper (tests): this one boss counts as already dispelled. */
export function dispelBoss(adventure: AdventureState, config: RoomBossConfig): AdventureState {
  return markRoomInteraction(adventure, config.room, dispelledMark(config));
}
