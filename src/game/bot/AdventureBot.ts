/**
 * Headless QA bot for the adventure.
 *
 * The harness mirrors the App.tsx orchestration (the haunted bedroom run and
 * its false escape, fixed exploration steps, room transitions, first-visit
 * recovery, room spawn, Laboratory checkpoint retry and ending completion) so
 * policies can play the real pure-TypeScript runtime without a device. Keep
 * `stepBotWorld` in sync with App.tsx when that orchestration changes; the bot
 * never mutates gameplay rules.
 */
import { restoreRoomCheckpointState, shouldUseRoomCheckpoint } from '../adventure/RoomCheckpoint';
import {
  applyFalseEscape,
  applyFirstVisitRecovery,
  findAdventureInteractionTarget,
  isAdventureExplorationActive,
  isLaboratoryCombatEnabled,
  stepAdventureExploration,
  type AdventureExplorationEvent,
} from '../adventure/AdventureExplorationRuntime';
import { createAdventureGameSession } from '../adventure/AdventureGameSession';
import {
  beginAdventureEnding,
  completeAdventureEnding,
  getAdventureEndingPhase,
  shouldBeginAdventureEnding,
} from '../adventure/AdventureEnding';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../adventure/AdventureSessionCodec';
import { createAdventureState, getRoomState, type AdventureState, type RoomId } from '../adventure/AdventureState';
import { bathroomTwinX, isBathroomTwinActive } from '../adventure/BathroomTwinHazard';
import { activeRoomBoss, isRoomBossLive, resolveRoomBoss, roomBossFor, type RoomBossConfig } from '../adventure/RoomBossHazard';
import {
  getLaboratoryEncounterPhase,
  shouldUseLaboratoryCheckpoint,
} from '../adventure/LaboratoryEncounter';
import {
  isResonatorWeakPointDisabled,
  RESONATOR_ELECTRICAL_LANES,
  RESONATOR_WEAK_POINTS,
} from '../adventure/LaboratoryResonatorInstability';
import {
  isVesperControlDeviceDisabled,
  VESPER_CONTROL_DEVICES,
  VESPER_PRESSURE_LANES,
} from '../adventure/LaboratoryVesperControl';
import { VESPER_NIGHTMARE_HAZARDS, VESPER_NIGHTMARE_TARGET } from '../adventure/LaboratoryVesperNightmare';
import {
  ACTIVE_ROOM_IDS,
  findActiveRoom,
  getRoomExit,
  isRoomInteractionAvailable,
  transitionAdventure,
  type RoomEntryPoint,
  type RoomInteractionDefinition,
} from '../adventure/RoomRegistry';
import { isInsideObservedDanger, observeRoomThreats, type ThreatKind } from '../adventure/RoomThreatObservation';
import { PLAYER_GROUND_Y } from '../core/World';
import { HAUNTED_STEP_MS } from '../haunted/FixedStepClock';
import { createHauntedInputState, type HauntedInputState } from '../haunted/HauntedInput';
import {
  createHauntedSession,
  stepHauntedSession,
  type HauntedSessionEvent,
  type HauntedSessionState,
} from '../haunted/HauntedSessionRuntime';
import { findSystemicObject } from '../systemic/SystemicContent';
import { HAUNTED_PLAYER_BOUNDS } from '../haunted/PlayerPhysics';
import { nextSeededRandom, seedFromString } from '../haunted/SeededRng';

export const BOT_STEP_MS = HAUNTED_STEP_MS;

export type BotWorld = { session: HauntedSessionState; adventure: AdventureState };
export type BotAction = { move: -1 | 0 | 1; jump: boolean; attack: boolean; interact: boolean };
export type BotStepOutcome = 'running' | 'escaped' | 'transition' | 'ending-started' | 'checkpoint' | 'died' | 'completed';
export type BotEvent = AdventureExplorationEvent | HauntedSessionEvent;
export type BotStep = {
  world: BotWorld;
  events: BotEvent[];
  outcome: BotStepOutcome;
  hpLost: number;
  /** World straight after the pure simulation step, before the App-level orchestration reacted to it. */
  simulated: BotWorld;
};

export interface BotPolicy {
  act(world: BotWorld): BotAction;
  /** Short description of the current intent, used in failure diagnostics. */
  describe(): string;
  /** False once the policy has no reachable goal left (route bots only). */
  hasGoal?(): boolean;
  /** True while the policy reads an object's text (human-model bots count the moment to look up too). */
  isReading?(): boolean;
}

export const IDLE_ACTION: BotAction = { move: 0, jump: false, attack: false, interact: false };

/** A new game exactly as App.handleNewGame creates it: the haunted bedroom run is about to start. */
export function createBotNewGame(runId = 'qa-bot'): BotWorld {
  const created = createAdventureGameSession(runId);
  return { session: created.haunted, adventure: created.adventure };
}

