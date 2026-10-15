import { equal, test } from './assert';
import { createAdventureState, markRoomInteraction, setRoomSwitch, type AdventureState, type RoomId } from '../src/game/adventure/AdventureState';
import { createHauntedCombatState, type HauntedCombatState } from '../src/game/haunted/HauntedCombat';
import {
  CUCKOO_BOSS,
  CUCKOO_FLIGHT,
  ROACH_CHARGE,
  activeRoomBoss,
  dispelBoss,
  ROOM_BOSSES,
  ROOM_BOSS_RISE_MS,
  WRAITH_BLINK,
  armRoomBoss,
  dispelRoomBoss,
  isPlayerTouchingRoomBoss,
  isRoomBossGuardingExit,
  resolveRoomBoss,
  resolveRoomBossSparks,
  roomBossRoundMs,
  type RoomBossRoom,
} from '../src/game/adventure/RoomBossHazard';
import { getRoomExit, isRoomExitAvailable } from '../src/game/adventure/RoomRegistry';

function awake(room: RoomBossRoom): { adventure: AdventureState; startMs: number } {
  const config = ROOM_BOSSES[room];
  const adventure = setRoomSwitch({ ...createAdventureState(), currentRoom: room as RoomId }, room, config.guardSwitch, true);
  const armed = armRoomBoss(adventure, 1_234);
  return { adventure: armed.adventure, startMs: armed.elapsedMs };
}

function sparkAt(x: number, combat: HauntedCombatState = createHauntedCombatState()): HauntedCombatState {
  return { ...combat, projectiles: [...combat.projectiles, { id: combat.projectiles.length + 1, x, y: 86, vx: 76, damage: 1 }] };
}

void test('solving the puzzle wakes a boss that seals the forward exit until it is dispelled', () => {
  for (const room of Object.keys(ROOM_BOSSES) as RoomBossRoom[]) {
    const config = ROOM_BOSSES[room];
    const { adventure } = awake(room);
    const exit = getRoomExit(room, config.exitId)!;
    equal(isRoomBossGuardingExit(adventure, room, config.exitId), true, `${room}: boss guards the exit`);
    equal(isRoomExitAvailable(adventure, room, exit), false, `${room}: exit sealed while the boss lives`);
    equal(isRoomExitAvailable(dispelRoomBoss(adventure, room), room, exit), true, `${room}: exit opens once dispelled`);
  }
});

void test('every round opens with a harmless, untouchable rise', () => {
  for (const room of Object.keys(ROOM_BOSSES) as RoomBossRoom[]) {
    const { adventure, startMs } = awake(room);
    equal(startMs % roomBossRoundMs(ROOM_BOSSES[room]), 0, `${room}: clock aligned to a round start`);
    for (const t of [0, ROOM_BOSS_RISE_MS - 1, roomBossRoundMs(ROOM_BOSSES[room])]) {
      const boss = resolveRoomBoss(adventure, startMs + t)!;
      equal(boss.pose, 'rise', `${room} +${t}ms: rising`);
      equal(boss.dangerous || boss.hittable, false, `${room} +${t}ms: harmless and untouchable`);
    }
  }
});

void test('Dream Sparks wound the boss and the last one needed dispels it', () => {
  const { adventure, startMs } = awake('hallway');
  let state = adventure;
  const fightMs = startMs + ROOM_BOSS_RISE_MS + ROOM_BOSSES.hallway.cycleMs;
  for (let hit = 1; hit <= ROOM_BOSSES.hallway.hp; hit += 1) {
    // One wound per vulnerable cycle: the shield is back until the next one.
    const cycleMs = fightMs + (hit - 1) * ROOM_BOSSES.hallway.cycleMs;
    if (hit > 1) {
      const guarded = resolveRoomBoss(state, cycleMs - 1)!;
      equal(guarded.shielded, true, `after wound ${hit - 1} the shield is back for the rest of the cycle`);
      equal(resolveRoomBossSparks(state, sparkAt(guarded.x), guarded).events.length, 0, `the shield swallows spark ${hit} early`);
    }
    const boss = resolveRoomBoss(state, cycleMs)!;
    const result = resolveRoomBossSparks(state, sparkAt(boss.x), boss);
    equal(result.events[0]?.type, hit < ROOM_BOSSES.hallway.hp ? 'ROOM_BOSS_HIT' : 'ROOM_BOSS_DISPELLED', `spark ${hit}`);
    equal(result.combat.projectiles.length, 0, `spark ${hit} is consumed`);
    state = result.adventure;
  }
  equal(resolveRoomBoss(state, fightMs), undefined, 'a dispelled boss is gone');
  const missed = resolveRoomBossSparks(adventure, sparkAt(8), resolveRoomBoss(adventure, fightMs));
  equal(missed.events.length, 0, 'a spark far from the boss flies on');
});

void test('the first attack cycle is shielded: it hurts, and sparks vanish on the shield', () => {
  for (const room of Object.keys(ROOM_BOSSES) as RoomBossRoom[]) {
    const { adventure, startMs } = awake(room);
    const config = ROOM_BOSSES[room];
    for (const t of [ROOM_BOSS_RISE_MS, ROOM_BOSS_RISE_MS + config.cycleMs - 1]) {
      const boss = resolveRoomBoss(adventure, startMs + t)!;
      equal(boss.shielded && !boss.hittable, true, `${room} +${t}ms: shielded`);
      const result = resolveRoomBossSparks(adventure, sparkAt(boss.x), boss);
      equal(result.events.length + result.combat.projectiles.length, 0, `${room} +${t}ms: the spark is blocked without a wound`);
    }
    equal(resolveRoomBoss(adventure, startMs + ROOM_BOSS_RISE_MS + config.cycleMs)!.shielded, false, `${room}: the shield drops after one cycle`);
  }
});

