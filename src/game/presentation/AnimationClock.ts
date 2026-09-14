export interface AnimationClock {
  nowMs(): number;
}

export const systemAnimationClock: AnimationClock = {
  nowMs: () => Date.now(),
};

export class ManualAnimationClock implements AnimationClock {
  private currentMs: number;

  constructor(initialMs = 0) {
    this.currentMs = Math.max(0, Math.floor(initialMs));
  }

  nowMs(): number {
    return this.currentMs;
  }

  setMs(value: number): void {
    this.currentMs = Math.max(0, Math.floor(value));
  }

  advanceMs(deltaMs: number): number {
    if (!Number.isFinite(deltaMs)) throw new Error('animation clock delta must be finite');
    this.currentMs = Math.max(0, Math.floor(this.currentMs + deltaMs));
    return this.currentMs;
  }
}
