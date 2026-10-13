/**
 * Headless QA bot for the adventure exploration loop.
 *
 * The harness mirrors the App.tsx orchestration (fixed steps, room transitions,
 * first-visit recovery, room spawn, Laboratory checkpoint retry and ending
 * completion) so policies can play the real pure-TypeScript runtime without a
 * device. Keep `stepBotWorld` in sync with App.tsx when that orchestration
 * changes; the bot never mutates gameplay rules.
 */
import {
  applyFalseEscape,
  applyFirstVisitRecovery,
  findAdventureInteractionTarget,
  isLaboratoryCombatEnabled,
  stepAdventureExploration,
  type AdventureExplorationEvent,
} from '../../src/game/adventure/AdventureExplorationRuntime';
import {
  beginAdventureEnding,
  completeAdventureEnding,
  getAdventureEndingPhase,
  shouldBeginAdventureEnding,
} from '../../src/game/adventure/AdventureEnding';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../../src/game/adventure/AdventureSessionCodec';
import { createAdventureState, getRoomState, type AdventureState, type RoomId } from '../../src/game/adventure/AdventureState';
import { bathroomTwinX, isBathroomTwinActive } from '../../src/game/adventure/BathroomTwinHazard';
import {
  getLaboratoryEncounterPhase,
  restoreLaboratoryCheckpoint,
  shouldUseLaboratoryCheckpoint,
} from '../../src/game/adventure/LaboratoryEncounter';
import {
  isResonatorWeakPointDisabled,
  RESONATOR_ELECTRICAL_LANES,
  RESONATOR_WEAK_POINTS,
} from '../../src/game/adventure/LaboratoryResonatorInstability';
import {
  isVesperControlDeviceDisabled,
  VESPER_CONTROL_DEVICES,
  VESPER_PRESSURE_LANES,
} from '../../src/game/adventure/LaboratoryVesperControl';
import { VESPER_NIGHTMARE_TARGET } from '../../src/game/adventure/LaboratoryVesperNightmare';
import {
  ACTIVE_ROOM_IDS,
  findActiveRoom,
  getRoomExit,
  isRoomInteractionAvailable,
  transitionAdventure,
  type RoomEntryPoint,
  type RoomInteractionDefinition,
} from '../../src/game/adventure/RoomRegistry';
import { PLAYER_GROUND_Y } from '../../src/game/core/World';
import { HAUNTED_STEP_MS } from '../../src/game/haunted/FixedStepClock';
import { createHauntedInputState, type HauntedInputState } from '../../src/game/haunted/HauntedInput';
import { createHauntedSession, type HauntedSessionState } from '../../src/game/haunted/HauntedSessionRuntime';
import { HAUNTED_PLAYER_BOUNDS } from '../../src/game/haunted/PlayerPhysics';
import { nextSeededRandom, seedFromString } from '../../src/game/haunted/SeededRng';

export const BOT_STEP_MS = HAUNTED_STEP_MS;

export type BotWorld = { session: HauntedSessionState; adventure: AdventureState };
export type BotAction = { move: -1 | 0 | 1; jump: boolean; attack: boolean; interact: boolean };
export type BotStepOutcome = 'running' | 'transition' | 'ending-started' | 'checkpoint' | 'died' | 'completed';
export type BotStep = { world: BotWorld; events: AdventureExplorationEvent[]; outcome: BotStepOutcome; hpLost: number };

export interface BotPolicy {
  act(world: BotWorld): BotAction;
  /** Short description of the current intent, used in failure diagnostics. */
  describe(): string;
  /** False once the policy has no reachable goal left (route bots only). */
  hasGoal?(): boolean;
}

export const IDLE_ACTION: BotAction = { move: 0, jump: false, attack: false, interact: false };

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

