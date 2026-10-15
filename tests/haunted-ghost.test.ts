import { HAUNTED_STEP_MS } from '../src/game/haunted/FixedStepClock';
import { PLAYER_HIT_RULES } from '../src/game/haunted/HauntedCombat';
import { pressAction, setHeldControl } from '../src/game/haunted/HauntedInput';
import { HAUNTED_ESCAPE_GHOST_X, HAUNTED_EXIT, HAUNTED_PRESSURE, createHauntedSession, stepHauntedSession } from '../src/game/haunted/HauntedSessionRuntime';
import { GHOST_RULES, isGhostDangerous, resolveGhostPhase } from '../src/game/haunted/HauntedThreats';
import { HAUNTED_GHOST_ATLAS } from '../src/game/presentation/atlas/HauntedGhostAtlas';
import { validateSpriteAtlasManifest } from '../src/game/presentation/atlas/SpriteAtlas';

function equal(actual: unknown, expected: unknown, label: string) {
  if (actual !== expected) throw new Error(`${label}: ${String(actual)} !== ${String(expected)}`);
}
function ok(value: unknown, label: string) { if (!value) throw new Error(label); }

equal(HAUNTED_GHOST_ATLAS.width, 256, 'Ghost atlas width is frozen');
equal(HAUNTED_GHOST_ATLAS.height, 80, 'Ghost atlas height is frozen');
equal(validateSpriteAtlasManifest(HAUNTED_GHOST_ATLAS).length, 0, 'Ghost atlas manifest is valid');

let session = createHauntedSession('ghost-spawn');
session = {
  ...session,
  elapsedMs: GHOST_RULES.graceMs - HAUNTED_STEP_MS,
  threats: { ...session.threats, nextSpawnAtMs: GHOST_RULES.graceMs },
};
let stepped = stepHauntedSession(session, HAUNTED_STEP_MS);
session = stepped.state;
ok(stepped.events.some((event) => event.type === 'GHOST_TELEGRAPHED'), 'Ghost announces itself before becoming dangerous');
equal(session.threats.ghosts.length, 1, 'telegraph creates one Ghost slot');
equal(session.threats.ghosts[0]?.phase, 'telegraph', 'new Ghost starts in telegraph phase');
equal(session.threats.ghosts[0]?.x, 122, 'Wally near the left edge forces a safe right-side Ghost spawn');

for (let i = 0; i < 20 && session.threats.ghosts[0]?.phase !== 'active'; i += 1) {
  stepped = stepHauntedSession(session, HAUNTED_STEP_MS);
  session = stepped.state;
}
equal(session.threats.ghosts[0]?.phase, 'active', 'Ghost becomes active after telegraph window');

let killSession = createHauntedSession('ghost-kill');
killSession = {
  ...killSession,
  threats: {
    ...killSession.threats,
    nextSpawnAtMs: 99_999,
    ghosts: [{
      id: 1,
      x: killSession.player.x + 8,
      y: killSession.player.y - 18,
      phase: 'active',
      phaseUntilMs: 0,
    }],
    nextEnemyId: 2,
  },
  input: pressAction(killSession.input, 'attack'),
};
stepped = stepHauntedSession(killSession, HAUNTED_STEP_MS);
killSession = stepped.state;
ok(stepped.events.some((event) => event.type === 'DREAM_SPARK_FIRED'), 'Wally fires Dream Spark at Ghost');
ok(stepped.events.some((event) => event.type === 'GHOST_DEFEATED'), 'Dream Spark defeats Ghost on overlap');
equal(killSession.threats.ghosts[0]?.phase, 'dying', 'defeated Ghost enters short death phase');
equal(killSession.combat.projectiles.length, 0, 'Dream Spark is consumed on Ghost hit');

let hitSession = createHauntedSession('ghost-contact');
hitSession = {
  ...hitSession,
  threats: {
    ...hitSession.threats,
    nextSpawnAtMs: 99_999,
    ghosts: [{
      id: 1,
      x: hitSession.player.x,
      y: hitSession.player.y - 18,
      phase: 'active',
      phaseUntilMs: 0,
    }],
    nextEnemyId: 2,
  },
};
stepped = stepHauntedSession(hitSession, HAUNTED_STEP_MS);
hitSession = stepped.state;
ok(stepped.events.some((event) => event.type === 'PLAYER_HIT_BY_GHOST'), 'Ghost contact produces player-hit event');
equal(hitSession.combat.hp, 2, 'Ghost contact removes one heart');
ok(hitSession.combat.invulnerableUntilMs > hitSession.elapsedMs, 'Wally receives temporary invulnerability');

const hpDuringInvulnerability = hitSession.combat.hp;
stepped = stepHauntedSession(hitSession, HAUNTED_STEP_MS);
hitSession = stepped.state;
equal(hitSession.combat.hp, hpDuringInvulnerability, 'contact cannot drain multiple hearts during invulnerability');
ok(!stepped.events.some((event) => event.type === 'PLAYER_HIT_BY_GHOST'), 'invulnerability suppresses repeated contact event');

