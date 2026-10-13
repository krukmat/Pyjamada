# Headless QA bot

The adventure runtime is deterministic pure TypeScript, so a bot can play it in
Node without a device. The bot lives in `tests/support/AdventureBot.ts`.

## Commands

```bash
npm run test:all   # includes tests/adventure-bot.test.ts (pass/fail gates)
npm run qa:bot     # prints a Markdown balance report; never fails
```

## What it does

- **Harness** - `stepBotWorld` mirrors the App.tsx exploration orchestration:
  fixed 30 Hz steps, room transitions, first-visit HP recovery, room spawn,
  Laboratory checkpoint retry and ending completion. When App.tsx changes that
  orchestration, update the harness too.
- **Route bot** - explores every visible interaction (memoized per room state),
  walks to the nearest room with something untried, fights the Bathroom twin and
  the Laboratory phases with Dream Sparks, and dodges with a lookahead that sees
  danger `reactionMs` ahead (0 = never dodges).
- **Random bot** - seeded button mashing, started from the route bot's snapshot
  at each room entry.

## Gates (`tests/adventure-bot.test.ts`)

- The route bot (800 ms lookahead) reaches the completed ending with no deaths.
- The no-dodge route bot never softlocks.
- Same start and policy reproduce the same run (determinism).
- 200 random runs (25 per room x 45 s) keep the invariants: HP within
  `0..maxHp`, Wally inside the room bounds and above the floor, failure only at
  0 HP with reason `haunted`, a monotonic exploration clock, and a save that
  decodes and re-encodes identically after transitions and checkpoints.

A stuck or failing run reports the room, Wally's position, HP and the bot's
current goal.

## Limits

The bot does not see the screen: rendering, readability and device performance
still need `npm run screenshots:android` and human playtesting. The Bedroom
domestic run is covered by its own playthrough tests and is not driven by the
bot.
