/**
 * Human-model QA policy.
 *
 * Unlike RouteBot (which simulates the runtime forward and so knows about
 * danger before it is drawn), HumanBot only reacts to what a player can see:
 *
 * - Threat perception comes exclusively from `observeRoomThreats` (room
 *   hazards) and the ghost sprites (haunted bedroom), and it is seen
 *   `reactionMs` late (default 250 ms). The Resonator's pulsing zone, which
 *   swaps left and right but never hurts, is seen with the same delay.
 * - Every input lands `latencyMs` after the decision (default 100 ms).
 * - One thumb: a step never combines a held direction with JUMP, ATTACK or
 *   INTERACT, and at most one of those taps; repeated taps are rate limited.
 * - After using an object it reads for `readMs` (default 1.2 s).
 *
 * Own position, facing and the positions of objects and Dream Spark targets
 * are read directly: a player knows where Wally and the furniture are and
 * predicts Wally's own motion; reaction time applies to threats.
 */
import {
  findAdventureInteractionTarget,
  isAdventureExplorationActive,
} from '../adventure/AdventureExplorationRuntime';
import { bathroomTwinX, isBathroomTwinActive } from '../adventure/BathroomTwinHazard';
import { activeRoomBoss } from '../adventure/RoomBossHazard';
import { getLaboratoryEncounterPhase } from '../adventure/LaboratoryEncounter';
import { resolveResonatorInstabilityState } from '../adventure/LaboratoryResonatorInstability';
import { findActiveRoom } from '../adventure/RoomRegistry';
import { observeRoomThreats, type ThreatObservation } from '../adventure/RoomThreatObservation';
import { isGhostDangerous, type GhostPhase } from '../haunted/HauntedThreats';
import { HAUNTED_EXIT, isAtHauntedExit } from '../haunted/HauntedSessionRuntime';
import { HAUNTED_PLAYER_BOUNDS, HAUNTED_PLAYER_PHYSICS } from '../haunted/PlayerPhysics';
import { nextSeededRandom, seedFromString } from '../haunted/SeededRng';
import { findSystemicObject, getSystemicObject } from '../systemic/SystemicContent';
import type { SystemicObjectId } from '../systemic/SystemicState';
import {
  ARRIVE_DISTANCE,
  BOT_STEP_MS,
  clampX,
  combatTargets,
  IDLE_ACTION,
  interactsWith,
  RoutePlanner,
  type BotAction,
  type BotPolicy,
  type BotWorld,
  type Goal,
  roomBossFiringSpot,
} from './AdventureBot';

export const HUMAN_REACTION_MS = 250;
export const HUMAN_LATENCY_MS = 100;
export const HUMAN_READ_MS = 1_200;

/** 'always' dodges; the reader probe ('not-while-reading') stands still while reading; 'never' ignores threats. */
export type HumanThreatResponse = 'always' | 'not-while-reading' | 'never';

export type HumanBotOptions = {
  reactionMs?: number;
  latencyMs?: number;
  readMs?: number;
  threatResponse?: HumanThreatResponse;
  /** Hesitation before pursuing any goal (threat reactions still apply). Used to jitter room entries. */
  startDelayMs?: number;
  /** Fastest repeat of the same tap button; each repeat adds up to `tapJitterMs` of human irregularity. */
  tapIntervalMs?: number;
  tapJitterMs?: number;
  /** Seeds the tap irregularity so runs stay deterministic. */
  seed?: string;
};

type PerceivedGhost = { x: number; phase: GhostPhase };
/** `distortion` is the Resonator zone that swaps left and right while it pulses (drawn on screen, no damage). */
type Frame = { phaseKey: string; threats: ThreatObservation[]; ghosts: PerceivedGhost[]; distortion?: Zone };
type Zone = { minX: number; maxX: number };
type HumanGoal = Goal & { domestic?: SystemicObjectId | 'exit' };
type Decision = { action: BotAction; goal?: HumanGoal };

