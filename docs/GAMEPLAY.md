# Gameplay Contract

## Product direction

Pyjamada has one active gameplay model: a systemic bedroom run. The previous Classic V1 three-room slice and the separate "Systemic Prototype" product mode were removed during the v0.9 consolidation.

## Goal

Get Wally dressed and collect the keys before the run fails.

## Inputs

- move left
- move right
- action

## Run resources

- **Time** — logical/action-based, not real-time.
- **Energy** — 0..100.
- **Noise** — 0..100.
- **Wally state** — sleepy, normal, rushed or startled.

## Objects

Exactly six objects define the current room:

1. bed
2. slippers
3. alarm clock
4. wardrobe
5. keys
6. window

Object definitions provide position, interaction radius, base effects and commands. The runtime applies reusable rules after the base effect.

## Rules

The active rule engine has ten deterministic ordered rules:

- sleepy action tax
- slippers quiet step
- bed wakes Wally
- alarm wakes Wally
- repeated alarm startle
- open-window echo
- rushed threshold
- startled fumble
- rushed wardrobe scramble
- high-noise startle

## Outcomes

Success requires:

- `dressed === true`
- keys collected

Failure occurs when:

- noise reaches the house-awake threshold;
- energy reaches zero;
- time exceeds the deadline.

The same room must support efficient, near-miss and chaos runs without random behavior.

## Room bosses

Solving the Hallway, Living Room or Kitchen puzzle wakes that room's boss, which seals the way forward until Dream Sparks dispel it (`src/game/adventure/RoomBossHazard.ts`). Each round opens with a harmless 3 s rise, then one shielded attack cycle (it shows its pattern and blocks Dream Sparks, but still hurts) and three vulnerable ones that take one wound each: after a wound the shield is back until the next cycle, so a fight lasts several attacks (missed cycles can be caught up). Bosses are drawn at 1.5x the pixel size (Wally at 0.8x his atlas size), with a health bar across the top of the room, a white flash and a jolt on each wound, and a burst when dispelled:

- Hallway, **Dust Moth** (3 hits): flutters across the room, leaning toward Wally; after a wound it reaches the doorway too, so keep moving.
- Living Room, **Static Wraith** (3 hits): blinks between three spots and, once solid, drifts toward Wally (never onto the television); hittable only once solid.
- Kitchen, **Giant Roach** (3 hits): waits at a wall, then charges along the floor; jump it when it twitches if you stand near that wall.

Every wound makes a boss meaner: the Moth leans harder, the Wraith warns for 75 ms less and drifts further, the Roach holds longer and dashes 150 ms faster. Wally's position only bends the pattern (nothing extra is stored), so a boss never teleports when he moves.

The Hallway clock is a cuckoo clock. Once the Moth is dispelled its bird bursts out as a mini boss (**Cuckoo**, 2 hits) and keeps the door sealed: it calls from the clock door (harmless), dives toward a landing spot bent toward Wally, hops after him pecking (the only time it can be hit), then flies home and hides. Each attack can cost at most one heart. The old phantom pendulum is gone.

Difficulty climbs room by room. Dispelling any boss refills one heart (one per boss, so the Hallway gives two). The Wraith's drift and the Roach's twitch grow meaner per wound (the Wraith never reaches the Hallway door Wally wakes at), and Vesper's nightmare is the final wall: each landed spark shortens its warning and widens its attacks, and every strike costs two hearts, so a first attempt usually ends in a knock-out and a retry from the phase checkpoint, which keeps every landed spark. A bot that sees danger 800 ms ahead still finishes without dying.

NEW GAME offers three levels, saved with the run (older saves load as level 1). Every level keeps the same rooms, threats and bosses; higher ones raise the floor:

- **Level 1, RESTLESS:** the base pattern, with unlimited knock-outs.
- **Level 2, HAUNTED:** no warning lasts longer than 420 ms (boss telegraphs, the Cuckoo's call, Vesper's warning, attic shadows, basement telegraphs). Bosses lean 20% harder toward Wally and the Roach charges 15% faster.
- **Level 3, NIGHT TERROR:** warnings last at most 300 ms, bosses lean 40% harder and the Roach charges 40% faster. The Cuckoo picks its landing spot as it calls (where Wally stands then), marks it, and hurts only on landing: a quick step aside dodges it. The run has four lives; the fourth knock-out ends it.

A knock-out restarts the boss's round and keeps its wounds. A spark that meets a shielded attack repels it, once per round. The levels are measured with three HumanBot profiles (casual, average, expert; `tests/adventure-difficulty.test.ts`):

- On level 1, everyone finishes with at most one knock-out.
- On level 2, the casual player loses a few lives.
- On level 3, the casual player runs out of lives around the Kitchen, the average player finishes after a couple of knock-outs, and the expert loses at most one life.

The DEMO bot (human model) ignores which object was looked at last (`*-focused` switches) when deciding what to re-read, and takes a newly opened exit to an unvisited room once it has read everything in the current one.

## Screen

The game is played in landscape: the stage sits between two side columns (menu, objective and the movement pad on one side; USE prompt and JUMP/ATTACK/USE on the other). Rooms are drawn 1.75x wider than the 128-unit gameplay world (`ROOM_SPREAD` / `spreadX` in `src/game/render/StageViewport.ts`): every world x position is spread while sprites and furniture keep their size. This is presentation only; gameplay, collisions and saves stay in world units. The painted bedroom scene is stretched instead.

## Persistence

The game uses one save domain:

`pyjamada:game:v1:run`

Old Classic and prototype save keys are intentionally not migrated. This repository is an experiment without a deployed user save base; compatibility code would add cost without product value.

## Presentation

The restrained retro UI is the active visual language. The HUD exposes Time, Energy, Noise and Wally state. Feedback after actions should make cause/effect visible without turning the game into a spreadsheet.

## Expansion gate

Do not add additional rooms, progression systems or monetization merely because the implementation can support them. Expand only after human playtesting shows:

- quick objective comprehension;
- understandable cause/effect;
- at least one unexpected-but-logical consequence;
- voluntary retry or an explicit next hypothesis.