function toInput(action: BotAction): HauntedInputState {
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

/** One fixed simulation step plus the App-level orchestration that reacts to it. */
export function stepBotWorld(world: BotWorld, action: BotAction): BotStep {
  const stepped = stepAdventureExploration({ ...world.session, input: toInput(action) }, world.adventure, BOT_STEP_MS);
  const events = stepped.events;
  const hpLost = Math.max(0, world.session.combat.hp - stepped.session.combat.hp);

  if (shouldBeginAdventureEnding(stepped.adventure)) {
    const started = beginAdventureEnding(stepped.session, stepped.adventure);
    return { world: { session: started.session, adventure: started.adventure }, events, outcome: 'ending-started', hpLost };
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
    return { world: { session: spawned, adventure: result.state }, events, outcome: 'transition', hpLost };
  }

  if (world.session.objective.phase !== 'failed' && stepped.session.objective.phase === 'failed') {
    if (shouldUseLaboratoryCheckpoint(stepped.adventure)) {
      const restored = restoreLaboratoryCheckpoint(stepped.session, stepped.adventure);
      return { world: { session: restored, adventure: stepped.adventure }, events, outcome: 'checkpoint', hpLost };
    }
    return { world: { session: stepped.session, adventure: stepped.adventure }, events, outcome: 'died', hpLost };
  }

  if (getAdventureEndingPhase(stepped.adventure) === 'ghost-sting') {
    // App shows the finish control at this phase; the bot presses it immediately.
    return {
      world: { session: stepped.session, adventure: completeAdventureEnding(stepped.adventure) },
      events,
      outcome: 'completed',
      hpLost,
    };
  }

  return { world: { session: stepped.session, adventure: stepped.adventure }, events, outcome: 'running', hpLost };
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

  if (step.outcome === 'died') {
    if (hp !== 0) violations.push(`run failed with ${hp} HP`);
    if (session.objective.phase !== 'failed' || session.objective.reason !== 'haunted') {
      violations.push(`unexpected failure objective: ${JSON.stringify(session.objective)}`);
    }
  } else if (session.objective.phase === 'failed') {
    violations.push(`objective failed without a terminal outcome (${step.outcome})`);
  } else if (hp === 0) {
    violations.push(`0 HP without failing (${step.outcome})`);
  }

  if (step.outcome === 'running' && session.elapsedMs < previous.session.elapsedMs) {
    violations.push(`exploration clock went backwards: ${previous.session.elapsedMs} -> ${session.elapsedMs}`);
  }

  if (step.outcome === 'transition' || step.outcome === 'ending-started' || step.outcome === 'checkpoint') {
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

export type BotRoomStats = { timeMs: number; hits: number; deaths: number };

export type BotRunResult = {
  outcome: 'completed' | 'died' | 'stuck' | 'timeout';
  diagnostic: string;
  world: BotWorld;
  gameTimeMs: number;
  hits: number;
  deaths: number;
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

function progressSignature(adventure: AdventureState): string {
  return JSON.stringify([adventure.currentRoom, adventure.storyFlags, adventure.rooms]);
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
  const rooms: Partial<Record<RoomId, BotRoomStats>> = {};
  const roomEntries: Partial<Record<RoomId, BotWorld>> = { [start.adventure.currentRoom]: start };
  const violations: string[] = [];
  let signature = progressSignature(world.adventure);
  let lastProgressMs = 0;

  const finish = (outcome: BotRunResult['outcome'], diagnostic: string): BotRunResult => ({
    outcome,
    diagnostic,
    world,
    gameTimeMs,
    hits,
    deaths,
    rooms,
    roomEntries,
    violations,
  });

  while (gameTimeMs < options.maxGameMs) {
    if (policy.hasGoal && !policy.hasGoal()) {
      return finish('stuck', `no reachable goal left (${describeWorld(world)}; ${policy.describe()})`);
    }
    const room = world.adventure.currentRoom;
    const stats = (rooms[room] ??= { timeMs: 0, hits: 0, deaths: 0 });
    const step = stepBotWorld(world, policy.act(world));
    for (const violation of checkBotInvariants(world, step)) {
      if (violations.length < 20) violations.push(`${violation} (${describeWorld(step.world)} t=${Math.round(gameTimeMs)}ms)`);
    }

    gameTimeMs += BOT_STEP_MS;
    stats.timeMs += BOT_STEP_MS;
    if (step.hpLost > 0) {
      hits += step.hpLost;
      stats.hits += step.hpLost;
    }
    world = step.world;

    if (step.outcome === 'checkpoint' || step.outcome === 'died') {
      deaths += 1;
      stats.deaths += 1;
    }
    if (step.outcome === 'died') return finish('died', `died (${describeWorld(world)}; ${policy.describe()})`);
    if (step.outcome === 'completed') return finish('completed', `ending complete (${describeWorld(world)})`);
    if (step.outcome === 'transition' || step.outcome === 'ending-started') {
      if (options.stopOnRoomExit) return finish('completed', `left ${room} (${describeWorld(world)})`);
      roomEntries[world.adventure.currentRoom] ??= world;
    }

    const nextSignature = progressSignature(world.adventure);
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

type Goal = { x: number; label: string; interactionId?: string; aimX?: number };

const DECISION_STEPS = 3;
const ARRIVE_DISTANCE = 2.5;
const FIRING_DISTANCE = 28;
const FIRING_DISTANCES = [16, 22, FIRING_DISTANCE] as const;
const CONTINUATIONS = ['goal', 'idle', 'hold'] as const;
/**
 * Lookahead used for navigation (does walking approach the goal?). It is the
 * same for every bot; only damage inside `reactionMs` counts as seen danger.
 */
const NAVIGATION_STEPS = 24;

function clampX(x: number): number {
  return Math.min(HAUNTED_PLAYER_BOUNDS.maxX, Math.max(HAUNTED_PLAYER_BOUNDS.minX, x));
}

function isVisible(adventure: AdventureState, roomId: RoomId, interaction: RoomInteractionDefinition): boolean {
  if (!isRoomInteractionAvailable(adventure, roomId, interaction)) return false;
  const hiddenBy = interaction.hiddenWhenRoomSwitch;
  return !hiddenBy || getRoomState(adventure, roomId).switches[hiddenBy] !== true;
}

function roomSignature(adventure: AdventureState, roomId: RoomId): string {
  return JSON.stringify([adventure.storyFlags, adventure.rooms[roomId] ?? null]);
}

/** Dream Spark targets currently on stage; empty outside the twin and Laboratory fights. */
export function combatTargets(world: BotWorld): number[] {
  const { adventure, session } = world;
  if (isBathroomTwinActive(adventure)) return [bathroomTwinX(session.player.x)];
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

function interactsWith(world: BotWorld, goal: Goal): boolean {
  if (!goal.interactionId) return false;
  return findAdventureInteractionTarget(world.adventure, world.session.player.x)?.id === goal.interactionId;
}

export class RouteBot implements BotPolicy {
  private readonly attempted = new Set<string>();
  /** Interactions the bot reached but could not select because another target wins at that spot. */
  readonly shadowed = new Set<string>();
  private readonly horizonSteps: number;
  private readonly readSteps: number;
  private reading: { x: number; stepsLeft: number; label: string } | undefined;
  private current: BotAction = IDLE_ACTION;
  private stepsUntilDecision = 0;
  private goal: Goal | undefined = { x: 0, label: 'start' };

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
    while (this.goal?.interactionId && this.isShadowed(world, this.goal)) {
      const room = world.adventure.currentRoom;
      this.shadowed.add(`${room}:${this.goal.interactionId}`);
      this.attempted.add(`${room}|${this.goal.interactionId}|${roomSignature(world.adventure, room)}`);
      this.goal = this.resolveGoal(world);
    }
    if (!this.goal) return IDLE_ACTION;

    const action = this.choose(world, this.goal);
    if (action.interact && this.goal.interactionId) {
      const room = world.adventure.currentRoom;
      this.attempted.add(`${room}|${this.goal.interactionId}|${roomSignature(world.adventure, room)}`);
      const used = findActiveRoom(room)?.interactions.find(interaction => interaction.id === this.goal?.interactionId);
      if (used?.behavior.type === 'effect' && this.readSteps > 0) {
        this.reading = { x: world.session.player.x, stepsLeft: this.readSteps, label: `reading after ${used.id}` };
      }
    }
    this.current = action;
    this.stepsUntilDecision = DECISION_STEPS - 1;
    return action;
  }

  /** Standing on the goal spot but the runtime resolves a different interaction there. */
  private isShadowed(world: BotWorld, goal: Goal): boolean {
    const player = world.session.player;
    if (Math.abs(goal.x - player.x) > ARRIVE_DISTANCE || Math.abs(player.vx) > 1 || !player.grounded) return false;
    return !interactsWith(world, goal);
  }

  private untriedEffects(adventure: AdventureState, roomId: RoomId): RoomInteractionDefinition[] {
    const room = findActiveRoom(roomId);
    if (!room) return [];
    const signature = roomSignature(adventure, roomId);
    return room.interactions.filter(interaction =>
      interaction.behavior.type === 'effect'
      && isVisible(adventure, roomId, interaction)
      && !this.attempted.has(`${roomId}|${interaction.id}|${signature}`));
  }

  private resolveGoal(world: BotWorld): Goal | undefined {
    const { adventure, session } = world;
    const playerX = session.player.x;
    const targets = combatTargets(world);
    if (targets.length > 0) {
      const target = targets.reduce((best, x) => (Math.abs(x - playerX) < Math.abs(best - playerX) ? x : best));
      return { x: this.firingPosition(world, target), aimX: target, label: `fight target@${Math.round(target)}` };
    }

    if (this.reading) return { x: this.reading.x, label: this.reading.label };

    const room = adventure.currentRoom;
    const effects = this.untriedEffects(adventure, room)
      .sort((a, b) => Math.abs(a.x - playerX) - Math.abs(b.x - playerX));
    if (effects[0]) return { x: clampX(effects[0].x), interactionId: effects[0].id, label: `${room}:${effects[0].id}` };

    const exit = this.nextExit(adventure);
    if (exit) return { x: clampX(exit.x), interactionId: exit.id, label: `${room}:${exit.id}` };
    return undefined;
  }

  /** Nearest spot within spark range of the target, preferring spots outside the phase's hazard lanes. */
  private firingPosition(world: BotWorld, targetX: number): number {
    const playerX = world.session.player.x;
    if (isBathroomTwinActive(world.adventure)) return playerX < 64 ? 24 : 104;
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

  /** Breadth-first search to the nearest room that is unvisited or has untried interactions. */
  private nextExit(adventure: AdventureState): RoomInteractionDefinition | undefined {
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
        const wanted = !adventure.visitedRooms.includes(exit.targetRoom)
          || this.untriedEffects(adventure, exit.targetRoom).length > 0;
        if (wanted) return firstHop;
        queue.push({ room: exit.targetRoom, first: firstHop });
      }
    }
    return undefined;
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