/** Bedroom run already escaped: the adventure starts exactly where App applies the false escape. */
export function createBotStart(runId = 'qa-bot'): BotWorld {
  const base = createHauntedSession(runId);
  const completed: HauntedSessionState = {
    ...base,
    domestic: {
      ...base.domestic,
      wallyState: 'normal',
      flags: { ...base.domestic.flags, dressed: true },
      collected: ['keys'],
      objectStates: { ...base.domestic.objectStates, wardrobe: 'used', keys: 'collected' },
      interactionCounts: { ...base.domestic.interactionCounts, wardrobe: 1, keys: 1 },
    },
    objective: { phase: 'completed' },
  };
  const escaped = applyFalseEscape(completed, createAdventureState());
  return { session: escaped.session, adventure: escaped.adventure };
}

export function toInput(action: BotAction): HauntedInputState {
  return {
    ...createHauntedInputState(),
    left: action.move < 0,
    right: action.move > 0,
    jumpPressed: action.jump,
    attackPressed: action.attack,
    interactPressed: action.interact,
  };
}

/** Mirrors App.applyRoomSpawn. */
function applyRoomSpawn(state: HauntedSessionState, spawn: RoomEntryPoint): HauntedSessionState {
  return {
    ...state,
    player: { ...state.player, x: spawn.x, y: spawn.y, vx: 0, vy: 0, grounded: true, facing: spawn.facing },
    domestic: { ...state.domestic, player: { x: Math.round(spawn.x), facing: spawn.facing } },
    input: createHauntedInputState(),
  };
}

/** Mirrors App's bedroom loop: the haunted run steps until it completes (false escape) or fails. */
function stepHauntedBedroom(world: BotWorld, action: BotAction): BotStep {
  if (world.adventure.currentRoom !== 'bedroom') {
    return { world, events: [], outcome: 'running', hpLost: 0, simulated: world };
  }
  const stepped = stepHauntedSession({ ...world.session, input: toInput(action) }, BOT_STEP_MS);
  const events = stepped.events;
  const simulated = { session: stepped.state, adventure: world.adventure };
  const hpLost = Math.max(0, world.session.combat.hp - stepped.state.combat.hp);
  if (events.some(event => event.type === 'SESSION_COMPLETED')) {
    // App fades out, then applies the false escape at the fade midpoint.
    const escaped = applyFalseEscape(stepped.state, world.adventure);
    return { world: { session: escaped.session, adventure: escaped.adventure }, events, outcome: 'escaped', hpLost, simulated };
  }
  if (events.some(event => event.type === 'SESSION_FAILED')) {
    return { world: simulated, events, outcome: 'died', hpLost, simulated };
  }
  return { world: simulated, events, outcome: 'running', hpLost, simulated };
}

/** One fixed simulation step plus the App-level orchestration that reacts to it. */
export function stepBotWorld(world: BotWorld, action: BotAction): BotStep {
  if (!isAdventureExplorationActive(world.adventure)) return stepHauntedBedroom(world, action);

  const stepped = stepAdventureExploration({ ...world.session, input: toInput(action) }, world.adventure, BOT_STEP_MS);
  const events = stepped.events;
  const simulated = { session: stepped.session, adventure: stepped.adventure };
  const hpLost = Math.max(0, world.session.combat.hp - stepped.session.combat.hp);

  if (shouldBeginAdventureEnding(stepped.adventure)) {
    const started = beginAdventureEnding(stepped.session, stepped.adventure);
    return { world: { session: started.session, adventure: started.adventure }, events, outcome: 'ending-started', hpLost, simulated };
  }

  const transition = events.find(
    (event): event is Extract<AdventureExplorationEvent, { type: 'ROOM_TRANSITION_REQUESTED' }> =>
      event.type === 'ROOM_TRANSITION_REQUESTED',
  );
  if (transition) {
    const result = transitionAdventure(stepped.adventure, transition.targetRoom, transition.targetEntry);
    if (result.status !== 'ok') throw new Error(`Bot transition rejected: ${result.reason}`);
    const spawned = applyRoomSpawn(
      applyFirstVisitRecovery(stepped.session, stepped.adventure, transition.targetRoom),
      result.spawn,
    );
    return { world: { session: spawned, adventure: result.state }, events, outcome: 'transition', hpLost, simulated };
  }

  if (world.session.objective.phase !== 'failed' && stepped.session.objective.phase === 'failed') {
    if (shouldUseLaboratoryCheckpoint(stepped.adventure) || shouldUseRoomCheckpoint(stepped.session, stepped.adventure)) {
      // App shows the failure and waits for RETRY PHASE / RETRY ROOM; the bot retries at once.
      const restored = restoreRoomCheckpointState(stepped.session, stepped.adventure);
      return { world: restored, events, outcome: 'checkpoint', hpLost, simulated };
    }
    return { world: simulated, events, outcome: 'died', hpLost, simulated };
  }

  if (getAdventureEndingPhase(stepped.adventure) === 'ghost-sting') {
    // App shows the finish control at this phase; the bot presses it immediately.
    return {
      world: { session: stepped.session, adventure: completeAdventureEnding(stepped.adventure) },
      events,
      outcome: 'completed',
      hpLost,
      simulated,
    };
  }

  return { world: simulated, events, outcome: 'running', hpLost, simulated };
}