// One touch costs one heart: the Ghost that hit is flung away and harmless
// while it recoils, even when the player keeps walking into it.
const hitAtMs = hitSession.elapsedMs - HAUNTED_STEP_MS;
const recoilStartX = createHauntedSession('ghost-contact').player.x; // where the Ghost touched Wally
equal(hitSession.threats.ghosts[0]?.phaseUntilMs, hitAtMs + GHOST_RULES.recoilMs, 'the Ghost that hit Wally recoils');
equal(resolveGhostPhase(hitSession.threats.ghosts[0]!, hitSession.elapsedMs), 'recoil', 'recoil is a derived phase');
ok(!isGhostDangerous(hitSession.threats.ghosts[0]!, hitSession.elapsedMs), 'a recoiling Ghost cannot hurt Wally');
let pushChecked = false;
let pushSession = hitSession;
while (!pushChecked) {
  pushSession = stepHauntedSession(pushSession, HAUNTED_STEP_MS).state;
  if (pushSession.elapsedMs - hitAtMs >= GHOST_RULES.recoilPushMs) {
    ok(Math.abs(pushSession.threats.ghosts[0]!.x - recoilStartX) >= GHOST_RULES.recoilPushDistance - 1, 'recoil pushes the Ghost about 28 units away');
    pushChecked = true;
  }
}

// A Wally who holds still after a hit is not hit again the moment his
// invulnerability ends: the Ghost was cleared off him and must come back.
// (Without recoil a Ghost sitting on Wally hit again as soon as it ended.)
function hitTimesAfterContact(seed: string, steer: (session: typeof hitSession) => -1 | 0 | 1, durationMs: number): number[] {
  let contact = createHauntedSession(seed);
  contact = {
    ...contact,
    combat: { ...contact.combat, nextProjectileId: 2 },
    threats: { ...contact.threats, nextSpawnAtMs: 99_999, nextEnemyId: 3, ghosts: [{ id: 2, x: contact.player.x, y: contact.player.y - 18, phase: 'active', phaseUntilMs: 0 }] },
  };
  const times: number[] = [];
  for (let elapsed = 0; elapsed < durationMs; elapsed += HAUNTED_STEP_MS) {
    const move = steer(contact);
    const input = setHeldControl(setHeldControl(contact.input, 'right', move > 0), 'left', move < 0);
    const step = stepHauntedSession({ ...contact, input }, HAUNTED_STEP_MS);
    contact = step.state;
    if (step.events.some((event) => event.type === 'PLAYER_HIT_BY_GHOST')) times.push(contact.elapsedMs);
  }
  return times;
}
const stillHits = hitTimesAfterContact('ghost-recoil-still', () => 0, 4_500);
ok(stillHits.length >= 2 && stillHits[1]! - stillHits[0]! >= PLAYER_HIT_RULES.invulnerabilityMs + 500, `a still Wally gets a breather after a hit: hits ${stillHits.join(', ')} ms`);
// Walking straight into the Ghost still costs one heart per touch, never a chain.
const hugHits = hitTimesAfterContact('ghost-recoil-hug', (session) => {
  const target = session.threats.ghosts.find((ghost) => ghost.phase === 'active');
  return target === undefined ? 0 : target.x > session.player.x ? 1 : -1;
}, 4_500);
hugHits.slice(1).forEach((atMs, index) => {
  ok(atMs - hugHits[index]! >= PLAYER_HIT_RULES.invulnerabilityMs, `each Ghost touch costs one heart: hits ${hugHits.join(', ')} ms`);
});
ok(hugHits.length < 3 || hugHits[2]! - hugHits[0]! >= 2_999, 'a Ghost cannot take three hearts in under three seconds');

// The run's first Ghost hovers short of Wally until he fires his first Dream Spark.
let lesson = createHauntedSession('first-ghost-lesson');
lesson = {
  ...lesson,
  player: { ...lesson.player, x: 30, vx: 0 },
  domestic: { ...lesson.domestic, player: { ...lesson.domestic.player, x: 30 } },
  threats: { ...lesson.threats, nextSpawnAtMs: 99_999, nextEnemyId: 2, ghosts: [{ id: 1, x: 90, y: lesson.player.y - 18, phase: 'active', phaseUntilMs: 0 }] },
};
for (let elapsed = 0; elapsed < 6_000; elapsed += HAUNTED_STEP_MS) {
  stepped = stepHauntedSession(lesson, HAUNTED_STEP_MS);
  lesson = stepped.state;
  ok(!stepped.events.some((event) => event.type === 'PLAYER_HIT_BY_GHOST'), 'the first Ghost never reaches a Wally who stands still');
}
ok(Math.abs(lesson.threats.ghosts[0]!.x - lesson.player.x - GHOST_RULES.firstGhostHoverDistance) < 0.5, 'the first Ghost hovers at its lesson distance');
const lessonHp = lesson.combat.hp;
lesson = { ...lesson, combat: { ...lesson.combat, nextProjectileId: 2 } };
for (let elapsed = 0; elapsed < 2_000; elapsed += HAUNTED_STEP_MS) lesson = stepHauntedSession(lesson, HAUNTED_STEP_MS).state;
equal(lesson.combat.hp, lessonHp - 1, 'after the first Dream Spark the first Ghost closes in like any other');

