# Game visual assets

All sprite sheets in this directory are original assets created for Pyjamada's expressive arcade refactor. They use nearest-neighbour rendering and integer logical anchors.

- `wally/wally.png` — Wally locomotion, state and reaction frames.
- `objects/bedroom-objects.png` — six interactive bedroom actors and state variants.
- `fx/domestic-fx.png` — reusable semantic feedback effects.

Atlas coordinates and animation clips live in `src/game/presentation/atlas/manifests.ts`. Gameplay code must never import these files directly.
