# Game visual assets

All sprite sheets in this directory are original assets created for Pyjamada's expressive arcade refactor. They use nearest-neighbour rendering and integer logical anchors.

- `wally/wally.png` — Wally locomotion, state and reaction frames.
- `objects/bedroom-objects.png` — six interactive bedroom actors and state variants.
- `fx/domestic-fx.png` — reusable semantic feedback effects.

Atlas coordinates and animation clips live in `src/game/presentation/atlas/manifests.ts`. Gameplay code must never import these files directly.

Binary PNG integrity is part of the repository contract. Validate all production atlases with:

```bash
npm run assets:validate
```

The validator checks PNG chunk CRCs, strict zlib decompression, scanline structure and expected atlas dimensions. Reconstruction history for the Wally atlas is documented in `docs/WALLY_ATLAS_RECONSTRUCTION.md`.
