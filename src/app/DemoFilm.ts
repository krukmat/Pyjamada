/**
 * DEMO "film": the moments of a bot run worth a screenshot. The App numbers
 * them on screen (`demo-moment`) and maestro/demo-film.yaml captures one
 * screenshot per new number, so a real run leaves a strip of stills.
 */
export type DemoFrame = { room: string; hp: number; failed: boolean; ending: boolean };
export type DemoMoment = { count: number; label: string };

function roomName(room: string): string {
  return room.replace(/-/g, ' ').toUpperCase();
}

function momentLabel(prev: DemoFrame | null, next: DemoFrame): string | null {
  const room = roomName(next.room);
  if (!prev) return `START ${room}`;
  if (next.failed && !prev.failed) return `DOWN ${room}`;
  if (!next.failed && prev.failed) return `RETRY ${room}`;
  if (next.ending && !prev.ending) return 'ENDING';
  if (next.room !== prev.room) return `ENTER ${room}`;
  if (next.hp < prev.hp) return `HIT ${room}`;
  return null;
}

/** The moment to show after this frame: a new numbered one, or the current one unchanged. */
export function nextDemoMoment(prev: DemoFrame | null, next: DemoFrame, current: DemoMoment | null): DemoMoment | null {
  const label = momentLabel(prev, next);
  return label ? { count: (current?.count ?? 0) + 1, label } : current;
}

export function formatDemoMoment(moment: DemoMoment): string {
  return `MOMENT ${String(moment.count).padStart(3, '0')} · ${moment.label}`;
}
