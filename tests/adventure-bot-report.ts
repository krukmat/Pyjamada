/**
 * `npm run qa:bot` - balance report produced by the headless QA bots.
 * Prints Markdown; it never fails the build (see adventure-bot.test.ts for gates
 * and docs/QA_BOT.md for the pending balance targets listed at the end).
 */
import type { RoomId } from '../src/game/adventure/AdventureState';
import { ACTIVE_ROOM_IDS } from '../src/game/adventure/RoomRegistry';
import { HAUNTED_DEFAULT_DEADLINE_MS } from '../src/game/haunted/HauntedSessionRuntime';
import {
  createBotNewGame,
  createBotStart,
  RandomBot,
  RouteBot,
  runBot,
  type BotRunResult,
  type BotWorld,
} from './support/AdventureBot';
import { GhostHuggerBot, HumanBot, IdleBot, type HumanThreatResponse } from './support/HumanBot';
import { isTelegraphed, measureWarningLead, THREAT_SCENARIOS } from './support/ThreatScenarios';

const ENTRY_DELAYS_MS = Array.from({ length: 11 }, (_, index) => index * 200);
const BEDROOM_SEEDS = ['qa-bedroom-a', 'qa-bedroom-b', 'qa-bedroom-c'];
const ROOM_OPTIONS = { maxGameMs: 3 * 60_000, stallMs: 60_000, stopOnRoomExit: true };
const FULL_OPTIONS = { maxGameMs: 20 * 60_000, stallMs: 120_000 };
const FUZZ_SEEDS = 25;
const FUZZ_MS = 45_000;
const THREAT_ROOMS = ['hallway', 'living-room', 'kitchen', 'bathroom', 'attic', 'basement', 'laboratory'] as const satisfies readonly RoomId[];

type HumanPolicyId = 'human' | 'reader' | 'walker';
const HUMAN_POLICIES: readonly { id: HumanPolicyId; label: string; response: HumanThreatResponse }[] = [
  { id: 'human', label: 'HumanBot', response: 'always' },
  { id: 'reader', label: 'Reader probe', response: 'not-while-reading' },
  { id: 'walker', label: 'No-dodge walker', response: 'never' },
];

function human(response: HumanThreatResponse, startDelayMs = 0, seed = 'qa-report'): HumanBot {
  return new HumanBot({ threatResponse: response, startDelayMs, seed });
}

