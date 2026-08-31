import type { SystemicEvent, SystemicUpdate } from './SystemicRuntime';
import type { SystemicInput, SystemicObjectId, SystemicRunState } from './SystemicState';

export type SystemicTelemetryEvent =
  | { type: 'run_started'; runId: string }
  | { type: 'input'; runId: string; input: SystemicInput }
  | { type: 'object_interaction'; runId: string; objectId: SystemicObjectId }
  | { type: 'rule_triggered'; runId: string; ruleId: string }
  | { type: 'run_completed'; runId: string; timeSpent: number; noise: number; retries: number }
  | { type: 'run_failed'; runId: string; reason: string; timeSpent: number; noise: number; retries: number }
  | { type: 'run_restarted'; runId: string; retries: number };

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

function recordDomainEvent(telemetry: SystemicTelemetryPort, state: SystemicRunState, event: SystemicEvent, retries: number) {
  if (event.type === 'OBJECT_INTERACTED') telemetry.record({ type: 'object_interaction', runId: state.runId, objectId: event.objectId });
  if (event.type === 'OBJECTIVE_COMPLETED') telemetry.record({ type: 'run_completed', runId: state.runId, timeSpent: state.timeSpent, noise: state.noise, retries });
  if (event.type === 'OBJECTIVE_FAILED') telemetry.record({ type: 'run_failed', runId: state.runId, reason: event.reason, timeSpent: state.timeSpent, noise: state.noise, retries });
}