const STEP_S = BOT_STEP_MS / 1000;
/** Jump when a floor wave's edge is seen this close in time (contact window is generous: ~0.7 s of airtime). */
const JUMP_LEAD_S = 0.75;
const ESCAPE_MARGIN = 2;
const ENTRY_LOOKAHEAD = 8;
const MIN_FIRING_DISTANCE = 12;
const SPOT_ZONE_MARGIN = 2;
const GHOST_FIGHT_RANGE = 70;
const INTERACT_RETRY_MS = 300;
const LEAVE_DISTANCE = 5;
const SHADOW_DISTANCE = 0.75;

function steps(ms: number): number {
  return Math.ceil(ms / BOT_STEP_MS - 1e-9);
}

function move(direction: -1 | 1): BotAction {
  return { move: direction, jump: false, attack: false, interact: false };
}

/** Labels the phase of the room so zone memory resets when the Laboratory moves to its next phase. */
function phaseKey(world: BotWorld): string {
  const room = world.adventure.currentRoom;
  if (!isAdventureExplorationActive(world.adventure)) return `${room}:haunted`;
  return room === 'laboratory' ? `${room}:${getLaboratoryEncounterPhase(world.adventure)}` : room;
}

function perceive(world: BotWorld): Frame {
  const exploring = isAdventureExplorationActive(world.adventure);
  const distortion = resolveResonatorInstabilityState(world.adventure, world.session.elapsedMs).distortion;
  return {
    phaseKey: phaseKey(world),
    threats: exploring ? observeRoomThreats(world.session, world.adventure) : [],
    ghosts: exploring ? [] : world.session.threats.ghosts.map(ghost => ({ x: ghost.x, phase: ghost.phase })),
    distortion: distortion.phase === 'active' && distortion.minX !== undefined && distortion.maxX !== undefined
      ? { minX: distortion.minX, maxX: distortion.maxX }
      : undefined,
  };
}

export class HumanBot implements BotPolicy {
  readonly planner = new RoutePlanner(true);
  readonly shadowed = this.planner.shadowed;
  private readonly reactionSteps: number;
  private readonly latencySteps: number;
  private readonly readSteps: number;
  private readonly startDelaySteps: number;
  private readonly tapIntervalSteps: number;
  private readonly tapJitterSteps: number;
  private readonly threatResponse: HumanThreatResponse;
  private rngState: number;
  private nextTapGap = 0;

  private stepIndex = 0;
  private roomKey: string | undefined;
  private frames: Frame[] = [];
  private pending: Decision[] = [];
  private lastTap = { jump: -Infinity, attack: -Infinity, interact: -Infinity };
  private readingUntil = -1;
  private inverted = false;
  /** A turning tap is in flight until this step; Wally's facing shows its result only then. */
  private turnSettlesAt = -1;
  private firing: { key: string; x: number } | undefined;
  private readonly zoneMemory = new Map<string, Zone[]>();
  private goal: HumanGoal | undefined = { x: 0, label: 'start' };
  private arrivedAt: string | undefined;
  private intent = 'start';

  constructor(options: HumanBotOptions = {}) {
    this.reactionSteps = steps(options.reactionMs ?? HUMAN_REACTION_MS);
    this.latencySteps = steps(options.latencyMs ?? HUMAN_LATENCY_MS);
    this.readSteps = steps(options.readMs ?? HUMAN_READ_MS);
    this.startDelaySteps = steps(options.startDelayMs ?? 0);
    this.tapIntervalSteps = steps(options.tapIntervalMs ?? 200);
    this.tapJitterSteps = steps(options.tapJitterMs ?? 150);
    this.threatResponse = options.threatResponse ?? 'always';
    this.rngState = seedFromString(options.seed ?? 'human-bot');
    this.nextTapGap = this.tapIntervalSteps;
  }

  describe(): string {
    return `${this.intent}; goal=${this.goal?.label ?? 'none'}`;
  }

  hasGoal(): boolean {
    return this.goal !== undefined;
  }

  /** Reading an object's text, or still looking up from it (reaction plus input latency). */
  isReading(): boolean {
    return this.stepIndex < this.readingUntil + this.reactionSteps + this.latencySteps;
  }