let sleepyBypass = createHauntedSession('sleepy-bypass');
sleepyBypass = {
  ...sleepyBypass,
  player: { ...sleepyBypass.player, x: 68, vx: 0 },
  domestic: { ...sleepyBypass.domestic, player: { ...sleepyBypass.domestic.player, x: 68 } },
  threats: { ...sleepyBypass.threats, nextSpawnAtMs: 99_999 },
  input: pressAction(sleepyBypass.input, 'interact'),
};
stepped = stepHauntedSession(sleepyBypass, HAUNTED_STEP_MS);
sleepyBypass = stepped.state;
ok(!sleepyBypass.domestic.flags.dressed, 'sleepy Wally cannot bypass wake-up by using the wardrobe');
ok(
  stepped.events.some((event) => event.type === 'DOMESTIC_INTERACTION' && event.ruleTrace.includes('sleepy-action-blocked')),
  'sleepy objective attempt resolves as a fumble',
);

let bedWake = createHauntedSession('bed-wakes-haunting');
bedWake = {
  ...bedWake,
  player: { ...bedWake.player, x: 16, vx: 0 },
  domestic: { ...bedWake.domestic, player: { ...bedWake.domestic.player, x: 16 } },
  threats: { ...bedWake.threats, nextSpawnAtMs: 99_999 },
  input: pressAction(bedWake.input, 'interact'),
};
stepped = stepHauntedSession(bedWake, HAUNTED_STEP_MS);
bedWake = stepped.state;
equal(bedWake.domestic.wallyState, 'normal', 'bed wakes Wally before the arcade pressure begins');
equal(
  bedWake.threats.nextSpawnAtMs,
  bedWake.elapsedMs + HAUNTED_PRESSURE.wakeSpawnDelayMs,
  'waking through bed schedules the first Ghost encounter',
);

let alarmSession = createHauntedSession('alarm-attracts-ghost');
alarmSession = {
  ...alarmSession,
  player: { ...alarmSession.player, x: 48, vx: 0 },
  domestic: { ...alarmSession.domestic, player: { ...alarmSession.domestic.player, x: 48 } },
  threats: { ...alarmSession.threats, nextSpawnAtMs: 99_999 },
  input: pressAction(alarmSession.input, 'interact'),
};
stepped = stepHauntedSession(alarmSession, HAUNTED_STEP_MS);
alarmSession = stepped.state;
ok(stepped.events.some((event) => event.type === 'DOMESTIC_INTERACTION' && event.objectId === 'alarm-clock'), 'alarm interaction remains a domestic event');
equal(
  alarmSession.threats.nextSpawnAtMs,
  alarmSession.elapsedMs + HAUNTED_PRESSURE.alarmSpawnDelayMs,
  'alarm pulls the next Ghost spawn forward',
);

let pressureSession = createHauntedSession('escape-pressure');
pressureSession = {
  ...pressureSession,
  domestic: {
    ...pressureSession.domestic,
    flags: { ...pressureSession.domestic.flags, dressed: true },
    collected: ['keys'],
  },
  threats: { ...pressureSession.threats, nextSpawnAtMs: 99_999 },
};
stepped = stepHauntedSession(pressureSession, HAUNTED_STEP_MS);
pressureSession = stepped.state;
equal(pressureSession.objective.phase, 'escape-ready', 'prepared Wally enters escape-ready phase');
ok(stepped.events.some((event) => event.type === 'GHOST_TELEGRAPHED'), 'escape-ready immediately telegraphs the final Ghost');
equal(pressureSession.threats.ghosts.length, 1, 'escape lane receives one final Ghost when capacity allows');
equal(pressureSession.threats.ghosts[0]?.x, HAUNTED_ESCAPE_GHOST_X, 'final Ghost blocks the window/exit lane');
equal(pressureSession.threats.ghosts[0]?.phase, 'telegraph', 'final Ghost remains fair through its telegraph window');

let exitSession = createHauntedSession('haunted-exit');
exitSession = {
  ...exitSession,
  domestic: {
    ...exitSession.domestic,
    flags: { ...exitSession.domestic.flags, dressed: true },
    collected: ['keys'],
    player: { ...exitSession.domestic.player, x: HAUNTED_EXIT.x },
  },
  player: { ...exitSession.player, x: HAUNTED_EXIT.x },
  objective: { phase: 'escape-ready' },
  threats: { ...exitSession.threats, nextSpawnAtMs: 99_999 },
  input: pressAction(exitSession.input, 'interact'),
};
stepped = stepHauntedSession(exitSession, HAUNTED_STEP_MS);
exitSession = stepped.state;
equal(exitSession.objective.phase, 'completed', 'escape-ready Wally completes the run at the exit door');
ok(stepped.events.some((event) => event.type === 'SESSION_COMPLETED'), 'exit interaction emits completion event');

console.log('haunted Ghost gameplay tests passed');
