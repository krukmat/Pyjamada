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