/** Exploration hit events and the observed threat zone each one must come from. */
const HIT_EVENT_THREATS: Partial<Record<BotEvent['type'], ThreatKind>> = {
  LIVING_ROOM_STATIC_HIT: 'living-room-static',
  KITCHEN_SURGE_HIT: 'kitchen-surge',
  ATTIC_CRATE_HIT: 'attic-crate',
  BASEMENT_DISCHARGE_HIT: 'basement-discharge',
  BATHROOM_TWIN_CONTACT_HIT: 'bathroom-twin',
  ROOM_BOSS_CONTACT_HIT: 'room-boss',
  LABORATORY_VESPER_PULSE_HIT: 'vesper-pressure',
  LABORATORY_RESONATOR_SURGE_HIT: 'resonator-electrical',
  LABORATORY_NIGHTMARE_ATTACK_HIT: 'nightmare-attack',
};

/** Wally is standing still at a usable object (where a player stops to read its text). */
export function isStandingAtObject(world: BotWorld): boolean {
  const { player } = world.session;
  if (!player.grounded || Math.abs(player.vx) > 1) return false;
  if (!isAdventureExplorationActive(world.adventure)) return findSystemicObject(world.session.domestic.player.x) !== undefined;
  return findAdventureInteractionTarget(world.adventure, player.x)?.behavior.type === 'effect';
}