function seconds(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percent(count: number, total: number): string {
  return `${Math.round((count / Math.max(1, total)) * 100)}%`;
}

function withFullHp(world: BotWorld): BotWorld {
  return { ...world, session: { ...world.session, combat: { ...world.session.combat, hp: world.session.combat.maxHp } } };
}

function failureReason(result: BotRunResult): string {
  const objective = result.world.session.objective;
  return objective.phase === 'failed' ? objective.reason ?? 'unknown' : result.outcome;
}

/** Shortest time in which `maxHp` consecutive hearts were lost (a contact chain that kills from full HP). */
function fastestKillChainMs(result: BotRunResult): number | undefined {
  const needed = result.world.session.combat.maxHp;
  let fastest: number | undefined;
  for (let index = 0; index + needed - 1 < result.hitTimesMs.length; index += 1) {
    const span = result.hitTimesMs[index + needed - 1] - result.hitTimesMs[index];
    fastest = fastest === undefined ? span : Math.min(fastest, span);
  }
  return fastest;
}

const notes: string[] = [];
const started = Date.now();

console.log('# QA bot report\n');
console.log('Human model (`tests/support/HumanBot.ts`): threats are seen only through `observeRoomThreats` (or the ghost');
console.log('sprites) 250 ms late, inputs land 100 ms late, one thumb (a tap releases the direction), 1.2 s of reading');
console.log('after each object. **Reader probe** never dodges while reading; **no-dodge walker** never reacts to threats');
console.log('(in the bedroom it never shoots ghosts). Distributions cover 11 entry delays (0-2 s in 200 ms steps).\n');

// ---------------------------------------------------------------------------
// First minute: the haunted bedroom run

type BedroomRow = { label: string; results: BotRunResult[] };
const bedroomRows: BedroomRow[] = HUMAN_POLICIES.map(policy => ({
  label: policy.label,
  results: BEDROOM_SEEDS.flatMap(seed => ENTRY_DELAYS_MS.map(delay =>
    runBot(createBotNewGame(seed), human(policy.response, delay, seed), ROOM_OPTIONS))),
}));
bedroomRows.push({
  label: 'Ghost hugger (walks into ghosts, never shoots)',
  results: BEDROOM_SEEDS.map(seed => runBot(createBotNewGame(seed), new GhostHuggerBot(), ROOM_OPTIONS)),
});
bedroomRows.push({
  label: 'Idle (reads the screen)',
  results: BEDROOM_SEEDS.map(seed => runBot(createBotNewGame(seed), new IdleBot(), ROOM_OPTIONS)),
});

console.log('## First minute: the haunted bedroom (new game -> false escape)\n');
console.log(`| Policy | Runs | Escaped | Died (reason) | Mean time | Hits mean / max | Hits at objects | First hit (mean) | Fastest 3-heart chain | HUD TIME left (escaped) |`);
console.log('|---|---:|---:|---|---:|---:|---:|---:|---:|---:|');
for (const row of bedroomRows) {
  const escaped = row.results.filter(result => result.outcome === 'completed');
  const died = row.results.filter(result => result.outcome === 'died');
  const reasons = [...new Set(died.map(failureReason))].join(', ');
  const firstHits = row.results.flatMap(result => result.hitTimesMs.slice(0, 1));
  const chains = row.results.map(fastestKillChainMs).filter((value): value is number => value !== undefined);
  const hudLeft = escaped.map(result => (HAUNTED_DEFAULT_DEADLINE_MS - result.world.session.elapsedMs - result.world.session.penaltyMs) / 1000);
  console.log(`| ${row.label} | ${row.results.length} | ${percent(escaped.length, row.results.length)} | ${percent(died.length, row.results.length)}${reasons ? ` (${reasons})` : ''} | ${seconds(mean(row.results.map(result => result.gameTimeMs)))} | ${mean(row.results.map(result => result.hits)).toFixed(1)} / ${Math.max(...row.results.map(result => result.hits))} | ${mean(row.results.map(result => result.hitsAtObjects)).toFixed(1)} | ${firstHits.length ? seconds(mean(firstHits)) : '-'} | ${chains.length ? seconds(Math.min(...chains)) : '-'} | ${hudLeft.length ? Math.round(mean(hudLeft)) : '-'} |`);
  for (const result of row.results) {
    if (result.outcome === 'stuck' || result.outcome === 'timeout') notes.push(`bedroom ${row.label}: ${result.diagnostic}`);
    for (const violation of result.violations) notes.push(`bedroom ${row.label} violation: ${violation}`);
  }
}
const idleBedroom = bedroomRows[bedroomRows.length - 1].results;
const idleSurvivalMs = Math.min(...idleBedroom.map(result => result.gameTimeMs));
const walkerBedroom = bedroomRows.find(row => row.label === 'No-dodge walker')!.results;
const walkerSurvivalMs = Math.min(...walkerBedroom.map(result => (result.outcome === 'died' ? result.gameTimeMs : Number.POSITIVE_INFINITY)));
const bedroomChainMs = Math.min(...bedroomRows.flatMap(row => row.results.map(fastestKillChainMs)).filter((value): value is number => value !== undefined));

// ---------------------------------------------------------------------------
// Rooms in isolation

const oracle = runBot(createBotStart('qa-report-800'), new RouteBot(800), FULL_OPTIONS);
type RoomCell = { results: BotRunResult[] };
const roomCells = new Map<string, RoomCell>();
for (const room of THREAT_ROOMS) {
  const entry = oracle.roomEntries[room];
  if (!entry) {
    notes.push(`${room}: not reached by the oracle route, so it has no entry snapshot`);
    continue;
  }
  for (const policy of HUMAN_POLICIES) {
    const results = ENTRY_DELAYS_MS.map(delay => runBot(withFullHp(entry), human(policy.response, delay, `qa-${room}`), ROOM_OPTIONS));
    roomCells.set(`${room}:${policy.id}`, { results });
    for (const result of results) {
      if (result.outcome === 'stuck' || result.outcome === 'timeout') notes.push(`${room} ${policy.label}: ${result.diagnostic}`);
      for (const violation of result.violations) notes.push(`${room} ${policy.label} violation: ${violation}`);
    }
  }
}

function cell(room: string, policy: HumanPolicyId, pick: (result: BotRunResult) => number, withDeaths: boolean): string {
  const results = roomCells.get(`${room}:${policy}`)?.results;
  if (!results) return '-';
  const values = results.map(pick);
  const deaths = results.filter(result => result.deaths > 0).length;
  const stuck = results.filter(result => result.outcome === 'stuck' || result.outcome === 'timeout').length;
  const suffix = withDeaths ? ` · ${percent(deaths, results.length)} died${stuck ? ` · ${stuck} stuck` : ''}` : '';
  return `${mean(values).toFixed(1)} / ${Math.max(...values)}${suffix}`;
}

console.log('\n## Rooms in isolation (entered at full HP, until Wally leaves the room)\n');
console.log('Hits per visit as mean / max over the 11 entry delays; "died" counts visits with a death (the Laboratory');
console.log('restarts from its phase checkpoint, every other room from its entry, as RETRY ROOM does in the App).\n');
console.log(`| Room | ${HUMAN_POLICIES.map(policy => policy.label).join(' | ')} | Mean time (HumanBot) |`);
console.log(`|---|${HUMAN_POLICIES.map(() => '---:').join('|')}|---:|`);
for (const room of THREAT_ROOMS) {
  const time = roomCells.get(`${room}:human`)?.results.map(result => result.gameTimeMs) ?? [];
  console.log(`| ${room} | ${HUMAN_POLICIES.map(policy => cell(room, policy.id, result => result.hits, true)).join(' | ')} | ${time.length ? seconds(mean(time)) : '-'} |`);
}

console.log('\n### Hits taken at objects: standing at one, or reading its text and looking up (mean / max per visit)\n');
console.log(`| Room | ${HUMAN_POLICIES.map(policy => policy.label).join(' | ')} |`);
console.log(`|---|${HUMAN_POLICIES.map(() => '---:').join('|')}|`);
for (const room of THREAT_ROOMS) {
  console.log(`| ${room} | ${HUMAN_POLICIES.map(policy => cell(room, policy.id, result => result.hitsAtObjects, false)).join(' | ')} |`);
}

// ---------------------------------------------------------------------------
// Whole game

type FullRow = { label: string; result: BotRunResult };
const fullRows: FullRow[] = HUMAN_POLICIES.map(policy => ({
  label: `${policy.label} (new game)`,
  result: runBot(createBotNewGame('qa-report-full'), human(policy.response, 0, 'qa-report-full'), FULL_OPTIONS),
}));
fullRows.push({ label: 'Oracle route bot, sees 800 ms ahead (false escape; not a human scale)', result: oracle });

console.log('\n## Whole game, one pass (deaths retry from the room checkpoint, as in the App)\n');
console.log('| Policy | Outcome | Game time | Hits | Deaths | Hits at objects | Per room (hits, x deaths) |');
console.log('|---|---|---:|---:|---:|---:|---|');
for (const { label, result } of fullRows) {
  const perRoom = ACTIVE_ROOM_IDS
    .filter(room => result.rooms[room])
    .map(room => `${room} ${result.rooms[room]!.hits}${result.rooms[room]!.deaths ? ` x${result.rooms[room]!.deaths}` : ''}`)
    .join(', ');
  const outcome = result.outcome === 'died' ? `died in ${result.world.adventure.currentRoom} (${failureReason(result)})` : result.outcome;
  console.log(`| ${label} | ${outcome} | ${seconds(result.gameTimeMs)} | ${result.hits} | ${result.deaths} | ${result.hitsAtObjects} | ${perRoom} |`);
  if (result.outcome === 'stuck' || result.outcome === 'timeout') notes.push(`${label}: ${result.diagnostic}`);
  for (const violation of result.violations) notes.push(`${label} violation: ${violation}`);
}

// ---------------------------------------------------------------------------
// Warnings

const leads = THREAT_SCENARIOS.filter(scenario => isTelegraphed(scenario.kind)).map(scenario => measureWarningLead(scenario));
console.log('\n## Shortest visible warning before each threat turns dangerous\n');
console.log('| Threat | Shortest warning | Unwarned onsets |');
console.log('|---|---:|---:|');
for (const lead of leads) console.log(`| ${lead.kind} | ${lead.minLeadMs}ms | ${lead.unwarned.length} |`);

// ---------------------------------------------------------------------------
// Fuzz

console.log(`\n## Random fuzz (${FUZZ_SEEDS} seeded runs x ${FUZZ_MS / 1000}s from each room entry)\n`);
console.log('| Start room | Died | Hits/min | Rooms reached | Violations |');
console.log('|---|---:|---:|---:|---:|');
for (const room of ACTIVE_ROOM_IDS) {
  const start = oracle.roomEntries[room as RoomId];
  if (!start) {
    console.log(`| ${room} | - | - | - | not reached by the oracle route |`);
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
  console.log(`| ${room} | ${percent(died, FUZZ_SEEDS)} | ${(hits / (timeMs / 60_000)).toFixed(1)} | ${reached.size} | ${violations} |`);
}

// ---------------------------------------------------------------------------
// Balance gates (docs/QA_BOT.md): reported here; the enforced ones are also tests.

function roomResults(policy: HumanPolicyId): { room: string; result: BotRunResult }[] {
  return THREAT_ROOMS.flatMap(room => (roomCells.get(`${room}:${policy}`)?.results ?? []).map(result => ({ room, result })));
}
const humanDeaths = roomResults('human').filter(({ result }) => result.deaths > 0);
const humanWorst = Math.max(...roomResults('human').map(({ result }) => result.hits));
const readerAtObjects = roomResults('reader').reduce((sum, { result }) => sum + result.hitsAtObjects, 0);
const walkerDeaths = roomResults('walker').filter(({ result }) => result.deaths > 0);
const shortestLead = leads.reduce((best, lead) => (lead.minLeadMs < best.minLeadMs ? lead : best));
const pending: { gate: string; now: string; pass: boolean; enforced?: true }[] = [
  { gate: 'HumanBot never dies in a room entered at full HP', now: humanDeaths.length ? `deaths in ${[...new Set(humanDeaths.map(entry => entry.room))].join(', ')}` : 'no deaths', pass: humanDeaths.length === 0, enforced: true },
  { gate: 'HumanBot takes at most 1 hit per room visit', now: `worst visit ${humanWorst} hits`, pass: humanWorst <= 1, enforced: true },
  { gate: 'Reader probe takes 0 hits at objects (reading spots are safe)', now: `${readerAtObjects} hits over ${roomResults('reader').length} visits`, pass: readerAtObjects === 0, enforced: true },
  { gate: 'No-dodge walker never dies in a room entered at full HP', now: walkerDeaths.length ? `deaths in ${[...new Set(walkerDeaths.map(entry => entry.room))].join(', ')}` : 'no deaths', pass: walkerDeaths.length === 0 },
  { gate: 'A ghost contact costs one heart (no 3-heart chain under 3 s)', now: Number.isFinite(bedroomChainMs) ? `fastest chain ${seconds(bedroomChainMs)}` : 'no 3-heart chain', pass: !Number.isFinite(bedroomChainMs) || bedroomChainMs >= 3_000, enforced: true },
  { gate: 'An idle player survives the bedroom for at least 25 s', now: `dies at ${seconds(idleSurvivalMs)}`, pass: idleSurvivalMs >= 25_000, enforced: true },
  { gate: 'A player who never shoots survives the bedroom for at least 20 s', now: Number.isFinite(walkerSurvivalMs) ? `dies at ${seconds(walkerSurvivalMs)}` : 'survives', pass: walkerSurvivalMs >= 20_000, enforced: true },
  { gate: 'Every telegraphed threat warns for at least 600 ms', now: `${shortestLead.kind} ${shortestLead.minLeadMs}ms`, pass: shortestLead.minLeadMs >= 600 },
];
console.log('\n## Balance gates (enforced ones fail tests/adventure-bot.test.ts; the rest are targets)\n');
console.log('| Target | Now | Status |');
console.log('|---|---|---|');
for (const gate of pending) console.log(`| ${gate.gate} | ${gate.now} | ${gate.pass ? 'met' : 'not met'}${gate.enforced ? ' (enforced)' : ''} |`);

if (notes.length > 0) {
  console.log('\n## Notes\n');
  for (const note of notes.slice(0, 40)) console.log(`- ${note}`);
}
console.log(`\n_Report computed in ${seconds(Date.now() - started)}._`);
