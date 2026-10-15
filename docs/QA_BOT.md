# Headless QA bot

The adventure runtime is deterministic pure TypeScript, so bots can play it in
Node without a device. The harness lives in `src/game/bot/AdventureBot.ts`,
the human-model policy in `src/game/bot/HumanBot.ts`.

## Commands

```bash
npm run test:all   # includes tests/adventure-bot.test.ts and tests/room-threat-observation.test.ts (gates)
npm run qa:bot     # prints a Markdown balance report (about 15 s); never fails
npm run bot:watch  # narrates one HumanBot run from NEW GAME (optional seed: npm run bot:watch -- myseed)
```

### Filming a real run (video + stills)

`npm run demo:film` needs `adb`, `maestro` and the app installed on a connected
device or emulator (`npm run android`; no test hooks needed). Maestro starts the
DEMO while `adb screenrecord` films the screen in 170 s segments (joined with
`ffmpeg` when available). The App numbers each moment on screen
(`MOMENT 004 · HIT KITCHEN`, see `src/app/DemoFilm.ts`): start, room entry, hit,
down, retry and ending, and Maestro takes one still per new moment. Output:
`artifacts/demo-film/<timestamp>/demo-run.mp4` plus `MOMENT_*.png`.

Unlike `npm run screenshots:android` (fixed, hand-staged scenarios that are
the same every run), the film shows whatever the bot really ran into.

### Watching it play in the app

Main menu -> **DEMO · BOT PLAYS** starts a throwaway run driven by HumanBot,
the same policy as above, fed into the real App loop one fixed step at a time
(`withDemoInput` in `App.tsx`). The demo never writes the save, ignores the
touch deck, presses RETRY / END NIGHT by itself after a short beat, and stops
with BACK TO MENU. The bots live in `src/game/bot/` for that reason.

## What the player can see: `observeRoomThreats`

`src/game/adventure/RoomThreatObservation.ts` turns every live exploration
hazard into floor zones, built only from the hazards' own resolve/snapshot
functions and hit widths:

- `danger`: Wally standing in `minX..maxX` is hit right now (only when grounded
  if `jumpable`, i.e. the Kitchen surge and Living Room static fronts).
- `warning`: the zone is telegraphed (static wave from its telegraph to the end of
  the swing, plus the bob's own spot while it drops so the starting end is
  visible; charged floor-wave path; crate shadow and fall; basement telegraph;
  Laboratory lane and attack telegraphs).

`tests/room-threat-observation.test.ts` proves that a danger zone contains a
point exactly when the hazard's hit test hits it, and that every point of a
telegraphed threat is inside a warning of the same threat before it turns
dangerous (the Bathroom reflection has no telegraph; its zone is the mirror
contact band 60..68). Every bot run also checks that each exploration hit
happened inside an observed danger zone. The renderer is meant to draw these
same zones.

## The bots

- **Harness** - `stepBotWorld` mirrors App.tsx: the haunted bedroom run
  (`stepHauntedSession`) and its false escape, fixed 30 Hz exploration steps,
  room transitions, first-visit HP recovery, room spawn, room and Laboratory
  checkpoint retry and ending completion. `createBotNewGame` starts exactly like NEW GAME;
  `createBotStart` starts at the false escape. Known differences from App: the
  bot retries at once (App waits for RETRY ROOM / RETRY PHASE), App's room
  fades pause the simulation for 370 ms, and App checks transitions after a
  batch of up to 5 steps while the bot checks after every step. When App.tsx
  changes that orchestration, update the harness too.
- **HumanBot** - the human model used for balance:
  - sees threats only through `observeRoomThreats` (rooms) and the ghost sprites
    (haunted bedroom), 250 ms late (rounded up to 8 steps = 267 ms); the
    Resonator's control-swapping zone is seen with the same delay;
  - every input lands 100 ms (3 steps) after the decision;
  - one thumb: a step never combines a held direction with JUMP, ATTACK or
    INTERACT, and taps at most one button; ATTACK repeats every 200-350 ms.
    Since W1-5 the deck is multi-touch (`src/app/TouchControlZones.ts`), so
    this is stricter than a real two-thumb player;
  - reads for 1.2 s after using an object;
  - dodges by stepping out of warning/danger zones toward the nearer safe side
    (never through a visible danger or the spot a threat starts from), jumps
    floor waves when their seen edge is under 0.75 s away (counting its own
    motion), waits outside a zone instead of walking into it, and shoots ghosts
    in the bedroom;
  - fires from one fixed spot per target, outside every lane it has seen in the
    current phase and with no other target in the line of fire; it only moves
    when the target changes or a seen zone covers the spot. Own position, facing
    and object/target positions are read directly (players predict Wally's own
    motion); reaction time applies to threats.
- **Reader probe** - HumanBot that never dodges while reading (`threatResponse:
  'not-while-reading'`): measures whether reading spots are safe.
- **No-dodge walker** - HumanBot that never reacts to threats (`'never'`); in
  the bedroom it never shoots ghosts.
- **Ghost hugger** - walks into the nearest Ghost that can hurt and never
  shoots: the worst case for contact damage in the bedroom.
