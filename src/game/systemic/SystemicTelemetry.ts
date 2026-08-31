import type { SystemicEvent, SystemicUpdate } from './SystemicRuntime';
import type { SystemicInput, SystemicObjectId, SystemicRunState } from './SystemicState';

export type SystemicTelemetryOutcome = 'success' | 'near-miss' | 'chaos' | 'other-failure';

export type SystemicTelemetryEvent =
  | { type: 'run_started'; runId: string }
  | { type: 'input'; runId: string; input: SystemicInput }
  | { type: 'object_interaction'; runId: string; objectId: SystemicObjectId }
  | { type: 'rule_triggered'; runId: string; ruleId: string }
  | { type: 'run_completed'; runId: string; timeSpent: number; noise: number; retries: number; outcome: 'success' }
  | { type: 'run_failed'; runId: string; reason: string; timeSpent: number; noise: number; retries: number; outcome: Exclude<SystemicTelemetryOutcome, 'success'> }
  | { type: 'run_restarted'; runId: string; retries: number };

export type SystemicTelemetrySummary = {
  firstObjectId?: SystemicObjectId;
  retries: number;
  outcome?: SystemicTelemetryOutcome;
  logicalTime?: number;
};

export interface SystemicTelemetryPort { record(event: SystemicTelemetryEvent): void; }

export class InMemorySystemicTelemetry implements SystemicTelemetryPort {
  private events: SystemicTelemetryEvent[] = [];
  record(event: SystemicTelemetryEvent): void { this.events.push(event); }
  snapshot(): readonly SystemicTelemetryEvent[] { return [...this.events]; }
}

export function recordSystemicUpdate(
  telemetry: SystemicTelemetryPort,
  before: SystemicRunState,
  input: SystemicInput,
  update: SystemicUpdate,
  retries: number,
): void {
  telemetry.record({ type: 'input', runId: before.runId, input });
  for (const event of update.events) recordDomainEvent(telemetry, update.state, event, retries);
  for (const ruleId of update.ruleTrace) telemetry.record({ type: 'rule_triggered', runId: before.runId, ruleId });
}

export function summarizeSystemicTelemetry(events: readonly SystemicTelemetryEvent[]): SystemicTelemetrySummary {
  const firstObjectId = events.find((event): event is Extract<SystemicTelemetryEvent, { type: 'object_interaction' }> => event.type === 'object_interaction')?.objectId;
  const latestRestart = [...events].reverse().find((event): event is Extract<SystemicTelemetryEvent, { type: 'run_restarted' }> => event.type === 'run_restarted');
  const terminal = [...events].reverse().find((event): event is Extract<SystemicTelemetryEvent, { type: 'run_completed' | 'run_failed' }> => event.type === 'run_completed' || event.type === 'run_failed');
  return {
    firstObjectId,
    retries: terminal?.retries ?? latestRestart?.retries ?? 0,
    outcome: terminal?.outcome,
    logicalTime: terminal?.timeSpent,
  };
}

function recordDomainEvent(telemetry: SystemicTelemetryPort, state: SystemicRunState, event: SystemicEvent, retries: number) {
  if (event.type === 'OBJECT_INTERACTED') telemetry.record({ type: 'object_interaction', runId: state.runId, objectId: event.objectId });
  if (event.type === 'OBJECTIVE_COMPLETED') telemetry.record({ type: 'run_completed', runId: state.runId, timeSpent: state.timeSpent, noise: state.noise, retries, outcome: 'success' });
  if (event.type === 'OBJECTIVE_FAILED') telemetry.record({
    type: 'run_failed',
    runId: state.runId,
    reason: event.reason,
    timeSpent: state.timeSpent,
    noise: state.noise,
    retries,
    outcome: classifyFailure(state, event.reason),
  });
}

function classifyFailure(state: SystemicRunState, reason: string): Exclude<SystemicTelemetryOutcome, 'success'> {
  if (reason === 'house-awake' && state.flags.windowOpen) return 'chaos';
  if (reason === 'house-awake') return 'near-miss';
  return 'other-failure';
}