void test('the Wraith can be hit only once solid, and the Roach only reaches grounded players', () => {
  const wraith = awake('living-room');
  const vulnerableMs = wraith.startMs + ROOM_BOSS_RISE_MS + ROOM_BOSSES['living-room'].cycleMs;
  const faint = resolveRoomBoss(wraith.adventure, vulnerableMs)!;
  equal(faint.pose, 'telegraph', 'each blink starts faint');
  equal(resolveRoomBossSparks(wraith.adventure, sparkAt(faint.x), faint).events.length, 0, 'sparks pass through a faint Wraith');
  equal(isPlayerTouchingRoomBoss({ x: faint.x, grounded: true }, faint), false, 'a faint Wraith does not hurt');
  const solid = resolveRoomBoss(wraith.adventure, vulnerableMs + WRAITH_BLINK.telegraphMs)!;
  equal(solid.hittable && solid.dangerous, true, 'a solid Wraith hurts and can be hit');

  const roach = awake('kitchen');
  const charging = resolveRoomBoss(roach.adventure, roach.startMs + ROOM_BOSS_RISE_MS + ROACH_CHARGE.waitMs + ROACH_CHARGE.chargeMs / 2)!;
  equal(charging.pose, 'charge', 'the Roach charges after waiting');
  equal(charging.x > ROACH_CHARGE.leftX && charging.x < ROACH_CHARGE.rightX, true, 'mid-charge it crosses the floor');
  equal(isPlayerTouchingRoomBoss({ x: charging.x, grounded: true }, charging), true, 'a grounded Wally is run over');
  equal(isPlayerTouchingRoomBoss({ x: charging.x, grounded: false }, charging), false, 'jumping clears the Roach');
});

void test('bosses hunt Wally and get meaner with every wound', () => {
  const wounded = (room: RoomBossRoom, adventure: AdventureState, hits: number) =>
    Array.from({ length: hits }, (_, index) => `${room}-boss-hit-${index + 1}`)
      .reduce((state, mark) => markRoomInteraction(state, room, mark), adventure);

  const moth = awake('hallway');
  const flyingMs = moth.startMs + ROOM_BOSS_RISE_MS + ROOM_BOSSES.hallway.cycleMs / 2;
  const bare = resolveRoomBoss(moth.adventure, flyingMs)!;
  const leaning = resolveRoomBoss(moth.adventure, flyingMs, 120)!;
  const leaningHarder = resolveRoomBoss(wounded('hallway', moth.adventure, 2), flyingMs, 120)!;
  equal(leaning.x > bare.x && leaningHarder.x > leaning.x, true, 'the Moth leans toward Wally, harder once wounded');

  const wraith = awake('living-room');
  const blinkStartMs = wraith.startMs + ROOM_BOSS_RISE_MS + ROOM_BOSSES['living-room'].cycleMs;
  const lateSolidMs = blinkStartMs + WRAITH_BLINK.blinkMs - 1;
  const spot = resolveRoomBoss(wraith.adventure, lateSolidMs)!.x;
  equal(resolveRoomBoss(wraith.adventure, blinkStartMs, 120)!.x, spot, 'a faint Wraith stays on its spot');
  equal(resolveRoomBoss(wraith.adventure, lateSolidMs, 120)!.x > spot, true, 'a solid Wraith drifts toward Wally');
  const angry = wounded('living-room', wraith.adventure, 2);
  equal(resolveRoomBoss(angry, blinkStartMs + WRAITH_BLINK.telegraphMs - 1)!.pose, 'solid', 'a wounded Wraith warns for less time');

  const roach = awake('kitchen');
  // Same arrival time, but a wounded Roach holds longer and then dashes faster.
  const dashMs = roach.startMs + ROOM_BOSS_RISE_MS + ROACH_CHARGE.waitMs + 1;
  equal(resolveRoomBoss(roach.adventure, dashMs)!.pose, 'charge', 'a fresh Roach is already charging');
  equal(resolveRoomBoss(wounded('kitchen', roach.adventure, 1), dashMs)!.pose, 'telegraph', 'a wounded Roach still twitches, then dashes faster');
});

void test('the Cuckoo wakes once the Moth is dispelled and can be hit only while it hops', () => {
  const { adventure } = awake('hallway');
  const afterMoth = dispelBoss(adventure, ROOM_BOSSES.hallway);
  equal(activeRoomBoss(afterMoth), CUCKOO_BOSS, 'the clock bird takes over');
  equal(isRoomBossGuardingExit(afterMoth, 'hallway', CUCKOO_BOSS.exitId), true, 'the door stays sealed');
  const armed = armRoomBoss(afterMoth, 50_000);
  const cycleStart = armed.elapsedMs + ROOM_BOSS_RISE_MS + CUCKOO_BOSS.cycleMs;
  const call = resolveRoomBoss(armed.adventure, cycleStart)!;
  equal(call.pose === 'telegraph' && !call.dangerous && !call.hittable, true, 'it calls from the door, harmless');
  const hop = resolveRoomBoss(armed.adventure, cycleStart + CUCKOO_FLIGHT.callMs + CUCKOO_FLIGHT.diveMs + 10)!;
  equal(hop.pose === 'hop' && hop.hittable && hop.dangerous, true, 'it hops and pecks on the floor, and can be hit');
  equal(isRoomBossGuardingExit(dispelBoss(armed.adventure, CUCKOO_BOSS), 'hallway', CUCKOO_BOSS.exitId), false, 'the door opens once it is dispelled');
});
