import type { HauntedCombatState } from '../haunted/HauntedCombat';
import { getRoomState, markRoomInteraction, type AdventureState, type RoomId } from './AdventureState';

/**
 * Room bosses before the Bathroom: solving a room's puzzle wakes its guardian,
 * which seals the way forward until enough Dream Sparks dispel it. Each one
 * moves differently, so each needs a different answer:
 *
 * - Hallway, Dust Moth: flutters across the room, leaning toward Wally;
 *   keep away and shoot.
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
export type RoomBossKind = 'moth' | 'wraith' | 'roach';
export type RoomBossRoom = 'hallway' | 'living-room' | 'kitchen';

export type RoomBossConfig = {
  kind: RoomBossKind;
  room: RoomBossRoom;
  name: string;
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
    kind: 'moth', room: 'hallway', name: 'DUST MOTH', guardSwitch: 'living-room-unlocked',
    exitId: 'hallway-to-living-room', hp: 3, cycleMs: 4_800, contactHalfWidth: 11, sparkHitRadius: 12,
  },
  'living-room': {
    kind: 'wraith', room: 'living-room', name: 'STATIC WRAITH', guardSwitch: 'source-hum-traced',
    exitId: 'living-room-to-kitchen', hp: 3, cycleMs: 4_500, contactHalfWidth: 11, sparkHitRadius: 12,
  },
  kitchen: {
    kind: 'roach', room: 'kitchen', name: 'GIANT ROACH', guardSwitch: 'power-rerouted',
    exitId: 'kitchen-to-bathroom', hp: 3, cycleMs: 4_400, contactHalfWidth: 13, sparkHitRadius: 14,
  },
};

/** Moth: x = center + amplitude * cos(phase); it starts beside the forward exit. */
export const MOTH_PATH = { centerX: 64, amplitude: 36 } as const;
/**
 * Wraith: one blink per spot; faint and harmless for telegraphMs, then solid.
 * It rises far from the television that wakes it and never blinks onto it.
 */
export const WRAITH_BLINK = { spots: [28, 68, 46], blinkMs: 1_500, telegraphMs: 450 } as const;
/**
 * Per wound the Wraith's warning shrinks by telegraphCutMs and its drift toward
 * Wally grows; it never drifts past maxX, so reading the television stays safe.
 */
export const WRAITH_HUNT = { telegraphCutMs: 75, driftMax: 20, driftPerHit: 12, maxX: 96 } as const;
/** Share of the gap to Wally the Moth closes: leanBase plus leanPerHit per wound. */
export const MOTH_HUNT = { leanBase: 0.12, leanPerHit: 0.12 } as const;
/** Roach: waits at a wall (the last telegraphMs twitching), then charges to the other one. */
export const ROACH_CHARGE = { leftX: 24, rightX: 104, waitMs: 1_300, telegraphMs: 450, chargeMs: 900 } as const;
/** Each wound takes this off the Roach's charge and adds it to its wait, so the cycle keeps its length. */
export const ROACH_HUNT = { chargeCutMs: 150 } as const;

/** How long a Roach with this many wounds takes to cross the kitchen. */
export function roachChargeMs(hits: number): number {
  return ROACH_CHARGE.chargeMs - ROACH_HUNT.chargeCutMs * hits;
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

export type RoomBossPose = 'rise' | 'fly' | 'telegraph' | 'solid' | 'wait' | 'charge';

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
};

const armedMark = (room: RoomBossRoom) => `${room}-boss-armed`;
const hitMark = (room: RoomBossRoom, hit: number) => `${room}-boss-hit-${hit}`;
const dispelledMark = (room: RoomBossRoom) => `${room}-boss-dispelled`;

export function roomBossFor(room: RoomId): RoomBossConfig | undefined {
  return Object.prototype.hasOwnProperty.call(ROOM_BOSSES, room) ? ROOM_BOSSES[room as RoomBossRoom] : undefined;
}

export function isRoomBossDispelled(adventure: AdventureState, room: RoomBossRoom): boolean {
  return getRoomState(adventure, room).interactions.includes(dispelledMark(room));
}

export function roomBossHits(adventure: AdventureState, room: RoomBossRoom): number {
  const interactions = getRoomState(adventure, room).interactions;
  let hits = 0;
  while (interactions.includes(hitMark(room, hits + 1))) hits += 1;
  return hits;
}

/** Awake and undefeated, wherever Wally currently is. */
export function isRoomBossLive(adventure: AdventureState, room: RoomBossRoom): boolean {
  const config = ROOM_BOSSES[room];
  return getRoomState(adventure, room).switches[config.guardSwitch] === true && !isRoomBossDispelled(adventure, room);
}

/** The boss of the current room, if it is awake and undefeated. */
export function activeRoomBoss(adventure: AdventureState): RoomBossConfig | undefined {
  const config = roomBossFor(adventure.currentRoom);
  return config && isRoomBossLive(adventure, config.room) ? config : undefined;
}

export function isRoomBossGuardingExit(adventure: AdventureState, room: RoomId, exitId: string): boolean {
  const config = roomBossFor(room);
  return Boolean(config && config.exitId === exitId && isRoomBossLive(adventure, config.room));
}

/** Marks the boss awake and aligns the room clock so its pattern starts from the beginning. */
export function armRoomBoss(adventure: AdventureState, elapsedMs: number): { adventure: AdventureState; elapsedMs: number } {
  const config = activeRoomBoss(adventure);
  if (!config || getRoomState(adventure, config.room).interactions.includes(armedMark(config.room))) return { adventure, elapsedMs };
  return {
    adventure: markRoomInteraction(adventure, config.room, armedMark(config.room)),
    elapsedMs: Math.ceil(Math.max(0, elapsedMs) / roomBossRoundMs(config)) * roomBossRoundMs(config),
  };
}

