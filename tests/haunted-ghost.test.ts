import { HAUNTED_STEP_MS } from '../src/game/haunted/FixedStepClock';
import { pressAction } from '../src/game/haunted/HauntedInput';
import { HAUNTED_EXIT, createHauntedSession, stepHauntedSession } from '../src/game/haunted/HauntedSessionRuntime';
import { GHOST_RULES } from '../src/game/haunted/HauntedThreats';
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
