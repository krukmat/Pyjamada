import { deepEqual, equal, test } from './assert';
import { layoutControlZones, updateDeckTouches, zoneAt, type DeckTouchState } from '../src/app/TouchControlZones';

const ALL = { jump: true, attack: true, interact: true };
const zones = layoutControlZones(400, 100, 'standard', ALL);

void test('the pad takes one half and three fixed action slots the other; mirrored swaps the halves', () => {
  equal(zoneAt(zones, 10, 50)?.id, 'left', 'far left steers left');
  equal(zoneAt(zones, 150, 50)?.id, 'right', 'inner pad steers right');
  deepEqual([210, 280, 350].map(x => zoneAt(zones, x, 50)?.id), ['jump', 'attack', 'interact'], 'action slots in order');
  const mirrored = layoutControlZones(400, 100, 'mirrored', ALL);
  equal(zoneAt(mirrored, 10, 50)?.id, 'jump', 'mirrored puts the actions on the left');
  equal(zoneAt(mirrored, 390, 50)?.id, 'right', 'and the pad on the right');
  const noAttack = layoutControlZones(400, 100, 'standard', { ...ALL, attack: false });
  deepEqual(noAttack.map(zone => [zone.id, zone.x]), zones.map(zone => [zone.id, zone.x]), 'an unavailable action keeps its slot');
});

void test('holding a direction and tapping JUMP at the same time does both', () => {
  let state: DeckTouchState = {};
  let update = updateDeckTouches(state, [{ id: 'a', x: 150, y: 50 }], zones);
  state = update.state;
  deepEqual(update.held, { left: false, right: true }, 'right held');
  update = updateDeckTouches(state, [{ id: 'a', x: 150, y: 50 }, { id: 'b', x: 210, y: 50 }], zones);
  deepEqual(update.taps, ['jump'], 'jump fires on touch-down');
  deepEqual(update.held, { left: false, right: true }, 'still running right while jumping');
  state = update.state;
  update = updateDeckTouches(state, [{ id: 'a', x: 150, y: 50 }, { id: 'b', x: 212, y: 50 }], zones);
  deepEqual(update.taps, [], 'a held button fires only once');
});

void test('pad fingers slide between directions; action fingers never steer; disabled slots do nothing', () => {
  let update = updateDeckTouches({}, [{ id: 'a', x: 150, y: 50 }], zones);
  update = updateDeckTouches(update.state, [{ id: 'a', x: 20, y: 50 }], zones);
  deepEqual(update.held, { left: true, right: false }, 'sliding to the left half steers left');
  update = updateDeckTouches(update.state, [{ id: 'a', x: 300, y: 50 }], zones);
  deepEqual([update.held, update.taps], [{ left: false, right: false }, []], 'sliding off the pad holds nothing and taps nothing');
  update = updateDeckTouches({}, [{ id: 'b', x: 280, y: 50 }], zones);
  update = updateDeckTouches(update.state, [{ id: 'b', x: 20, y: 50 }], zones);
  deepEqual(update.held, { left: false, right: false }, 'a finger that pressed ATTACK never becomes a direction');
  const noAttack = layoutControlZones(400, 100, 'standard', { ...ALL, attack: false });
  deepEqual(updateDeckTouches({}, [{ id: 'c', x: 280, y: 50 }], noAttack).taps, [], 'a disabled slot ignores taps');
  deepEqual(updateDeckTouches(update.state, [], zones).state, {}, 'lifted fingers are forgotten');
});

void test('landscape columns: pad left, actions stacked right, nothing over the stage or above the controls', () => {
  const columns = layoutControlZones(800, 400, 'standard', ALL, { centerWidth: 500, top: 100 });
  equal(zoneAt(columns, 30, 300)?.id, 'left', 'outer pad steers left');
  equal(zoneAt(columns, 120, 300)?.id, 'right', 'inner pad steers right');
  equal(zoneAt(columns, 400, 300), undefined, 'the stage takes no touches');
  equal(zoneAt(columns, 30, 50), undefined, 'the column top (menu, objective) takes no touches');
  deepEqual([150, 250, 350].map(y => zoneAt(columns, 720, y)?.id), ['interact', 'attack', 'jump'], 'actions stacked, JUMP at the bottom');
  const mirrored = layoutControlZones(800, 400, 'mirrored', ALL, { centerWidth: 500, top: 100 });
  equal(zoneAt(mirrored, 30, 350)?.id, 'jump', 'mirrored puts the actions on the left');
  equal(zoneAt(mirrored, 770, 300)?.id, 'right', 'and the pad on the right');
});
