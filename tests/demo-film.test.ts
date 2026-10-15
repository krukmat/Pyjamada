import { deepEqual, equal, test } from './assert';
import { formatDemoMoment, nextDemoMoment, type DemoFrame, type DemoMoment } from '../src/app/DemoFilm';

const frame = (patch: Partial<DemoFrame> = {}): DemoFrame => ({ room: 'bedroom', hp: 3, failed: false, ending: false, ...patch });

function film(frames: DemoFrame[]): string[] {
  let prev: DemoFrame | null = null;
  let moment: DemoMoment | null = null;
  const shots: string[] = [];
  for (const next of frames) {
    const after = nextDemoMoment(prev, next, moment);
    if (after && after !== moment) shots.push(formatDemoMoment(after));
    moment = after;
    prev = next;
  }
  return shots;
}

void test('a run is numbered at its start, rooms, hits, falls, retries and ending', () => {
  deepEqual(film([
    frame(),
    frame(),
    frame({ room: 'living-room' }),
    frame({ room: 'living-room', hp: 2 }),
    frame({ room: 'living-room', hp: 2 }),
    frame({ room: 'living-room', hp: 0, failed: true }),
    frame({ room: 'living-room' }),
    frame({ room: 'laboratory', ending: true }),
  ]), [
    'MOMENT 001 · START BEDROOM',
    'MOMENT 002 · ENTER LIVING ROOM',
    'MOMENT 003 · HIT LIVING ROOM',
    'MOMENT 004 · DOWN LIVING ROOM',
    'MOMENT 005 · RETRY LIVING ROOM',
    'MOMENT 006 · ENDING',
  ], 'one numbered moment per event');
});

void test('quiet frames keep the same moment object, and healing is not a moment', () => {
  const start = nextDemoMoment(null, frame(), null);
  equal(nextDemoMoment(frame(), frame(), start), start, 'nothing happened');
  equal(nextDemoMoment(frame({ hp: 2 }), frame({ hp: 3 }), start), start, 'hp going up');
});