  act(world: BotWorld): BotAction {
    this.stepIndex += 1;
    const roomKey = `${world.adventure.currentRoom}:${isAdventureExplorationActive(world.adventure)}`;
    if (roomKey !== this.roomKey) {
      // New room (after App's fade): nothing seen yet, queued taps and held controls are dropped.
      this.roomKey = roomKey;
      this.frames = [];
      this.pending = [];
      this.firing = undefined;
      this.turnSettlesAt = -1;
    }
    this.frames.push(perceive(world));
    if (this.frames.length > this.reactionSteps + 2) this.frames.shift();
    const seenIndex = this.frames.length - 1 - this.reactionSteps;
    const seen = seenIndex >= 0 ? this.frames[seenIndex] : undefined;
    const before = seenIndex >= 1 ? this.frames[seenIndex - 1] : undefined;

    const decision = this.decide(world, seen, before);
    this.pending.push({ action: oneThumb(decision.action), goal: decision.goal });
    const next = this.pending.length > this.latencySteps ? this.pending.shift()! : { action: IDLE_ACTION };
    this.onApplied(world, next);
    return next.action;
  }

  // -------------------------------------------------------------------------
  // Decisions (made on the delayed perception; applied `latencySteps` later)

  private decide(world: BotWorld, seen: Frame | undefined, before: Frame | undefined): Decision {
    this.expectSwappedControls(world, seen);
    if (seen) this.remember(seen);
    const exploring = isAdventureExplorationActive(world.adventure);
    const reading = this.stepIndex < this.readingUntil;
    const reacting = this.threatResponse === 'always' || (this.threatResponse === 'not-while-reading' && !reading);

    if (reacting && seen) {
      const reaction = exploring ? this.reactToThreats(world, seen, before) : this.reactToGhosts(world, seen);
      if (reaction) return { action: reaction };
    }
    if (this.stepIndex <= this.startDelaySteps) {
      this.intent = 'hesitating at the entry';
      return { action: IDLE_ACTION };
    }
    if (reading) {
      this.intent = 'reading';
      return { action: IDLE_ACTION };
    }

    const goal = exploring ? this.explorationGoal(world) : this.bedroomGoal(world);
    this.goal = goal;
    if (!goal) {
      this.intent = 'no goal';
      return { action: IDLE_ACTION };
    }
    const decision = this.pursue(world, goal);
    if (reacting && seen && exploring && decision.action.move !== 0 && this.wouldEnterZone(world, seen, decision.action)) {
      this.intent = 'waiting for a threat zone to clear';
      return { action: IDLE_ACTION };
    }
    return decision;
  }

  private reactToThreats(world: BotWorld, seen: Frame, before: Frame | undefined): BotAction | undefined {
    const player = world.session.player;
    const x = player.x;

    if (player.grounded && this.canTap('jump')) {
      for (const danger of seen.threats) {
        if (danger.phase !== 'danger' || !danger.jumpable) continue;
        if (this.isImminent(danger, before, x, player.vx)) {
          this.intent = `jumping a ${danger.kind}`;
          this.lastTap.jump = this.stepIndex;
          return { move: 0, jump: true, attack: false, interact: false };
        }
      }
    }

    const zones = seen.threats.filter(threat => !threat.jumpable);
    const area = mergedZoneAt(zones, x);
    if (!area) return undefined;
    const left = area.minX - ESCAPE_MARGIN;
    const right = area.maxX + ESCAPE_MARGIN;
    const canLeft = left >= HAUNTED_PLAYER_BOUNDS.minX;
    const canRight = right <= HAUNTED_PLAYER_BOUNDS.maxX;
    let direction: -1 | 1 | undefined;
    if (canLeft && canRight) {
      direction = x - left <= right - x ? -1 : 1;
      // Never run through a visible danger, or through where a threat starts (a smaller warning
      // inside a larger one of the same threat, e.g. the pendulum bob dropping at one end).
      const edge = direction === -1 ? left : right;
      const blocking = zones.some(zone => (zone.phase === 'danger' || isOrigin(zone, zones)) && isBetween((zone.minX + zone.maxX) / 2, x, edge));
      if (blocking) direction = direction === -1 ? 1 : -1;
    } else if (canLeft) {
      direction = -1;
    } else if (canRight) {
      direction = 1;
    }
    this.intent = `escaping a ${zones.find(zone => x >= zone.minX && x <= zone.maxX)?.kind ?? 'threat'} zone`;
    return direction === undefined ? IDLE_ACTION : this.walk(direction);
  }

