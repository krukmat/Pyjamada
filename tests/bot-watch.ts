// `npm run bot:watch [seed]`: narrates one HumanBot run from NEW GAME, the
// same policy the in-app DEMO uses. One line per decision change.
import { createBotNewGame, runBot, type BotAction, type BotPolicy, type BotWorld } from '../src/game/bot/AdventureBot';
import { HumanBot } from '../src/game/bot/HumanBot';

const seed = process.argv[2] ?? 'watch';

class Narrator implements BotPolicy {
  private last = '';
  private room = '';
  private hp = -1;
  constructor(private readonly inner: HumanBot) {}
  act(world: BotWorld): BotAction {
    const action = this.inner.act(world);
    const t = `${(world.session.elapsedMs / 1000).toFixed(1).padStart(6)}s`;
    const { adventure, session } = world;
    if (adventure.currentRoom !== this.room) { this.room = adventure.currentRoom; console.log(`${t}  == ${this.room.toUpperCase()} ==`); }
    if (this.hp >= 0 && session.combat.hp < this.hp) console.log(`${t}  !! hit, hearts ${session.combat.hp}/${session.combat.maxHp}`);
    this.hp = session.combat.hp;
    const what = this.inner.describe().replace(/; goal=.*/, '').replace(/ghost@\d+/, 'ghost');
    if (what !== this.last) { this.last = what; console.log(`${t}  x=${session.player.x.toFixed(0).padStart(3)}  ${what}`); }
    return action;
  }
  describe() { return this.inner.describe(); }
  hasGoal() { return this.inner.hasGoal?.() ?? true; }
  isReading() { return this.inner.isReading?.() ?? false; }
}

const result = runBot(createBotNewGame(seed), new Narrator(new HumanBot({ seed })), { maxGameMs: 20 * 60_000, stallMs: 120_000 });
console.log(`\n${result.outcome}: ${(result.gameTimeMs / 1000).toFixed(1)}s, ${result.hits} hits, ${result.deaths} retries (${result.diagnostic})`);
