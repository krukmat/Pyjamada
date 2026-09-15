# Haunted stage language

Haunted Morning uses a stable visual hierarchy so adding enemies does not require re-tuning the whole room.

## Composition contract

`bedroom -> domestic objects -> haunted treatment -> player readability -> enemies -> Wally -> projectiles -> domestic FX -> combat feedback`

This order is intentional. Enemies may be visually strong, but Wally remains the primary persistent actor; Dream Spark and hit feedback get higher transient priority so combat reads immediately.

The executable contract lives in `src/game/render/HauntedStageLanguage.ts` and is rendered by `HauntedStagePresentation.tsx`.

## Value and color roles

- **Environment** — low-contrast, cool indigo treatment. It must never become more saturated than actors.
- **Domestic objects** — retain warmer local color so interaction targets remain understandable.
- **Enemy** — unique saturated palette and silhouette through `EnemyVisualProfile`.
- **Wally** — stable hero priority with a dark backing and restrained warm/cold rim.
- **Projectile** — brightest moving gameplay cue: warm core plus cyan edge/trail.
- **Combat feedback** — highest transient priority; brief yellow/cyan/red impact language.

Enemy pressure may strengthen the cool room wash, but it is capped at the atmosphere alpha budget. More enemies must not progressively darken or tint the room without bound.

## Extension rule

A new enemy should normally require:

1. gameplay state/behavior;
2. atlas + fallback renderer;
3. `EnemyVisualProfile`;
4. registration in `HauntedEnemyLayer`;
5. deterministic lifecycle screenshots.

It should **not** require changing `GameCanvas`, `HauntedStagePresentation`, stage tokens, Wally contrast, or Dream Spark merely to make the new enemy visible. If it does, treat that as a presentation-contract gap first.

## Regression gate

Before accepting a new enemy, verify:

- existing Ghost and Wally screenshots have not visually regressed;
- environment remains below the declared atmosphere budget;
- telegraph/active/hit/death remain readable at Android gameplay scale;
- Wally is distinguishable when enemy silhouettes overlap nearby props;
- projectiles and damage feedback still outrank persistent actors;
- `validateHauntedStageLanguage()` and enemy profile tests remain green.

The target is stable quality through shared composition rules, not identical effects for every enemy.