  /** A floor wave seen approaching close enough (in time) that jumping now clears it; own motion counts. */
  private isImminent(danger: ThreatObservation, before: Frame | undefined, x: number, ownVx: number): boolean {
    const center = (danger.minX + danger.maxX) / 2;
    const half = (danger.maxX - danger.minX) / 2;
    const distance = center - x;
    if (Math.abs(distance) <= half + 1) return true;
    const previous = before?.threats
      .filter(threat => threat.kind === danger.kind && threat.phase === 'danger')
      .map(threat => (threat.minX + threat.maxX) / 2)
      .filter(prevCenter => Math.abs(prevCenter - center) <= 12)
      .sort((a, b) => Math.abs(a - center) - Math.abs(b - center))[0];
    if (previous === undefined) return Math.abs(distance) <= 16;
    const closing = (center - previous) / STEP_S - ownVx;
    if (closing === 0 || Math.sign(closing) === Math.sign(distance)) return false;
    return (Math.abs(distance) - half) / Math.abs(closing) <= JUMP_LEAD_S;
  }

  private reactToGhosts(world: BotWorld, seen: Frame): BotAction | undefined {
    const x = world.session.player.x;
    const ghosts = seen.ghosts.filter(ghost => ghost.phase !== 'dying' && Math.abs(ghost.x - x) <= GHOST_FIGHT_RANGE);
    if (ghosts.length === 0) return undefined;
    const target = ghosts.reduce((best, ghost) => (Math.abs(ghost.x - x) < Math.abs(best.x - x) ? ghost : best));
    this.intent = `shooting a ghost@${Math.round(target.x)}`;
    return this.aimAndFire(world, target.x);
  }

  private wouldEnterZone(world: BotWorld, seen: Frame, action: BotAction): boolean {
    const x = world.session.player.x;
    const direction = this.inverted ? -action.move : action.move;
    const ahead = x + direction * ENTRY_LOOKAHEAD;
    const zones = seen.threats.filter(threat => !threat.jumpable);
    return zones.some(zone => ahead >= zone.minX - 1 && ahead <= zone.maxX + 1 && !(x >= zone.minX - 1 && x <= zone.maxX + 1));
  }

  private explorationGoal(world: BotWorld): HumanGoal | undefined {
    const combat = this.combatGoal(world);
    if (combat) return combat;
    let goal = this.planner.nextInteraction(world);
    // Standing exactly on an object's spot while another object wins there: skip it (effects only;
    // exits are never skipped, so an unreachable exit surfaces as a stall instead of a silent loop).
    for (let guard = 0; guard < 32 && goal?.interactionId && this.isShadowed(world, goal); guard += 1) {
      this.planner.markShadowed(world.adventure, goal.interactionId);
      goal = this.planner.nextInteraction(world);
    }
    const boss = activeRoomBoss(world.adventure);
    if (!goal && boss) return { x: roomBossFiringSpot(boss), label: `await ${boss.name}` };
    return goal;
  }

  private isShadowed(world: BotWorld, goal: HumanGoal): boolean {
    const player = world.session.player;
    if (Math.abs(goal.x - player.x) > SHADOW_DISTANCE || Math.abs(player.vx) > 1 || !player.grounded) return false;
    const definition = findActiveRoom(world.adventure.currentRoom)?.interactions.find(interaction => interaction.id === goal.interactionId);
    return definition?.behavior.type === 'effect' && !interactsWith(world, goal);
  }

