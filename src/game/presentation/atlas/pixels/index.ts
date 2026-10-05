/**
 * Registry of committed pixel-art sources, consumed by
 * `scripts/generate-sprites.mjs` (`npm run sprites:build`).
 *
 * Each entry describes one generated atlas: its output path, the grid it packs
 * into, its palette and its frames in manifest order. The frame order here must
 * match the clip order in `../manifests.ts`, which stays the single source of
 * truth for what each slot means to the game.
 *
 * Phase 1 / step 1 of docs/ARCADE_PIXEL_ART_DIRECTION.md establishes the
 * pipeline; step 4 adds Wally. The bedroom tileset and the six objects
 * (step 5) are not sourced here yet and still ship as their committed PNGs.
 */

export type PixelFrame = {
  readonly id: string;
  readonly rows: readonly string[];
};

export type SpriteSource = {
  /** Repository-relative path of the generated PNG. */
  readonly output: string;
  readonly width: number;
  readonly height: number;
  readonly frameWidth: number;
  readonly frameHeight: number;
  readonly columns: number;
  /** Slot 0 must be 'transparent'; see ArcadePalette.paletteColors. */
  readonly palette: readonly string[];
  readonly frames: readonly PixelFrame[];
};

// Imported after the type declarations because the sprite modules import the
// SpriteSource type from this file.
// eslint-disable-next-line import/first
import { WALLY_SOURCE } from './WallyPixels';

export const SPRITE_SOURCES: readonly SpriteSource[] = [WALLY_SOURCE];
