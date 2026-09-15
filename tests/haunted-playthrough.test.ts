import { HAUNTED_STEP_MS } from '../src/game/haunted/FixedStepClock';
import { pressAction, setHeldControl } from '../src/game/haunted/HauntedInput';
import { HAUNTED_ESCAPE_GHOST_X, HAUNTED_EXIT, createHauntedSession, stepHauntedSession, type HauntedSessionState } from '../src/game/haunted/HauntedSessionRuntime';

function ok(value: unknown, label: string) { if (!value) throw new Error(label); }
function equal(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: ${String(actual)} !== ${String(expected)}`);
}

let session = createHauntedSession('haunted-playthrough');

session = driveTo(session, 16);
session = interact(session);
equal(session.domestic.wallyState, 'normal', 'playthrough wakes Wally at the bed');

session = driveTo(session, 68);
session = interact(session);
ok(session.domestic.flags.dressed, 'playthrough gets Wally dressed');

session = driveTo(session, 88);
session = interact(session);
equal(session.objective.phase, 'escape-ready', 'playthrough collects keys and enters escape-ready');
const exitGhost = session.threats.ghosts.find((ghost) => ghost.x === HAUNTED_ESCAPE_GHOST_X && ghost.phase === 'telegraph');
ok(exitGhost, 'escape-ready creates the directed final Ghost');

// The warning window is actionable: fire into the materialising Ghost before
// committing to the door run.
session = faceRight(session);
session = { ...session, input: pressAction(session.input, 'attack') };
let defeatedExitGhost = false;
for (let i = 0; i < 16; i += 1) {
  const stepped = stepHauntedSession(session, HAUNTED_STEP_MS);
  session = stepped.state;
  if (stepped.events.some((event) => event.type === 'GHOST_DEFEATED' && event.ghostId === exitGhost!.id)) {
    defeatedExitGhost = true;
    break;
  }
}
ok(defeatedExitGhost, 'Dream Spark can clear the final Ghost telegraph');

session = driveTo(session, HAUNTED_EXIT.x);
session = interact(session);
equal(session.objective.phase, 'completed', 'playthrough reaches and uses the exit door');
ok(session.combat.hp > 0, 'playthrough remains survivable');

console.log('haunted vertical-slice playthrough passed');

function driveTo(initial: HauntedSessionState, targetX: number): HauntedSessionState {
  let state = initial;
  const control = state.player.x < targetX ? 'right' as const : 'left' as const;
  state = { ...state, input: setHeldControl(state.input, control, true) };
  for (let i = 0; i < 300 && Math.abs(state.player.x - targetX) > 2; i += 1) {
    state = stepHauntedSession(state, HAUNTED_STEP_MS).state;
    if (state.objective.phase === 'failed') throw new Error(`playthrough failed while moving to ${targetX}: ${state.objective.reason}`);
  }
  state = { ...state, input: setHeldControl(state.input, control, false) };
  for (let i = 0; i < 20 && Math.abs(state.player.vx) > 0.1; i += 1) {
    state = stepHauntedSession(state, HAUNTED_STEP_MS).state;
  }
  return state;
}

function interact(initial: HauntedSessionState): HauntedSessionState {
  return stepHauntedSession({ ...initial, input: pressAction(initial.input, 'interact') }, HAUNTED_STEP_MS).state;
}

function faceRight(state: HauntedSessionState): HauntedSessionState {
  return {
    ...state,
    player: { ...state.player, facing: 'right' },
    domestic: { ...state.domestic, player: { ...state.domestic.player, facing: 'right' } },
  };
}
