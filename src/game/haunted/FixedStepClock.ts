export const HAUNTED_SIMULATION_HZ = 30;
export const HAUNTED_STEP_MS = 1000 / HAUNTED_SIMULATION_HZ;
export const HAUNTED_MAX_CATCH_UP_STEPS = 5;
export const HAUNTED_MAX_FRAME_DELTA_MS = HAUNTED_STEP_MS * HAUNTED_MAX_CATCH_UP_STEPS;

export type FixedStepAdvance = {
  steps: number;
  accumulatorMs: number;
  simulatedMs: number;
  droppedMs: number;
};

/**
 * Pure fixed-step accumulator. Rendering/scheduling owns wall-clock time;
 * gameplay only sees a bounded number of deterministic simulation steps.
 */
export function advanceFixedStep(accumulatorMs: number, elapsedMs: number): FixedStepAdvance {
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const acceptedElapsed = Math.min(safeElapsed, HAUNTED_MAX_FRAME_DELTA_MS);
  const droppedMs = Math.max(0, safeElapsed - acceptedElapsed);
  let accumulator = Math.max(0, accumulatorMs) + acceptedElapsed;
  let steps = 0;

  while (accumulator + Number.EPSILON >= HAUNTED_STEP_MS && steps < HAUNTED_MAX_CATCH_UP_STEPS) {
    accumulator -= HAUNTED_STEP_MS;
    steps += 1;
  }

  return {
    steps,
    accumulatorMs: Math.max(0, accumulator),
    simulatedMs: steps * HAUNTED_STEP_MS,
    droppedMs,
  };
}
