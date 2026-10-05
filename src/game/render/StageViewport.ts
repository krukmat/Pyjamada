import { LOGICAL_SIZE } from '../core/World';

export const STAGE_LOGICAL_WIDTH = 168;
export const STAGE_LOGICAL_HEIGHT = LOGICAL_SIZE;
export const STAGE_SIDE_MARGIN = (STAGE_LOGICAL_WIDTH - LOGICAL_SIZE) / 2;

export type StageDimensions = {
  width: number;
  height: number;
  scale: number;
};

/**
 * Phase 1 / step 3 of docs/ARCADE_PIXEL_ART_DIRECTION.md.
 *
 * One logical pixel must cover an integer number of screen pixels, identically
 * for sprites, tiles and any remaining primitive. Fractional scaling is what
 * separates crisp arcade art from a blurred approximation of it: at a scale
 * like 2.34 a sprite row lands on a screen-pixel boundary in some frames and
 * between two in others, which is the shimmer visible while Wally walks.
 *
 * The scale is therefore floored to a whole number rather than fitted exactly
 * to the screen. The leftover width is dead space the caller centres, which is
 * the correct trade: a slightly smaller stage that stays sharp beats a
 * perfectly fitted one that crawls.
 */
export const MIN_STAGE_SCALE = 1;
export const MAX_STAGE_SCALE = 4;
export const STAGE_HORIZONTAL_INSET = 24;

export function integerStageScaleForScreenWidth(screenWidth: number): number {
  if (!Number.isFinite(screenWidth)) return MIN_STAGE_SCALE;
  const availableWidth = Math.max(STAGE_LOGICAL_WIDTH, Math.floor(screenWidth - STAGE_HORIZONTAL_INSET));
  const fitted = Math.floor(availableWidth / STAGE_LOGICAL_WIDTH);
  return Math.max(MIN_STAGE_SCALE, Math.min(MAX_STAGE_SCALE, fitted));
}

export function stageDimensionsForScreenWidth(screenWidth: number): StageDimensions {
  const scale = integerStageScaleForScreenWidth(screenWidth);
  return {
    width: STAGE_LOGICAL_WIDTH * scale,
    height: STAGE_LOGICAL_HEIGHT * scale,
    scale,
  };
}

export function stageScale(pixelSize: number): number {
  return pixelSize / LOGICAL_SIZE;
}

export function stagePx(pixelSize: number, logicalValue: number): number {
  return Math.round(logicalValue * stageScale(pixelSize));
}

export function stageOriginX(pixelWidth: number, pixelHeight: number): number {
  return Math.round((pixelWidth - LOGICAL_SIZE * stageScale(pixelHeight)) / 2);
}

export function stageParallaxPx(pixelSize: number, playerX: number, maxLogicalOffset: number): number {
  const center = LOGICAL_SIZE / 2;
  const travel = Math.max(-1, Math.min(1, (playerX - center) / center));
  return stagePx(pixelSize, travel * maxLogicalOffset);
}

export function stageCameraOffsetPx(
  pixelHeight: number,
  playerX: number,
  facing: 'left' | 'right',
): number {
  const center = LOGICAL_SIZE / 2;
  const positionBias = Math.max(-1, Math.min(1, (playerX - center) / 48)) * 4;
  const lookAhead = facing === 'right' ? 1 : -1;
  const logicalOffset = Math.max(-6, Math.min(6, -(positionBias + lookAhead)));
  return stagePx(pixelHeight, logicalOffset);
}