  private bedroomGoal(world: BotWorld): HumanGoal | undefined {
    const { domestic, objective } = world.session;
    if (objective.phase === 'escape-ready') return { x: clampX(HAUNTED_EXIT.x), label: 'bedroom:exit', domestic: 'exit' };
    if (objective.phase !== 'prepare') return undefined;
    const objectId: SystemicObjectId = domestic.wallyState === 'sleepy'
      ? 'bed'
      : !domestic.flags.dressed
        ? 'wardrobe'
        : 'keys';
    return { x: getSystemicObject(objectId).x, label: `bedroom:${objectId}`, domestic: objectId };
  }

  /** Fixed firing spot per target: kept until the target changes or a seen threat zone covers it. */
  private combatGoal(world: BotWorld): HumanGoal | undefined {
    const targets = combatTargets(world);
    if (targets.length === 0) {
      this.firing = undefined;
      return undefined;
    }
    const x = world.session.player.x;
    const boss = activeRoomBoss(world.adventure);
    if (boss) {
      const key = `${phaseKey(world)}:boss`;
      if (!this.firing || this.firing.key !== key) this.firing = { key, x: roomBossFiringSpot(boss) };
      return { x: this.firing.x, aimX: targets[0], label: `fight ${boss.name} from ${Math.round(this.firing.x)}` };
    }
    const twin = isBathroomTwinActive(world.adventure);
    const target = twin ? targets[0] : targets.reduce((best, t) => (Math.abs(t - x) < Math.abs(best - x) ? t : best));
    const key = `${phaseKey(world)}:${twin ? 'twin' : target}`;
    const zones = this.zoneMemory.get(phaseKey(world)) ?? [];
    const spotUnsafe = (spot: number) => zones.some(zone => spot >= zone.minX - SPOT_ZONE_MARGIN && spot <= zone.maxX + SPOT_ZONE_MARGIN);
    if (!this.firing || this.firing.key !== key || spotUnsafe(this.firing.x)) {
      this.firing = { key, x: twin ? this.twinSpot(x) : this.laboratorySpot(x, target, targets, spotUnsafe) };
    }
    const aimX = twin ? bathroomTwinX(this.firing.x) : target;
    return { x: this.firing.x, aimX, label: `fight target@${Math.round(aimX)} from ${Math.round(this.firing.x)}` };
  }

  private twinSpot(x: number): number {
    const zones = this.zoneMemory.get('bathroom') ?? [];
    const outside = zones.every(zone => x < zone.minX - MIN_FIRING_DISTANCE / 2 || x > zone.maxX + MIN_FIRING_DISTANCE / 2);
    if (outside) return Math.round(x);
    return x < 64 ? 50 : 78;
  }

  private laboratorySpot(x: number, target: number, targets: number[], unsafe: (spot: number) => boolean): number {
    let best: { x: number; score: number } | undefined;
    let fallback: { x: number; score: number } | undefined;
    for (let spot = HAUNTED_PLAYER_BOUNDS.minX; spot <= HAUNTED_PLAYER_BOUNDS.maxX; spot += 1) {
      if (Math.abs(spot - target) < MIN_FIRING_DISTANCE) continue;
      // A spark is consumed by the first live target it meets.
      if (targets.some(other => other !== target && isBetween(other, spot, target))) continue;
      const score = Math.abs(spot - x);
      if (!fallback || score < fallback.score) fallback = { x: spot, score };
      if (unsafe(spot)) continue;
      if (!best || score < best.score) best = { x: spot, score };
    }
    return (best ?? fallback)?.x ?? clampX(target - 28);
  }