- **Idle** - does nothing: how long a player who only reads the screen survives.
- **Route bot (oracle)** - explores every visible interaction and dodges with a
  lookahead that simulates the runtime `reactionMs` ahead. It sees danger before
  it is drawn, so it is **not a human scale**; it supplies the room-entry
  snapshots and the fuzz starting points. It keeps one firing spot per target
  (the old nearest-spot recomputation made it oscillate between two spots in the
  Laboratory without ever firing).
- **Random bot** - seeded button mashing for invariant fuzzing.

"Hits at objects" counts hits taken while Wally stands still at a usable object
or while the policy is reading (including the 367 ms it takes to look up).

## `npm run qa:bot` report

- **First minute** - haunted bedroom from a new game, 3 seeds x 11 start delays
  (0-2 s): escape/death rate and reason, hits, first hit, fastest 3-heart contact
  chain, HUD time left; plus the ghost hugger and the idle player.
- **Rooms in isolation** - each room entered at full HP from the oracle's
  first-entry snapshot, 11 entry delays (0-2 s in 200 ms steps), for HumanBot,
  the reader probe and the no-dodge walker: mean/max hits, death %, hits at
  objects. The Laboratory restarts from its checkpoint (counted as a death).
- **Whole game** - one pass from a new game per policy; a death in the house
  retries the room from its entry (RETRY ROOM, W1-4), and the oracle for reference.
- **Shortest visible warning** per telegraphed threat.
- **Random fuzz** from each room entry.
- **Pending balance gates** - the targets below with their current value.

## Gates (`tests/adventure-bot.test.ts`)

- The oracle route bot (800 ms lookahead) reaches the completed ending with no
  deaths; the no-dodge oracle never softlocks.
- 200 random runs (25 per room x 45 s) keep the invariants: HP within
  `0..maxHp`, Wally inside the room bounds and above the floor, failure only at
  0 HP with reason `haunted` in exploration (the bedroom run may also fail by
  noise, energy or deadline), a monotonic game clock, every exploration hit
  inside an observed danger zone, and a save that decodes and re-encodes
  identically after the false escape, transitions and checkpoints.
- HumanBot keeps to one thumb, emits nothing before its input latency, and
  reacts to a warning no sooner than reaction time plus latency.
- HumanBot, the reader probe and the no-dodge walker never softlock from any
  room entry (3 entry delays each) and keep every invariant.
- The haunted bedroom is played for real: HumanBot escapes it from a new game
  (2 seeds x 3 delays) and lands on the App's false escape; every policy keeps
  the invariants.
- The haunted bedroom is survivable (W1-2), on 3 seeds: the ghost hugger (walks
  into the nearest Ghost, never shoots) cannot lose three hearts in under 3 s, an
  idle player survives at least 25 s, and a player who never shoots survives at
  least 20 s (3 start delays).
- Room threats are fair (W1-3), from every room entry at full HP and 3 start
  delays: HumanBot never dies and takes at most one hit, and the reader probe
  takes no hit while standing at an object to read it.
- HumanBot plays from a new game without softlocks, deterministically.

A stuck or failing run reports the room, Wally's position, HP and the bot's
current intent and goal.

## Balance gates

These are the targets for retuning. They fail on the current tuning, so they are
documented and reported by `npm run qa:bot`, not enforced. Promote each one into
`tests/adventure-bot.test.ts` once the retune that meets it lands. The three
bedroom gates met by W1-2 are enforced (see Gates) and still reported. W1-2 also
raised the shared post-hit invulnerability from 900 to 1500 ms, which every room
hazard uses, so room hits after W1-2 can be lower than the column below.

| Target | Value before W1-2 |
|---|---|
| ~~HumanBot never dies in a single room entered at full HP~~ | dies in the Laboratory in 3 of 11 entries; enforced since W1-3 |
| ~~HumanBot takes at most 1 hit per room visit~~ | up to 3 hits in the Laboratory (1 in every kitchen visit); enforced since W1-3 |
| ~~Reader probe takes 0 hits at objects (reading spots are safe)~~ | hit at the hallway clock, kitchen microwave, attic clues and basement terminal; dies in every basement visit; enforced since W1-3 |
| No-dodge walker never dies in a room entered at full HP | dies in the Laboratory in 1 of 11 entries; still 1 of 11 after W1-3 (open: the final fight may punish a player who never dodges) |
| ~~A ghost contact costs one heart (no 3-heart chain under 3 s)~~ | 1.8 s chain; enforced since W1-2 (8.3 s) |
| ~~An idle player survives the haunted bedroom for at least 25 s~~ | 18.0 s; enforced since W1-2 (30.9 s) |
| ~~A player who never shoots survives the bedroom for at least 20 s~~ | 7.3 s; enforced since W1-2 (survives) |
| Every telegraphed threat warns for at least 600 ms | Resonator lanes 300 ms, nightmare attacks 400 ms; met since W1-3 (shortest 600 ms), reported only |

## Limits

The bots do not see the screen: rendering, readability, touch handling and
device performance still need `npm run screenshots:android` and human
playtesting. HumanBot is a model, not a person: it knows every object's
position, retries every visible object after each state change, and does not
learn hazard rhythms, so it measures reaction-based play rather than
discoverability or mastery.
