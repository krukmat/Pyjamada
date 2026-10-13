/**
 * `npm run qa:bot` - balance report produced by the headless QA bot.
 * Prints Markdown tables; it never fails the build (see adventure-bot.test.ts for gates).
 */
import type { RoomId } from '../src/game/adventure/AdventureState';
import { ACTIVE_ROOM_IDS } from '../src/game/adventure/RoomRegistry';
import { createBotStart, RandomBot, RouteBot, runBot, type BotRunResult } from './support/AdventureBot';

const REACTIONS_MS = [800, 400, 200, 0] as const;
const FUZZ_SEEDS = 25;
const FUZZ_MS = 45_000;

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function routeLabel(reactionMs: number): string {
  return reactionMs === 0 ? 'no dodging' : `sees ${reactionMs}ms ahead`;
}

const routes = REACTIONS_MS.map(reactionMs => {
  const bot = new RouteBot(reactionMs);
  const result = runBot(createBotStart(`qa-report-${reactionMs}`), bot, { maxGameMs: 20 * 60_000, stallMs: 120_000 });
  return { reactionMs, result, shadowed: [...bot.shadowed] };
});

console.log('## Route bot (full adventure, false escape -> ending)\n');
console.log('| Bot | Outcome | Game time | Hits | Deaths | Final HP | Violations |');
console.log('|---|---|---:|---:|---:|---:|---:|');
for (const { reactionMs, result } of routes) {
  const { hp, maxHp } = result.world.session.combat;
  console.log(`| ${routeLabel(reactionMs)} | ${result.outcome} | ${seconds(result.gameTimeMs)} | ${result.hits} | ${result.deaths} | ${hp}/${maxHp} | ${result.violations.length} |`);
}
const shadowed = [...new Set(routes.flatMap(route => route.shadowed))];
if (shadowed.length > 0) console.log(`\n- Interactions unreachable once a nearer target unlocks: ${shadowed.join(', ')}`);
for (const { reactionMs, result } of routes) {
  if (result.outcome !== 'completed') console.log(`\n- ${routeLabel(reactionMs)}: ${result.diagnostic}`);
  for (const violation of result.violations) console.log(`  - violation: ${violation}`);
}

console.log('\n## Hits taken per room (route bot)\n');
console.log(`| Room | Time (800ms bot) | ${REACTIONS_MS.map(routeLabel).join(' | ')} |`);
console.log(`|---|---:|${REACTIONS_MS.map(() => '---:').join('|')}|`);
for (const room of ACTIVE_ROOM_IDS) {
  const cells = routes.map(({ result }) => {
    const stats = result.rooms[room];
    if (!stats) return '-';
    return stats.deaths > 0 ? `${stats.hits} (${stats.deaths} deaths)` : `${stats.hits}`;
  });
  console.log(`| ${room} | ${seconds(routes[0].result.rooms[room]?.timeMs ?? 0)} | ${cells.join(' | ')} |`);
}

const seedRun: BotRunResult = routes[0].result;
const THREAT_ROOMS = ['hallway', 'living-room', 'kitchen', 'bathroom', 'attic'] as const;
console.log('\n## Room threats in isolation (each room entered with full HP, until Wally leaves it)\n');
console.log(`| Room | ${REACTIONS_MS.map(routeLabel).join(' | ')} |`);
console.log(`|---|${REACTIONS_MS.map(() => '---:').join('|')}|`);
for (const room of THREAT_ROOMS) {
  const start = seedRun.roomEntries[room];
  if (!start) continue;
  const full = { ...start, session: { ...start.session, combat: { ...start.session.combat, hp: start.session.combat.maxHp } } };
  const cells = REACTIONS_MS.map(reactionMs => {
    const result = runBot(full, new RouteBot(reactionMs), { maxGameMs: 5 * 60_000, stallMs: 120_000, stopOnRoomExit: true });
    const suffix = result.outcome === 'completed' ? '' : ` (${result.outcome})`;
    return `${result.hits} hits${suffix}`;
  });
  console.log(`| ${room} | ${cells.join(' | ')} |`);
}

console.log(`\n## Random fuzz (${FUZZ_SEEDS} seeded runs x ${FUZZ_MS / 1000}s from each room entry)\n`);
console.log('| Start room | Died | Hits/min | Rooms reached | Violations |');
console.log('|---|---:|---:|---:|---:|');
for (const room of ACTIVE_ROOM_IDS) {
  const start = seedRun.roomEntries[room as RoomId];
  if (!start) {
    console.log(`| ${room} | - | - | - | not reached by route bot |`);
    continue;
  }
  let died = 0;
  let hits = 0;
  let timeMs = 0;
  let violations = 0;
  const reached = new Set<string>();
  for (let seed = 0; seed < FUZZ_SEEDS; seed += 1) {
    const result = runBot(start, new RandomBot(`fuzz-${room}-${seed}`), { maxGameMs: FUZZ_MS });
    if (result.outcome === 'died') died += 1;
    hits += result.hits;
    timeMs += result.gameTimeMs;
    violations += result.violations.length;
    for (const visited of Object.keys(result.rooms)) reached.add(visited);
  }
  console.log(`| ${room} | ${Math.round((died / FUZZ_SEEDS) * 100)}% | ${(hits / (timeMs / 60_000)).toFixed(1)} | ${reached.size} | ${violations} |`);
}