/** Gameplay invariants every step must respect, whatever the policy does. */
export function checkBotInvariants(previous: BotWorld, step: BotStep): string[] {
  const violations: string[] = [];
  const { session, adventure } = step.world;
  const { hp, maxHp } = session.combat;
  const { x, y } = session.player;

  if (!Number.isInteger(hp) || hp < 0 || hp > maxHp) violations.push(`HP out of range: ${hp}/${maxHp}`);
  if (!Number.isFinite(x) || !Number.isFinite(y)) violations.push(`non-finite player position (${x}, ${y})`);
  if (x < HAUNTED_PLAYER_BOUNDS.minX || x > HAUNTED_PLAYER_BOUNDS.maxX) violations.push(`player x out of bounds: ${x}`);
  if (y > PLAYER_GROUND_Y + 0.001) violations.push(`player below the floor: ${y}`);
  if (!(ACTIVE_ROOM_IDS as readonly RoomId[]).includes(adventure.currentRoom)) {
    violations.push(`inactive room: ${adventure.currentRoom}`);
  }

  const exploring = isAdventureExplorationActive(previous.adventure);
  if (step.outcome === 'died') {
    const reason = session.objective.phase === 'failed' ? session.objective.reason : undefined;
    // The haunted bedroom run can also fail by noise, exhaustion or deadline; exploration only by HP.
    const allowed = exploring ? reason === 'haunted' : reason !== undefined;
    if (!allowed) violations.push(`unexpected failure objective: ${JSON.stringify(session.objective)}`);
    if (reason === 'haunted' && hp !== 0) violations.push(`run failed with ${hp} HP`);
  } else if (session.objective.phase === 'failed') {
    violations.push(`objective failed without a terminal outcome (${step.outcome})`);
  } else if (hp === 0) {
    violations.push(`0 HP without failing (${step.outcome})`);
  }

  if (step.outcome === 'running' && session.elapsedMs < previous.session.elapsedMs) {
    violations.push(`game clock went backwards: ${previous.session.elapsedMs} -> ${session.elapsedMs}`);
  }

  if (exploring) {
    // Every exploration hit must come from a threat zone the player can see (RoomThreatObservation).
    const observations = observeRoomThreats(step.simulated.session, step.simulated.adventure);
    const hitX = step.simulated.session.player.x;
    let explained = false;
    for (const event of step.events) {
      const kind = HIT_EVENT_THREATS[event.type];
      if (!kind) continue;
      explained = true;
      if (!isInsideObservedDanger(observations, hitX, true, kind)) {
        violations.push(`${event.type} at x=${hitX.toFixed(2)} outside every observed ${kind} danger zone`);
      }
    }
    if (step.hpLost > 0 && !explained) violations.push(`lost ${step.hpLost} HP in exploration without a threat hit event`);
  }

  if (step.outcome === 'escaped' || step.outcome === 'transition' || step.outcome === 'ending-started' || step.outcome === 'checkpoint') {
    const encoded = encodeAdventureGameSession({ schemaVersion: 3, haunted: session, adventure });
    const decoded = decodeAdventureGameSession(encoded);
    if (decoded.status !== 'ok') {
      violations.push(`save does not decode after ${step.outcome}: ${JSON.stringify(decoded)}`);
    } else if (encodeAdventureGameSession(decoded.state) !== encoded) {
      violations.push(`save round trip is not stable after ${step.outcome}`);
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Runner

export type BotRoomStats = { timeMs: number; hits: number; deaths: number; hitsAtObjects: number };

export type BotRunResult = {
  outcome: 'completed' | 'died' | 'stuck' | 'timeout';
  diagnostic: string;
  world: BotWorld;
  gameTimeMs: number;
  hits: number;
  deaths: number;
  /** Hits taken while Wally stood still at a usable object (isStandingAtObject) or the policy was reading. */
  hitsAtObjects: number;
  /** Game time of every heart lost, in order. */
  hitTimesMs: number[];
  rooms: Partial<Record<RoomId, BotRoomStats>>;
  /** World snapshot at the first entry into each room (route runs seed fuzz runs from these). */
  roomEntries: Partial<Record<RoomId, BotWorld>>;
  violations: string[];
};

export type BotRunOptions = {
  maxGameMs: number;
  /** Fail as stuck when the adventure state does not change for this long. */
  stallMs?: number;
  /** End the run (outcome 'completed') as soon as Wally leaves the starting room. */
  stopOnRoomExit?: boolean;
};

function progressSignature(world: BotWorld): string {
  const { adventure, session } = world;
  // Domestic progress only changes during the haunted bedroom run.
  const domestic = [session.objective.phase, session.domestic.objectStates, session.domestic.wallyState];
  return JSON.stringify([adventure.currentRoom, adventure.storyFlags, adventure.rooms, domestic]);
}

function describeWorld(world: BotWorld): string {
  const { player, combat } = world.session;
  return `room=${world.adventure.currentRoom} x=${player.x.toFixed(1)} hp=${combat.hp}/${combat.maxHp}`;
}

export function runBot(start: BotWorld, policy: BotPolicy, options: BotRunOptions): BotRunResult {
  let world = start;
  let gameTimeMs = 0;
  let hits = 0;
  let deaths = 0;
  let hitsAtObjects = 0;
  const hitTimesMs: number[] = [];
  const rooms: Partial<Record<RoomId, BotRoomStats>> = {};
  const roomEntries: Partial<Record<RoomId, BotWorld>> = { [start.adventure.currentRoom]: start };
  const violations: string[] = [];
  let signature = progressSignature(world);
  let lastProgressMs = 0;

  const finish = (outcome: BotRunResult['outcome'], diagnostic: string): BotRunResult => ({
    outcome,
    diagnostic,
    world,
    gameTimeMs,
    hits,
    deaths,
    hitsAtObjects,
    hitTimesMs,
    rooms,
    roomEntries,
    violations,
  });

  while (gameTimeMs < options.maxGameMs) {
    if (policy.hasGoal && !policy.hasGoal()) {
      return finish('stuck', `no reachable goal left (${describeWorld(world)}; ${policy.describe()})`);
    }
    const room = world.adventure.currentRoom;
    const stats = (rooms[room] ??= { timeMs: 0, hits: 0, deaths: 0, hitsAtObjects: 0 });
    const action = policy.act(world);
    // In a room boss fight Wally stands still to shoot, often beside an object:
    // only actual reading counts there.
    const bossFight = resolveRoomBoss(world.adventure, world.session.elapsedMs) !== undefined;
    const atObject = (!bossFight && isStandingAtObject(world)) || policy.isReading?.() === true;
    const step = stepBotWorld(world, action);
    for (const violation of checkBotInvariants(world, step)) {
      if (violations.length < 20) violations.push(`${violation} (${describeWorld(step.world)} t=${Math.round(gameTimeMs)}ms)`);
    }

    gameTimeMs += BOT_STEP_MS;
    stats.timeMs += BOT_STEP_MS;
    if (step.hpLost > 0) {
      hits += step.hpLost;
      stats.hits += step.hpLost;
      for (let index = 0; index < step.hpLost; index += 1) hitTimesMs.push(gameTimeMs);
      if (atObject) {
        hitsAtObjects += step.hpLost;
        stats.hitsAtObjects += step.hpLost;
      }
    }
    world = step.world;

    if (step.outcome === 'checkpoint' || step.outcome === 'died') {
      deaths += 1;
      stats.deaths += 1;
    }
    if (step.outcome === 'died') {
      const reason = world.session.objective.phase === 'failed' ? world.session.objective.reason : 'unknown';
      return finish('died', `died: ${reason} (${describeWorld(world)}; ${policy.describe()})`);
    }
    if (step.outcome === 'completed') return finish('completed', `ending complete (${describeWorld(world)})`);
    if (step.outcome === 'escaped' && options.stopOnRoomExit) return finish('completed', `escaped the haunted bedroom (${describeWorld(world)})`);
    if (step.outcome === 'transition' || step.outcome === 'ending-started') {
      if (options.stopOnRoomExit) return finish('completed', `left ${room} (${describeWorld(world)})`);
      roomEntries[world.adventure.currentRoom] ??= world;
    }

    const nextSignature = progressSignature(world);
    if (nextSignature !== signature) {
      signature = nextSignature;
      lastProgressMs = gameTimeMs;
    } else if (options.stallMs !== undefined && gameTimeMs - lastProgressMs > options.stallMs) {
      return finish('stuck', `no progress for ${options.stallMs}ms (${describeWorld(world)}; ${policy.describe()})`);
    }
  }
  return finish('timeout', `time budget spent (${describeWorld(world)}; ${policy.describe()})`);
}

// ---------------------------------------------------------------------------
// Route bot: explores every available interaction and dodges with lookahead.

export type Goal = { x: number; label: string; interactionId?: string; aimX?: number };

const DECISION_STEPS = 3;
export const ARRIVE_DISTANCE = 2.5;
const FIRING_DISTANCE = 28;
const FIRING_DISTANCES = [16, 22, FIRING_DISTANCE] as const;
const CONTINUATIONS = ['goal', 'idle', 'hold'] as const;
/**
 * Lookahead used for navigation (does walking approach the goal?). It is the
 * same for every bot; only damage inside `reactionMs` counts as seen danger.
 */
const NAVIGATION_STEPS = 24;

export function clampX(x: number): number {
  return Math.min(HAUNTED_PLAYER_BOUNDS.maxX, Math.max(HAUNTED_PLAYER_BOUNDS.minX, x));
}

function isVisible(adventure: AdventureState, roomId: RoomId, interaction: RoomInteractionDefinition): boolean {
  if (!isRoomInteractionAvailable(adventure, roomId, interaction)) return false;
  const hiddenBy = interaction.hiddenWhenRoomSwitch;
  return !hiddenBy || getRoomState(adventure, roomId).switches[hiddenBy] !== true;
}

function roomSignature(adventure: AdventureState, roomId: RoomId, human = false): string {
  const room = adventure.rooms[roomId] ?? null;
  if (!human || !room) return JSON.stringify([adventure.storyFlags, room]);
  // A hazard arming its clock ('*-armed'), a room boss fight ('*-boss-*') or which object was looked at
  // last ('*-focused') is not news a player would re-read objects for.
  const interactions = room.interactions.filter(interaction => !interaction.endsWith('-armed') && !interaction.includes('-boss-'));
  const switches = Object.fromEntries(Object.entries(room.switches).filter(([id]) => !id.endsWith('-focused')));
  return JSON.stringify([adventure.storyFlags, { ...room, interactions, switches }]);
}

/**
 * Where to stand against a room boss: beyond the reach of the Moth's flight or
 * the Wraith's blink spots (any spark fired across their range meets them), by
 * the bedroom door against the Cuckoo too (its landing leans toward Wally, so a
 * wounded one hops into pecking range), and between the microwave and the
 * breaker against the Roach, which has no safe spot and must be jumped.
 */
export function roomBossFiringSpot(boss: RoomBossConfig): number {
  // The Moth rises by the Living Room door and the Wraith's first blink is
  // left of the television: each spot lies away from where the boss starts.
  if (boss.kind === 'moth' || boss.kind === 'cuckoo') return 12;
  if (boss.kind === 'wraith') return 114;
  return 86;
}

/** Dream Spark targets currently on stage; empty outside the twin, room boss and Laboratory fights. */
export function combatTargets(world: BotWorld): number[] {
  const { adventure, session } = world;
  if (isBathroomTwinActive(adventure)) return [bathroomTwinX(session.player.x)];
  // A rising boss cannot be hit yet: finish reading the object that woke it first.
  const boss = resolveRoomBoss(adventure, session.elapsedMs, session.player.x);
  if (boss) return boss.pose === 'rise' ? [] : [boss.x];
  if (adventure.currentRoom !== 'laboratory' || !isLaboratoryCombatEnabled(adventure)) return [];
  const phase = getLaboratoryEncounterPhase(adventure);
  if (phase === 'vesper-control') {
    return Object.values(VESPER_CONTROL_DEVICES)
      .filter(device => !isVesperControlDeviceDisabled(adventure, device.id))
      .map(device => device.x);
  }
  if (phase === 'resonator') {
    return Object.values(RESONATOR_WEAK_POINTS)
      .filter(node => !isResonatorWeakPointDisabled(adventure, node.id))
      .map(node => node.x);
  }
  if (phase === 'nightmare') return [VESPER_NIGHTMARE_TARGET.x];
  return [];
}

function laboratoryLanes(adventure: AdventureState): readonly { minX: number; maxX: number }[] {
  if (adventure.currentRoom !== 'laboratory') return [];
  const phase = getLaboratoryEncounterPhase(adventure);
  if (phase === 'vesper-control') return Object.values(VESPER_PRESSURE_LANES);
  if (phase === 'resonator') return Object.values(RESONATOR_ELECTRICAL_LANES);
  return [];
}

function facingDirection(world: BotWorld): -1 | 1 {
  return world.session.player.facing === 'left' ? -1 : 1;
}

function goalAction(world: BotWorld, goal: Goal): BotAction {
  const playerX = world.session.player.x;
  const dx = goal.x - playerX;
  const aimDirection: -1 | 1 | undefined = goal.aimX === undefined ? undefined : goal.aimX < playerX ? -1 : 1;
  const aimed = aimDirection !== undefined && aimDirection === facingDirection(world);

  if (Math.abs(dx) > ARRIVE_DISTANCE) {
    const move = dx < 0 ? -1 : 1;
    return { move, jump: false, attack: aimed && move === aimDirection, interact: interactsWith(world, goal) };
  }
  if (aimDirection !== undefined && !aimed) return { move: turningMove(world, aimDirection), jump: false, attack: false, interact: false };
  return { move: 0, jump: false, attack: aimed, interact: interactsWith(world, goal) };
}

/** The tap that actually turns Wally toward the target (controls may be inverted by the resonator). */
function turningMove(world: BotWorld, aimDirection: -1 | 1): -1 | 1 {
  for (const move of [aimDirection, aimDirection === 1 ? -1 : 1] as const) {
    const input = toInput({ move, jump: false, attack: false, interact: false });
    const stepped = stepAdventureExploration({ ...world.session, input }, world.adventure, BOT_STEP_MS);
    if ((stepped.session.player.facing === 'left' ? -1 : 1) === aimDirection) return move;
  }
  return aimDirection;
}

export function interactsWith(world: BotWorld, goal: Goal): boolean {
  if (!goal.interactionId) return false;
  return findAdventureInteractionTarget(world.adventure, world.session.player.x)?.id === goal.interactionId;
}

/**
 * Route knowledge shared by the route bot and the human-model bot: tries every
 * visible object once per room state, then walks to the nearest room that is
 * unvisited or has something untried.
 */
export class RoutePlanner {
  private readonly attempted = new Set<string>();
  /** `room|interaction` read at least once, whatever the room state was. */
  private readonly everAttempted = new Set<string>();
  /** Interactions reached but not selectable because another target wins at that spot. */
  readonly shadowed = new Set<string>();

  /**
   * Objects are retried whenever their room state changes. The `human` model
   * does not count hazard clocks, boss fights or object focus as such a change,
   * and heads for a newly opened room before walking back to re-read old ones.
   */
  constructor(private readonly human = false) {}

  private signature(adventure: AdventureState, roomId: RoomId): string {
    return roomSignature(adventure, roomId, this.human);
  }

  markAttempted(adventure: AdventureState, interactionId: string): void {
    const room = adventure.currentRoom;
    this.attempted.add(`${room}|${interactionId}|${this.signature(adventure, room)}`);
    this.everAttempted.add(`${room}|${interactionId}`);
  }

  markShadowed(adventure: AdventureState, interactionId: string): void {
    this.shadowed.add(`${adventure.currentRoom}:${interactionId}`);
    this.markAttempted(adventure, interactionId);
  }

  /** Nearest untried object in this room, else the first exit toward a room with something left to do. */
  nextInteraction(world: BotWorld): Goal | undefined {
    const { adventure, session } = world;
    const playerX = session.player.x;
    const room = adventure.currentRoom;
    // A player who has read everything here once takes a newly opened way forward first.
    const forward = this.human && this.untriedEffects(adventure, room).every(effect => this.everAttempted.has(`${room}|${effect.id}`))
      ? this.nextExit(adventure, true)
      : undefined;
    if (forward) return { x: clampX(forward.x), interactionId: forward.id, label: `${room}:${forward.id}` };
    const effects = this.untriedEffects(adventure, room)
      .sort((a, b) => Math.abs(a.x - playerX) - Math.abs(b.x - playerX));
    if (effects[0]) return { x: clampX(effects[0].x), interactionId: effects[0].id, label: `${room}:${effects[0].id}` };

    const exit = this.nextExit(adventure, false);
    if (exit) return { x: clampX(exit.x), interactionId: exit.id, label: `${room}:${exit.id}` };
    return undefined;
  }

  private untriedEffects(adventure: AdventureState, roomId: RoomId): RoomInteractionDefinition[] {
    const room = findActiveRoom(roomId);
    if (!room) return [];
    const signature = this.signature(adventure, roomId);
    return room.interactions.filter(interaction =>
      interaction.behavior.type === 'effect'
      && isVisible(adventure, roomId, interaction)
      && !this.attempted.has(`${roomId}|${interaction.id}|${signature}`));
  }

  /** Breadth-first search to the nearest room that is unvisited or (unless `unvisitedOnly`) has untried interactions. */
  private nextExit(adventure: AdventureState, unvisitedOnly: boolean): RoomInteractionDefinition | undefined {
    const start = adventure.currentRoom;
    const seen = new Set<RoomId>([start]);
    const queue: { room: RoomId; first?: RoomInteractionDefinition }[] = [{ room: start }];
    while (queue.length > 0) {
      const { room, first } = queue.shift()!;
      for (const interaction of findActiveRoom(room)?.interactions ?? []) {
        if (interaction.behavior.type !== 'exit' || !isVisible(adventure, room, interaction)) continue;
        const exit = getRoomExit(room, interaction.behavior.exitId);
        if (!exit || seen.has(exit.targetRoom)) continue;
        seen.add(exit.targetRoom);
        const firstHop = first ?? interaction;
        // A room whose boss is still awake is unfinished business too.
        const bossLeft = roomBossFor(exit.targetRoom);
        const wanted = !adventure.visitedRooms.includes(exit.targetRoom)
          || (!unvisitedOnly && this.untriedEffects(adventure, exit.targetRoom).length > 0)
          || (!unvisitedOnly && bossLeft !== undefined && isRoomBossLive(adventure, bossLeft.room));
        if (wanted) return firstHop;
        queue.push({ room: exit.targetRoom, first: firstHop });
      }
    }
    return undefined;
  }
}

/** Standing on the goal spot but the runtime resolves a different interaction there. */
export function isGoalShadowed(world: BotWorld, goal: Goal): boolean {
  const player = world.session.player;
  if (Math.abs(goal.x - player.x) > ARRIVE_DISTANCE || Math.abs(player.vx) > 1 || !player.grounded) return false;
  return !interactsWith(world, goal);
}

export class RouteBot implements BotPolicy {
  private readonly planner = new RoutePlanner();
  /** Interactions the bot reached but could not select because another target wins at that spot. */
  readonly shadowed = this.planner.shadowed;
  private readonly horizonSteps: number;
  private readonly readSteps: number;
  private reading: { x: number; stepsLeft: number; label: string } | undefined;
  private current: BotAction = IDLE_ACTION;
  private stepsUntilDecision = 0;
  private goal: Goal | undefined = { x: 0, label: 'start' };
  private firing: { key: string; target: number; x: number } | undefined;

  /**
   * `reactionMs` is how far ahead the bot sees danger; 0 never dodges.
   * `readMs` is how long it stays put after using an object, like a player
   * reading the reaction text (it still dodges and fights meanwhile).
   */
  constructor(reactionMs = 800, readMs = 1200) {
    this.horizonSteps = Math.round(reactionMs / BOT_STEP_MS);
    this.readSteps = Math.round(readMs / BOT_STEP_MS);
  }

  describe(): string {
    return `goal=${this.goal?.label ?? 'none'}`;
  }

  hasGoal(): boolean {
    return this.goal !== undefined;
  }

  act(world: BotWorld): BotAction {
    if (this.reading && --this.reading.stepsLeft <= 0) this.reading = undefined;
    if (this.stepsUntilDecision > 0) {
      this.stepsUntilDecision -= 1;
      return { ...this.current, jump: false, interact: false };
    }
    this.goal = this.resolveGoal(world);
    while (this.goal?.interactionId && isGoalShadowed(world, this.goal)) {
      this.planner.markShadowed(world.adventure, this.goal.interactionId);
      this.goal = this.resolveGoal(world);
    }
    if (!this.goal) return IDLE_ACTION;

    const action = this.choose(world, this.goal);
    if (action.interact && this.goal.interactionId) {
      const room = world.adventure.currentRoom;
      this.planner.markAttempted(world.adventure, this.goal.interactionId);
      const used = findActiveRoom(room)?.interactions.find(interaction => interaction.id === this.goal?.interactionId);
      if (used?.behavior.type === 'effect' && this.readSteps > 0) {
        this.reading = { x: world.session.player.x, stepsLeft: this.readSteps, label: `reading after ${used.id}` };
      }
    }
    this.current = action;
    this.stepsUntilDecision = DECISION_STEPS - 1;
    return action;
  }

  private resolveGoal(world: BotWorld): Goal | undefined {
    const playerX = world.session.player.x;
    const targets = combatTargets(world);
    if (targets.length > 0) {
      // Stick to the current target while it stands: a firing spot can lie nearer another target,
      // and re-picking the nearest one then flips between them without ever firing.
      const target = this.firing && targets.includes(this.firing.target)
        ? this.firing.target
        : targets.reduce((best, x) => (Math.abs(x - playerX) < Math.abs(best - playerX) ? x : best));
      // Keep one firing spot per target: recomputing the nearest spot every decision made Wally
      // oscillate between two equally near spots without ever turning to fire.
      const boss = activeRoomBoss(world.adventure);
      const key = isBathroomTwinActive(world.adventure)
        ? 'bathroom-twin'
        : boss ? `boss:${boss.kind}` : `${getLaboratoryEncounterPhase(world.adventure)}:${target}`;
      if (this.firing?.key !== key) this.firing = { key, target, x: this.firingPosition(world, target) };
      return { x: this.firing.x, aimX: target, label: `fight target@${Math.round(target)}` };
    }
    this.firing = undefined;

    if (this.reading) return { x: this.reading.x, label: this.reading.label };
    const goal = this.planner.nextInteraction(world);
    const boss = activeRoomBoss(world.adventure);
    if (!goal && boss) return { x: roomBossFiringSpot(boss), label: `await ${boss.name}` };
    return goal;
  }

  /** Nearest spot within spark range of the target, preferring spots outside the phase's hazard lanes. */
  private firingPosition(world: BotWorld, targetX: number): number {
    const playerX = world.session.player.x;
    if (isBathroomTwinActive(world.adventure)) return playerX < 64 ? 24 : 104;
    const boss = activeRoomBoss(world.adventure);
    if (boss) return roomBossFiringSpot(boss);
    // Every spot in range of the Nightmare lies in some attack lane. Just right
    // of the center rift Wally can fire through each recovery window; from
    // further left the rift's dodge walked him back with his back to the
    // target and the same window was missed every cycle.
    if (getLaboratoryEncounterPhase(world.adventure) === 'nightmare') return VESPER_NIGHTMARE_HAZARDS['center-rift'].maxX + 2;
    const lanes = laboratoryLanes(world.adventure);
    let best = { x: clampX(targetX - FIRING_DISTANCE), score: Number.POSITIVE_INFINITY };
    for (const distance of FIRING_DISTANCES) {
      for (const side of [-1, 1]) {
        const x = clampX(targetX + side * distance);
        if (Math.abs(x - targetX) < 12) continue;
        const inLane = lanes.some(lane => x >= lane.minX - 2 && x <= lane.maxX + 2);
        const score = Math.abs(x - playerX) + (inLane ? 40 : 0);
        if (score < best.score) best = { x, score };
      }
    }
    return best.x;
  }

  /**
   * Keeps the goal action unless the lookahead sees damage (dodging bots) or
   * sees that walking makes no progress (e.g. inverted controls), then picks
   * the best alternative by simulating each one.
   */
  private choose(world: BotWorld, goal: Goal): BotAction {
    const intended = goalAction(world, goal);
    const dodges = this.horizonSteps > 0;
    const horizon = Math.max(this.horizonSteps, NAVIGATION_STEPS);
    const direct = this.rollout(world, goal, intended, 'goal', horizon);
    const distance = Math.abs(world.session.player.x - goal.x);
    // Turning in place to aim is not walking, so only check progress while walking.
    const progressing = distance <= ARRIVE_DISTANCE || Math.abs(direct.finalX - goal.x) < distance - 0.5;
    if ((!dodges || direct.loss === 0) && progressing) return intended;

    const score = (result: { loss: number; finalX: number }, jump: boolean) =>
      (dodges ? result.loss * 1000 : 0) + Math.abs(result.finalX - goal.x) * 0.05 + (jump ? 0.2 : 0);
    let best = { action: intended, score: score(direct, false) };
    for (const move of [-1, 0, 1] as const) {
      for (const jump of [false, true]) {
        const candidate: BotAction = { move, jump, attack: false, interact: false };
        for (const continuation of CONTINUATIONS) {
          const candidateScore = score(this.rollout(world, goal, candidate, continuation, horizon), jump);
          if (candidateScore < best.score) best = { action: candidate, score: candidateScore };
        }
      }
    }
    const keepsAim = goal.aimX !== undefined && (best.action.move === 0 || best.action.move === facingDirection(world));
    return { ...best.action, attack: intended.attack && keepsAim };
  }

  private rollout(
    world: BotWorld,
    goal: Goal,
    first: BotAction,
    continuation: (typeof CONTINUATIONS)[number],
    horizon: number,
  ): { loss: number; finalX: number } {
    let session = world.session;
    let adventure = world.adventure;
    let loss = 0;
    for (let index = 0; index < horizon; index += 1) {
      let action: BotAction;
      if (index < DECISION_STEPS) action = { ...first, jump: first.jump && index === 0, attack: false, interact: false };
      else if (continuation === 'idle') action = IDLE_ACTION;
      else if (continuation === 'hold') action = { ...first, jump: false, attack: false, interact: false };
      else action = { ...goalAction({ session, adventure }, goal), attack: false, interact: false };

      const stepped = stepAdventureExploration({ ...session, input: toInput(action) }, adventure, BOT_STEP_MS);
      const seen = index < this.horizonSteps;
      if (seen) loss += Math.max(0, session.combat.hp - stepped.session.combat.hp);
      session = stepped.session;
      adventure = stepped.adventure;
      if (session.objective.phase === 'failed') return { loss: seen ? loss + 100 : loss, finalX: session.player.x };
    }
    return { loss, finalX: session.player.x };
  }
}

// ---------------------------------------------------------------------------
// Random bot: seeded button mashing for invariant fuzzing.

export class RandomBot implements BotPolicy {
  private state: number;
  private current: BotAction = IDLE_ACTION;
  private stepsLeft = 0;

  constructor(seed: string) {
    this.state = seedFromString(seed);
  }

  describe(): string {
    return `random move=${this.current.move}`;
  }

  act(): BotAction {
    if (this.stepsLeft > 0) {
      this.stepsLeft -= 1;
      return { ...this.current, jump: false, attack: false, interact: false };
    }
    const roll = this.random();
    this.current = {
      move: roll < 0.35 ? -1 : roll < 0.7 ? 1 : 0,
      jump: this.random() < 0.15,
      attack: this.random() < 0.3,
      interact: this.random() < 0.2,
    };
    this.stepsLeft = 2 + Math.floor(this.random() * 24);
    return this.current;
  }

  private random(): number {
    const next = nextSeededRandom(this.state);
    this.state = next.state;
    return next.value;
  }
}
