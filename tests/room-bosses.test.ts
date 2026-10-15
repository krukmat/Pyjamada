import { equal, test } from './assert';
import { createAdventureState, setRoomSwitch, type AdventureState, type RoomId } from '../src/game/adventure/AdventureState';
import { createHauntedCombatState, type HauntedCombatState } from '../src/game/haunted/HauntedCombat';
import {
  ROACH_CHARGE,
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
  const fightMs = startMs + ROOM_BOSS_RISE_MS;
  for (let hit = 1; hit <= ROOM_BOSSES.hallway.hp; hit += 1) {
    const boss = resolveRoomBoss(state, fightMs)!;
    const result = resolveRoomBossSparks(state, sparkAt(boss.x), boss);
    equal(result.events[0]?.type, hit < ROOM_BOSSES.hallway.hp ? 'ROOM_BOSS_HIT' : 'ROOM_BOSS_DISPELLED', `spark ${hit}`);
    equal(result.combat.projectiles.length, 0, `spark ${hit} is consumed`);
    state = result.adventure;
  }
  equal(resolveRoomBoss(state, fightMs), undefined, 'a dispelled boss is gone');
  const missed = resolveRoomBossSparks(adventure, sparkAt(8), resolveRoomBoss(adventure, fightMs));
  equal(missed.events.length, 0, 'a spark far from the boss flies on');
});

void test('the Wraith can be hit only once solid, and the Roach only reaches grounded players', () => {
  const wraith = awake('living-room');
  const faint = resolveRoomBoss(wraith.adventure, wraith.startMs + ROOM_BOSS_RISE_MS)!;
  equal(faint.pose, 'telegraph', 'each blink starts faint');
  equal(resolveRoomBossSparks(wraith.adventure, sparkAt(faint.x), faint).events.length, 0, 'sparks pass through a faint Wraith');
  equal(isPlayerTouchingRoomBoss({ x: faint.x, grounded: true }, faint), false, 'a faint Wraith does not hurt');
  const solid = resolveRoomBoss(wraith.adventure, wraith.startMs + ROOM_BOSS_RISE_MS + WRAITH_BLINK.telegraphMs)!;
  equal(solid.hittable && solid.dangerous, true, 'a solid Wraith hurts and can be hit');

  const roach = awake('kitchen');
  const charging = resolveRoomBoss(roach.adventure, roach.startMs + ROOM_BOSS_RISE_MS + ROACH_CHARGE.waitMs + ROACH_CHARGE.chargeMs / 2)!;
  equal(charging.pose, 'charge', 'the Roach charges after waiting');
  equal(charging.x > ROACH_CHARGE.leftX && charging.x < ROACH_CHARGE.rightX, true, 'mid-charge it crosses the floor');
  equal(isPlayerTouchingRoomBoss({ x: charging.x, grounded: true }, charging), true, 'a grounded Wally is run over');
  equal(isPlayerTouchingRoomBoss({ x: charging.x, grounded: false }, charging), false, 'jumping clears the Roach');
});
