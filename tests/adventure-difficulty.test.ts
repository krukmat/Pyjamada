import { equal, test } from './assert';
import { livesLeft, wakesFromKnockout } from '../src/game/adventure/AdventureDifficulty';
import { createAdventureGameSession } from '../src/game/adventure/AdventureGameSession';
import { decodeAdventureGameSession, encodeAdventureGameSession } from '../src/game/adventure/AdventureSessionCodec';
import { createAdventureState, setRoomSwitch, type AdventureState } from '../src/game/adventure/AdventureState';
import { restoreRoomCheckpointState, shouldUseRoomCheckpoint } from '../src/game/adventure/RoomCheckpoint';
import {
  armRoomBoss,
  ROACH_CHARGE,
  stepRoomBossChase,
  CUCKOO_FLIGHT,
  dispelBoss,
  lockRoomBossAim,
  resolveRoomBoss,
  ROOM_BOSS_RISE_MS,
  ROOM_BOSSES,
} from '../src/game/adventure/RoomBossHazard';
import { createBotStart, RouteBot, runBot, type BotRunResult } from '../src/game/bot/AdventureBot';
import { HumanBot } from '../src/game/bot/HumanBot';
import { HUMAN_PROFILES, type HumanProfileId } from '../src/game/bot/HumanProfiles';
import { createHauntedSession } from '../src/game/haunted/HauntedSessionRuntime';
import { resolveVesperNightmareState, VESPER_NIGHTMARE_ATTACK, VESPER_NIGHTMARE_CYCLE_MS } from '../src/game/adventure/LaboratoryVesperNightmare';
import { explorationIn, laboratoryIn } from './support/ThreatScenarios';

void test('the level is saved with the run; saves without one are level 1', () => {
  const session = createAdventureGameSession('difficulty-codec', 3);
  const decoded = decodeAdventureGameSession(encodeAdventureGameSession({ ...session, adventure: { ...session.adventure, knockouts: 2 } }));
  equal(decoded.status, 'ok', 'a level 3 run round-trips');
  if (decoded.status !== 'ok') return;
  equal(decoded.state.adventure.difficulty, 3, 'level restored');
  equal(decoded.state.adventure.knockouts, 2, 'knock-outs restored');
  equal(createAdventureGameSession('difficulty-default').adventure.difficulty, undefined, 'level 1 is stored as no level');
  const raw = JSON.parse(encodeAdventureGameSession(session)) as { adventure: Record<string, unknown> };
  equal(decodeAdventureGameSession(JSON.stringify({ ...raw, adventure: { ...raw.adventure, difficulty: 4 } })).status, 'invalid', 'an unknown level is rejected');
  equal(decodeAdventureGameSession(JSON.stringify({ ...raw, adventure: { ...raw.adventure, knockouts: -1 } })).status, 'invalid', 'a negative knock-out count is rejected');
});

void test('Night Terror runs out of lives; the other levels never do', () => {
  const dead = { ...createHauntedSession('lives'), objective: { phase: 'failed' as const, reason: 'haunted' as const } };
  const kitchen = (difficulty: 1 | 3, knockouts: number): AdventureState => ({ ...explorationIn('kitchen'), currentEntry: 'kitchen-from-living-room', difficulty, knockouts });
  equal(wakesFromKnockout(kitchen(1, 50)), true, 'level 1 has unlimited knock-outs');
  equal(livesLeft(kitchen(3, 0)), 2, 'Night Terror starts with two lives to spare');
  equal(wakesFromKnockout(kitchen(3, 1)), true, 'the second knock-out still wakes at the door');
  equal(wakesFromKnockout(kitchen(3, 2)), false, 'the third ends the run');
  equal(shouldUseRoomCheckpoint(dead, kitchen(3, 2)), false, 'no room checkpoint once the lives are gone');
  equal(restoreRoomCheckpointState(dead, kitchen(3, 1)).adventure.knockouts, 2, 'every wake-up is counted');
});

void test('on Night Terror the Cuckoo lands where Wally stood when it called', () => {
  const awake = (difficulty: 1 | 3) => {
    const hallway = setRoomSwitch({ ...createAdventureState(difficulty), currentRoom: 'hallway' }, 'hallway', ROOM_BOSSES.hallway.guardSwitch, true);
    return armRoomBoss(dispelBoss(hallway, ROOM_BOSSES.hallway), 1_000);
  };
  const callMs = (start: number) => start + ROOM_BOSS_RISE_MS;
  const hopMs = (start: number) => callMs(start) + 300 + CUCKOO_FLIGHT.diveMs + 100;
  const terror = awake(3);
  const locked = lockRoomBossAim(terror.adventure, callMs(terror.elapsedMs), 30);
  equal(lockRoomBossAim(locked, callMs(terror.elapsedMs) + 200, 90), locked, 'the aim stays put for the whole attack');
  const landed = resolveRoomBoss(locked, hopMs(terror.elapsedMs), 90)!;
  equal(landed.pose, 'hop', 'it lands and hops');
  equal(landed.x, 30, 'on the spot Wally stood at, not where he went');
  const restless = awake(1);
  const bent = resolveRoomBoss(lockRoomBossAim(restless.adventure, callMs(restless.elapsedMs), 30), hopMs(restless.elapsedMs), 90)!;
  equal(bent.aimX, undefined, 'level 1 never locks an aim');
});

