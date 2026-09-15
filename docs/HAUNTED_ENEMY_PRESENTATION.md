# Haunted enemy presentation contract

Ghost is the reference implementation for Haunted enemies. New enemies should preserve the same readability bar without copying Ghost-specific rendering code.

## Required path

`GameCanvas -> HauntedEnemyLayer -> Enemy renderer -> EnemyPresentation + EnemyVisualProfile`

`GameCanvas` owns scene composition only. Register new enemy families in `HauntedEnemyLayer`; do not add Goblin/Skull-specific rendering branches to `GameCanvas`.

The room-level hierarchy is governed separately by `docs/HAUNTED_STAGE_LANGUAGE.md`. Enemy renderers consume that composition; they do not change its layer order or atmosphere budget to gain contrast.

## Required visual lifecycle

Every enemy must provide readable states for:

1. **Telegraph** — communicates where/what is about to appear before it can hurt Wally.
2. **Active** — silhouette remains distinguishable from Wally and the room at gameplay scale.
3. **Attack/contact** — threat direction is readable without relying on HUD text.
4. **Hit** — successful player action produces immediate feedback.
5. **Dying** — removal is visually distinct from teleport/despawn.

The shared presentation layer owns glow, grounding and telegraph language. The enemy renderer owns atlas frame selection, facing and enemy-specific animation.

## Profiles

- **Ghost** — cyan/yellow, `materialize`, floating presence.
- **Goblin** — green/purple, `ground-spawn`, strong ground contact.
- **Skull** — ivory/orange, `bone-burst`, compact hovering presence.

Profiles live in `src/game/render/EnemyVisualProfile.ts`. Do not duplicate these values in renderers.

## Quality gate for a new enemy

A new enemy is not complete until:

- silhouette is readable without depending only on color;
- telegraph is recognizable before the active frame;
- enemy remains distinct from Wally and background props;
- attack/hit/death are visually unambiguous;
- deterministic screenshot fixtures cover the important lifecycle states;
- asset validation and fallback rendering are present;
- adding the enemy does not require changing `GameCanvas` composition;
- existing Haunted stage hierarchy and atmosphere-budget tests stay green.

Ghost screenshots remain the regression baseline while new enemies are added.