  private pursue(world: BotWorld, goal: HumanGoal): Decision {
    const player = world.session.player;
    const latencyS = this.latencySteps * STEP_S;
    const stopX = player.x + player.vx * latencyS + Math.sign(player.vx) * (player.vx * player.vx) / (2 * HAUNTED_PLAYER_PHYSICS.friction);
    const dx = goal.x - stopX;
    // Once at a spot, small drifts (a turning tap, a knock) do not send Wally walking again.
    const key = `${goal.label}@${goal.x}`;
    const settled = this.arrivedAt === key && Math.abs(player.x - goal.x) <= LEAVE_DISTANCE;
    if (!settled && Math.abs(dx) > ARRIVE_DISTANCE) {
      this.arrivedAt = undefined;
      this.intent = `walking to ${goal.label}`;
      return { action: this.walk(dx < 0 ? -1 : 1) };
    }
    this.arrivedAt = key;
    if (Math.abs(player.vx) > 1) {
      this.intent = `stopping at ${goal.label}`;
      return { action: IDLE_ACTION };
    }
    if (goal.aimX !== undefined) {
      this.intent = `firing at ${goal.label}`;
      return { action: this.aimAndFire(world, goal.aimX) };
    }
    if (!this.canTap('interact', INTERACT_RETRY_MS)) {
      this.intent = `waiting at ${goal.label}`;
      return { action: IDLE_ACTION };
    }
    const ready = goal.domestic === 'exit'
      ? isAtHauntedExit(player.x)
      : goal.domestic !== undefined
        ? findSystemicObject(world.session.domestic.player.x)?.id === goal.domestic
        : interactsWith(world, goal);
    if (!ready) {
      // Another object wins here: shuffle onto the exact spot.
      if (Math.abs(goal.x - player.x) > SHADOW_DISTANCE) {
        this.intent = `edging onto ${goal.label}`;
        return { action: this.walk(goal.x < player.x ? -1 : 1) };
      }
      this.intent = `cannot reach ${goal.label} from here`;
      return { action: IDLE_ACTION };
    }
    this.intent = `using ${goal.label}`;
    this.lastTap.interact = this.stepIndex;
    return { action: { move: 0, jump: false, attack: false, interact: true }, goal };
  }

  /** Face the target with a single direction tap, then fire with rate-limited ATTACK taps. */
  private aimAndFire(world: BotWorld, targetX: number): BotAction {
    const player = world.session.player;
    const facing = player.facing === 'left' ? -1 : 1;
    const wanted: -1 | 1 = targetX < player.x ? -1 : targetX > player.x ? 1 : facing;
    if (facing !== wanted) {
      if (this.stepIndex < this.turnSettlesAt) return IDLE_ACTION;
      this.turnSettlesAt = this.stepIndex + this.latencySteps + 1;
      return this.walk(wanted);
    }
    if (this.stepIndex - this.lastTap.attack < this.nextTapGap) return IDLE_ACTION;
    // Repeated ATTACK taps are never metronomic: a fixed cadence can phase-lock with a boss cycle.
    this.lastTap.attack = this.stepIndex;
    const roll = nextSeededRandom(this.rngState);
    this.rngState = roll.state;
    this.nextTapGap = this.tapIntervalSteps + Math.floor(roll.value * (this.tapJitterSteps + 1));
    return { move: 0, jump: false, attack: true, interact: false };
  }

  private walk(direction: -1 | 1): BotAction {
    return move(this.inverted ? (direction === 1 ? -1 : 1) : direction);
  }

  private canTap(button: 'jump' | 'attack' | 'interact', intervalMs?: number): boolean {
    const interval = intervalMs === undefined ? this.tapIntervalSteps : steps(intervalMs);
    return this.stepIndex - this.lastTap[button] >= interval;
  }

  // -------------------------------------------------------------------------
  // Feedback a player gets from the screen

  /** A player expects left and right to swap while Wally stands in the Resonator's pulsing zone (seen late too). */
  private expectSwappedControls(world: BotWorld, seen: Frame | undefined): void {
    const x = world.session.player.x;
    const zone = seen?.distortion;
    this.inverted = zone !== undefined && x >= zone.minX && x <= zone.maxX;
  }

  /** Remembers static threat zones per room phase so firing spots avoid lanes already seen. */
  private remember(seen: Frame): void {
    if (!seen.phaseKey.startsWith('laboratory') && seen.phaseKey !== 'bathroom') return;
    const zones = this.zoneMemory.get(seen.phaseKey) ?? [];
    for (const threat of seen.threats) {
      if (threat.jumpable || zones.some(zone => zone.minX === threat.minX && zone.maxX === threat.maxX)) continue;
      zones.push({ minX: threat.minX, maxX: threat.maxX });
    }
    this.zoneMemory.set(seen.phaseKey, zones);
  }