/**
 * The difficulty target, measured with three HumanBot skill profiles (casual,
 * average, expert): they differ in reflexes and in how much of the rooms'
 * rhythm they have learned (anticipateMs; see HumanProfiles). Level 1 is easy for everyone; level 2 costs the casual
 * player a few knock-outs; on level 3 the casual player runs out of lives
 * around the middle of the house, the average player finishes after a couple
 * of knock-outs and the expert loses at most one life.
 */
const OPTIONS = { maxGameMs: 20 * 60_000, stallMs: 180_000 };
const start = (difficulty: 1 | 2 | 3) => {
  const world = createBotStart('qa-bot-route');
  return { ...world, adventure: { ...world.adventure, difficulty } };
};
const play = (difficulty: 1 | 2 | 3, profile: HumanProfileId): BotRunResult =>
  runBot(start(difficulty), new HumanBot({ ...HUMAN_PROFILES[profile], seed: 'demo' }), OPTIONS);
const finishes = (result: BotRunResult, maxDeaths: number, label: string) => {
  equal(result.outcome, 'completed', `${label} finishes (${result.diagnostic})`);
  equal(result.deaths <= maxDeaths, true, `${label}: at most ${maxDeaths} knock-outs, got ${result.deaths}`);
};

void test('a perfect player is never knocked out on any level', () => {
  for (const difficulty of [1, 2, 3] as const) {
    const result = runBot(start(difficulty), new RouteBot(800), OPTIONS);
    finishes(result, 0, `level ${difficulty} route bot`);
  }
});

void test('difficulty matrix: who finishes each level, and how many lives it costs', () => {
  // Vesper's rhythm can still catch a casual player twice on level 1.
  finishes(play(1, 'casual'), 2, 'level 1 casual');
  finishes(play(1, 'average'), 1, 'level 1 average');
  finishes(play(1, 'expert'), 1, 'level 1 expert');

  const casual2 = play(2, 'casual');
  finishes(casual2, 3, 'level 2 casual');
  equal(casual2.deaths >= 2, true, `level 2 costs the casual player some lives, got ${casual2.deaths}`);
  finishes(play(2, 'average'), 1, 'level 2 average');
  finishes(play(2, 'expert'), 1, 'level 2 expert');

  const casual3 = play(3, 'casual');
  equal(casual3.outcome, 'died', `level 3 casual runs out of lives (${casual3.diagnostic})`);
  equal(casual3.rooms.kitchen !== undefined && casual3.rooms.bathroom === undefined, true, 'around the middle of the house');
  const average3 = play(3, 'average');
  finishes(average3, 2, 'level 3 average');
  equal(average3.deaths >= 2, true, `level 3 costs the average player a couple of lives, got ${average3.deaths}`);
  const expert3 = play(3, 'expert');
  finishes(expert3, 1, 'level 3 expert');
  equal(expert3.hits > play(2, 'expert').hits, true, 'level 3 costs the expert more than level 2');
});

void test('on Night Terror Vesper changes the order of its attacks every cycle', () => {
  const firstAttacks = (difficulty: 1 | 3) => [0, 1, 2, 3, 4, 5].map(cycle => {
    const strikeMs = cycle * VESPER_NIGHTMARE_CYCLE_MS + VESPER_NIGHTMARE_ATTACK.telegraphMs;
    return resolveVesperNightmareState({ ...laboratoryIn('nightmare'), difficulty }, strikeMs).attack;
  });
  equal(new Set(firstAttacks(1)).size, 1, 'level 1 always opens with the same attack');
  equal(new Set(firstAttacks(3)).size, 3, 'Night Terror opens with every attack in turn');
});

void test('the Roach crawls toward Wally while it waits, then charges from there', () => {
  const kitchen = setRoomSwitch({ ...createAdventureState(3), currentRoom: 'kitchen' }, 'kitchen', ROOM_BOSSES.kitchen.guardSwitch, true);
  const { adventure, elapsedMs } = armRoomBoss(kitchen, 1_000);
  let chase: ReturnType<typeof stepRoomBossChase>;
  let t = elapsedMs + ROOM_BOSS_RISE_MS;
  for (let step = 0; step < 30; step += 1, t += 33) chase = stepRoomBossChase(adventure, t, 100, chase, 33);
  const crawling = resolveRoomBoss(adventure, t, 100, chase)!;
  equal(crawling.pose, 'wait', 'still waiting');
  equal(crawling.x > ROACH_CHARGE.leftX + 10, true, `it crawled out toward Wally (x=${crawling.x})`);
  equal(crawling.x < 100, true, 'but stays behind him');
  equal(resolveRoomBoss(adventure, t, 100)!.x, ROACH_CHARGE.leftX, 'without its crawl it waits at the wall');
});
