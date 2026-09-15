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
  const accumulator = Math.max(0, accumulatorMs) + acceptedElapsed;
  const toleranceMs = HAUNTED_STEP_MS * 1e-9;
  const steps = Math.min(
    HAUNTED_MAX_CATCH_UP_STEPS,
    Math.floor((accumulator + toleranceMs) / HAUNTED_STEP_MS),
  );
  const remainder = accumulator - steps * HAUNTED_STEP_MS;

  return {
    steps,
    accumulatorMs: Math.max(0, Math.abs(remainder) <= toleranceMs ? 0 : remainder),
    simulatedMs: steps * HAUNTED_STEP_MS,
    droppedMs,
  };
}
