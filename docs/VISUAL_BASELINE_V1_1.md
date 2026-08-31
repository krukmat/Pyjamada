# V1.1 — Visual Baseline

## Purpose

V1.1 changes presentation, not game scope. CU-01, CU-02, CU-03, CU-05 and CU-06 keep their existing semantics.

The target is not a modern mobile reinterpretation. The target is a deliberately constrained retro presentation that inherits the strongest visual principles of early room-based home-computer adventures without copying protected Pyjamarama sprites or room artwork.

## Visual rules

1. **Black/near-black negative space is intentional.** Rooms should read as composed stages rather than full-screen wallpaper.
2. **Every room must be identifiable at a glance.** Large furniture silhouettes carry more value than decorative noise.
3. **Limited saturated palette.** Cyan, magenta, yellow, green, red and blue are used in strong blocks with very little shading.
4. **Pixel-grid discipline.** Geometry is authored in the 128×128 logical coordinate system and scaled without smoothing.
5. **Recognisable player silhouette.** The temporary player is a small original pajama character, not a rectangle and not a copy of Wally Week.
6. **Objects communicate function.** Key, locked door, open door, bed, stairs and furniture must be visually distinguishable without labels.
7. **HUD belongs to the game frame.** Life/energy/pocket information uses the same palette and border language as the room.
8. **Mobile chrome stays subordinate.** Touch controls remain readable but visually secondary to the game viewport.

## Restrained polish addendum (v0.8.0)

The UI/UX pass keeps all eight rules above authoritative and adds a small systematic vocabulary rather than a new art direction:

- every major object may use **one explicit darker shade token** for edge/depth separation;
- contact shadows are allowed as small pixel-grid layers under the hero or furniture;
- collectible emphasis may use a restrained two-layer halo; the key retains its gameplay anchor and now uses a clearer ring + shaft + teeth silhouette;
- backgrounds may use a few low-contrast atmosphere blocks (stars/moonbeam) and sparse floor dither, never enough to compete with interactive silhouettes;
- raised mobile controls use hard pixel shadows and a translated pressed state;
- the same palette, shade tokens, key primitive and shadow vocabulary apply to both Classic and the Systemic Prototype.

No gameplay hitbox, persistence contract, room transition, objective or systemic rule is changed by this polish pass.

## Room composition

### room-01 — Bedroom

- bed and bedside furniture on the left;
- window / wall decoration in the upper field;
- wardrobe or cabinet to create a strong central mass;
- progression door on the right;
- collectible key remains in the same logical gameplay position.

### room-02 — Hall

- staircase silhouette as the dominant object;
- framed picture / wall feature;
- side furniture and doorway framing;
- open traversal from left to right.

### room-03 — Landing

- clock/table/window composition;
- stronger magenta/red identity;
- visible continuation door / architectural frame;
- arrival should read as completion of the V1 slice.

## HUD

The V1.1 HUD uses three compact groups:

- `LIFE` — three presentation-only icons;
- `DREAM` — a numeric readout plus compact meter (presentation only until a future approved gameplay CU exists);
- `POCKET` — derived from the real current inventory (`KEY` or `EMPTY`) with a small pixel key glyph when carried.

Presentation-only indicators must not create hidden gameplay semantics.

## Exit criteria

A screenshot of each of the three rooms should look like an intentional retro game screen rather than a renderer/debug harness. Classic and Systemic should read as the same product family. The game core, persistence, settings and CU behavior must remain unchanged.