  private onApplied(world: BotWorld, decision: Decision): void {
    const { action, goal } = decision;
    const player = world.session.player;
    if (!action.interact || !goal) return;

    if (goal.domestic !== undefined) {
      if (goal.domestic !== 'exit' && findSystemicObject(world.session.domestic.player.x)?.id === goal.domestic) {
        this.readingUntil = this.stepIndex + this.readSteps;
      }
      return;
    }
    if (!goal.interactionId) return;
    const target = findAdventureInteractionTarget(world.adventure, player.x);
    if (target?.id !== goal.interactionId) return;
    this.planner.markAttempted(world.adventure, goal.interactionId);
    const used = findActiveRoom(world.adventure.currentRoom)?.interactions.find(interaction => interaction.id === goal.interactionId);
    if (used?.behavior.type === 'effect') this.readingUntil = this.stepIndex + this.readSteps;
  }
}

/** Does nothing at all: measures how long a player who only reads the screen survives. */
export class IdleBot implements BotPolicy {
  act(): BotAction {
    return IDLE_ACTION;
  }

  describe(): string {
    return 'idle';
  }
}

/**
 * Worst case for contact damage in the haunted bedroom: walks straight into the
 * nearest Ghost that can hurt (else the nearest one) and never shoots, jumps
 * or uses an object. Measures how fast touching Ghosts alone can take every heart.
 */
export class GhostHuggerBot implements BotPolicy {
  act(world: BotWorld): BotAction {
    if (isAdventureExplorationActive(world.adventure)) return IDLE_ACTION;
    const { player, threats, elapsedMs } = world.session;
    const active = threats.ghosts.filter(ghost => ghost.phase === 'active');
    const dangerous = active.filter(ghost => isGhostDangerous(ghost, elapsedMs));
    const candidates = dangerous.length > 0 ? dangerous : active;
    if (candidates.length === 0) return IDLE_ACTION;
    const target = candidates.reduce((best, ghost) => (Math.abs(ghost.x - player.x) < Math.abs(best.x - player.x) ? ghost : best));
    const dx = target.x - player.x;
    return Math.abs(dx) < 1 ? IDLE_ACTION : { move: dx > 0 ? 1 : -1, jump: false, attack: false, interact: false };
  }

  describe(): string {
    return 'walking into the nearest ghost';
  }
}

/** One thumb: a tap releases the held direction, and only one button is tapped per step. */
export function oneThumb(action: BotAction): BotAction {
  if (action.jump) return { move: 0, jump: true, attack: false, interact: false };
  if (action.attack) return { move: 0, jump: false, attack: true, interact: false };
  if (action.interact) return { move: 0, jump: false, attack: false, interact: true };
  return action;
}

/** A warning strictly inside a larger warning of the same threat marks where that threat starts. */
function isOrigin(zone: ThreatObservation, zones: readonly ThreatObservation[]): boolean {
  return zone.phase === 'warning' && zones.some(other =>
    other !== zone
    && other.kind === zone.kind
    && other.phase === 'warning'
    && other.minX <= zone.minX
    && other.maxX >= zone.maxX
    && other.maxX - other.minX > zone.maxX - zone.minX);
}

function isBetween(value: number, a: number, b: number): boolean {
  return (value - a) * (value - b) < 0;
}

/** The union of overlapping zones that contains x, if any. */
function mergedZoneAt(zones: readonly Zone[], x: number): Zone | undefined {
  const sorted = [...zones].sort((a, b) => a.minX - b.minX);
  let current: Zone | undefined;
  for (const zone of sorted) {
    if (current && zone.minX <= current.maxX) {
      current = { minX: current.minX, maxX: Math.max(current.maxX, zone.maxX) };
      continue;
    }
    if (current && x >= current.minX && x <= current.maxX) return current;
    current = { minX: zone.minX, maxX: zone.maxX };
  }
  return current && x >= current.minX && x <= current.maxX ? current : undefined;
}