/** `playerX` lets the boss hunt Wally; without it the pattern is the bare one. */
export function resolveRoomBoss(adventure: AdventureState, elapsedMs: number, playerX?: number): RoomBossSnapshot | undefined {
  const config = activeRoomBoss(adventure);
  if (!config || !getRoomState(adventure, config.room).interactions.includes(armedMark(config.room))) return undefined;
  const hits = roomBossHits(adventure, config.room);
  const roundT = Math.max(0, elapsedMs) % roomBossRoundMs(config);
  if (roundT < ROOM_BOSS_RISE_MS) {
    const start = config.kind === 'moth' ? MOTH_PATH.centerX + MOTH_PATH.amplitude
      : config.kind === 'wraith' ? WRAITH_BLINK.spots[0] : ROACH_CHARGE.leftX;
    const lift = config.kind === 'moth' ? 26 : config.kind === 'wraith' ? 14 : 0;
    return { config, pose: 'rise', hits, dangerous: false, hittable: false, shielded: false, x: start, lift, facing: config.kind === 'roach' ? 1 : -1 };
  }
  // Shielded through the opening cycle, and again after each wound until the
  // next cycle: one wound per vulnerable cycle (missed cycles can be caught up),
  // so a fight lasts several attacks instead of one burst of sparks.
  const vulnerableCycle = Math.floor((roundT - ROOM_BOSS_RISE_MS) / config.cycleMs) - SHIELDED_CYCLES;
  const shielded = vulnerableCycle < 0 || hits > vulnerableCycle;
  const pose = poseAt(config, hits, (roundT - ROOM_BOSS_RISE_MS) % config.cycleMs, playerX);
  return { ...pose, shielded, hittable: pose.hittable && !shielded };
}

function poseAt(config: RoomBossConfig, hits: number, t: number, playerX: number | undefined): Omit<RoomBossSnapshot, 'shielded'> {
  if (config.kind === 'moth') {
    const phase = (2 * Math.PI * t) / config.cycleMs;
    const pathX = MOTH_PATH.centerX + MOTH_PATH.amplitude * Math.cos(phase);
    const lean = MOTH_HUNT.leanBase + MOTH_HUNT.leanPerHit * hits;
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
    const telegraphMs = WRAITH_BLINK.telegraphMs - WRAITH_HUNT.telegraphCutMs * hits;
    const solid = local >= telegraphMs;
    const spot = WRAITH_BLINK.spots[blink % WRAITH_BLINK.spots.length];
    // Once solid it drifts toward Wally, a little further after every wound.
    const reach = WRAITH_HUNT.driftMax + WRAITH_HUNT.driftPerHit * hits;
    const drift = solid && playerX !== undefined
      ? Math.max(-reach, Math.min(reach, playerX - spot)) * ((local - telegraphMs) / (WRAITH_BLINK.blinkMs - telegraphMs))
      : 0;
    return {
      config, pose: solid ? 'solid' : 'telegraph', hits, dangerous: solid, hittable: solid,
      x: Math.min(WRAITH_HUNT.maxX, spot + drift), lift: 14, facing: playerX !== undefined && playerX > spot ? 1 : -1,
    };
  }
  const { leftX, rightX, telegraphMs } = ROACH_CHARGE;
  const chargeMs = roachChargeMs(hits);
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

export function isPlayerTouchingRoomBoss(player: { x: number; grounded: boolean }, boss: RoomBossSnapshot | undefined): boolean {
  if (!boss?.dangerous) return false;
  if (boss.config.kind === 'roach' && !player.grounded) return false;
  return Math.abs(player.x - boss.x) <= boss.config.contactHalfWidth;
}

export type RoomBossEvent =
  | { type: 'ROOM_BOSS_HIT'; room: RoomBossRoom }
  | { type: 'ROOM_BOSS_DISPELLED'; room: RoomBossRoom };

/** Consumes a Dream Spark that reaches the boss (or its shield); the last wound needed dispels it. */
export function resolveRoomBossSparks(
  adventure: AdventureState,
  combat: HauntedCombatState,
  boss: RoomBossSnapshot | undefined,
): { adventure: AdventureState; combat: HauntedCombatState; events: RoomBossEvent[] } {
  if (!boss || !(boss.hittable || boss.shielded) || combat.projectiles.length === 0) return { adventure, combat, events: [] };
  const hit = combat.projectiles.find(projectile => Math.abs(projectile.x - boss.x) <= boss.config.sparkHitRadius);
  if (!hit) return { adventure, combat, events: [] };
  // The shield swallows the spark without a wound.
  if (!boss.hittable) return { adventure, combat: { ...combat, projectiles: combat.projectiles.filter(projectile => projectile !== hit) }, events: [] };
  const room = boss.config.room;
  const remaining = { ...combat, projectiles: combat.projectiles.filter(projectile => projectile !== hit) };
  const hits = boss.hits + 1;
  if (hits < boss.config.hp) {
    return { adventure: markRoomInteraction(adventure, room, hitMark(room, hits)), combat: remaining, events: [{ type: 'ROOM_BOSS_HIT', room }] };
  }
  return {
    adventure: markRoomInteraction(markRoomInteraction(adventure, room, hitMark(room, hits)), room, dispelledMark(room)),
    combat: { ...remaining, projectiles: [] },
    events: [{ type: 'ROOM_BOSS_DISPELLED', room }],
  };
}

/** Staging helper (screenshots, tests): the boss of this room counts as already dispelled. */
export function dispelRoomBoss(adventure: AdventureState, room: RoomBossRoom): AdventureState {
  return markRoomInteraction(adventure, room, dispelledMark(room));
}
