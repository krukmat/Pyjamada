import type { AnimationClock } from './AnimationClock';
import { visualEventChannel, visualEventLifetimeMs, type VisualEvent } from './VisualEvent';

export type ActiveVisualEvent = {
  id: number;
  event: VisualEvent;
  startedAtMs: number;
  expiresAtMs: number;
};

export class PresentationRuntime {
  private sequence = 0;
  private active: ActiveVisualEvent[] = [];

  constructor(private readonly clock: AnimationClock) {}

  push(events: readonly VisualEvent[]): ActiveVisualEvent[] {
    const now = this.clock.nowMs();
    if (events.some((event) => event.type === 'PRESENTATION_RESET')) {
      this.reset();
      return [];
    }

    this.prune(now);
    const created: ActiveVisualEvent[] = [];
    events.forEach((event) => {
      const lifetime = visualEventLifetimeMs(event);
      if (lifetime <= 0) return;

      const channel = visualEventChannel(event);
      if (channel) {
        this.active = this.active.filter((entry) => visualEventChannel(entry.event) !== channel);
      }

      const entry: ActiveVisualEvent = {
        id: ++this.sequence,
        event,
        startedAtMs: now,
        expiresAtMs: now + lifetime,
      };
      this.active.push(entry);
      created.push(entry);
    });
    return created;
  }

  snapshot(): readonly ActiveVisualEvent[] {
    this.prune(this.clock.nowMs());
    return [...this.active];
  }

  reset(): void {
    this.active = [];
    this.sequence = 0;
  }

  private prune(now: number): void {
    this.active = this.active.filter((entry) => entry.expiresAtMs > now);
  }
}
