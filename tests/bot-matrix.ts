// `npm run bot:matrix [-- --level 1|2|3] [--player casual|average|expert|perfect] [--seeds a,b]`:
// plays the adventure (from the false escape) for every chosen player on
// every chosen level and prints one row per run: outcome, time, hits and
// knock-outs, and hits/knock-outs per room. "perfect" is RouteBot(800),
// which sees danger 800 ms ahead; the others are the HumanBot profiles.
import { createBotStart, RouteBot, runBot, type BotRunResult } from '../src/game/bot/AdventureBot';
import { HumanBot } from '../src/game/bot/HumanBot';
import { HUMAN_PROFILE_IDS, HUMAN_PROFILES, type HumanProfileId } from '../src/game/bot/HumanProfiles';
import { ADVENTURE_DIFFICULTIES, isAdventureDifficulty, type AdventureDifficulty } from '../src/game/adventure/AdventureDifficulty';

type Player = HumanProfileId | 'perfect';
const PLAYERS: readonly Player[] = [...HUMAN_PROFILE_IDS, 'perfect'];

function option(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const levelArg = option('level');
const levels: readonly AdventureDifficulty[] = levelArg === undefined ? ADVENTURE_DIFFICULTIES
  : isAdventureDifficulty(Number(levelArg)) ? [Number(levelArg) as AdventureDifficulty] : fail('--level must be 1, 2 or 3');
const playerArg = option('player');
const players: readonly Player[] = playerArg === undefined ? PLAYERS
  : (PLAYERS as readonly string[]).includes(playerArg) ? [playerArg as Player] : fail(`--player must be one of ${PLAYERS.join(', ')}`);
const seeds = (option('seeds') ?? 'demo,a').split(',').filter(Boolean);

const OPTIONS = { maxGameMs: 20 * 60_000, stallMs: 180_000 };

function play(level: AdventureDifficulty, player: Player, seed: string): BotRunResult {
  const start = createBotStart('qa-bot-route');
  const world = { ...start, adventure: { ...start.adventure, difficulty: level } };
  return runBot(world, player === 'perfect' ? new RouteBot(800) : new HumanBot({ ...HUMAN_PROFILES[player], seed }), OPTIONS);
}

console.log('| Level | Player | Seed | Outcome | Time | Hits | Knock-outs | Per room (hits/knock-outs) |');
console.log('|---|---|---|---|---|---|---|---|');
for (const level of levels) {
  for (const player of players) {
    // RouteBot is deterministic: one run says it all.
    for (const seed of player === 'perfect' ? ['-'] : seeds) {
      const result = play(level, player, seed);
      const rooms = Object.entries(result.rooms)
        .filter(([, stats]) => stats.hits > 0 || stats.deaths > 0)
        .map(([room, stats]) => `${room} ${stats.hits}${stats.deaths ? `/${stats.deaths}` : ''}`)
        .join(', ');
      console.log(`| ${level} | ${player} | ${seed} | ${result.outcome} | ${Math.round(result.gameTimeMs / 1000)}s | ${result.hits} | ${result.deaths} | ${rooms || '-'} |`);
    }
  }
}
