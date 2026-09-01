import type { AnimationClock } from './AnimationClock';
import { visualEventLifetimeMs, type VisualEvent } from './VisualEvent';

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
    const created = events
      .filter((event) => visualEventLifetimeMs(event) > 0)
      .map((event) => {
        const lifetime = visualEventLifetimeMs(event);
        const entry: ActiveVisualEvent = {
          id: ++this.sequence,
          event,
          startedAtMs: now,
          expiresAtMs: now + lifetime,
        };
        this.active.push(entry);
        return entry;
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
