import { LOGICAL_SIZE } from '../core/World';

/**
 * Rooms are drawn wider than the gameplay world: every world x position is
 * spread by ROOM_SPREAD (spreadX) while sprites and furniture keep their size,
 * so Wally and the bosses stand in rooms 1.75x as wide. Presentation only:
 * gameplay, collisions and saves stay in the 128-unit world.
 */
export const ROOM_SPREAD = 1.75;
export const ROOM_VIEW_WIDTH = LOGICAL_SIZE * ROOM_SPREAD;
export function spreadX(worldX: number): number {
  return worldX * ROOM_SPREAD;
}

export const STAGE_SIDE_MARGIN = 12;
export const STAGE_LOGICAL_WIDTH = ROOM_VIEW_WIDTH + 2 * STAGE_SIDE_MARGIN;
export const STAGE_LOGICAL_HEIGHT = LOGICAL_SIZE;

export type StageDimensions = {
  width: number;
  height: number;
  scale: number;
};

export function stageDimensionsForScreenWidth(screenWidth: number): StageDimensions {
  const availableWidth = Math.max(STAGE_LOGICAL_WIDTH, Math.floor(screenWidth - 24));
  const desiredScale = Math.max(1, Math.min(2.5, availableWidth / STAGE_LOGICAL_WIDTH));
  const height = Math.floor(STAGE_LOGICAL_HEIGHT * desiredScale);
  const scale = height / STAGE_LOGICAL_HEIGHT;
  return {
    width: Math.floor(STAGE_LOGICAL_WIDTH * scale),
    height,
    scale,
  };
}

/**
 * Stage for the landscape game screen: as tall as the screen allows while
 * leaving `minSideColumn` on each side for the controls. The spread room
 * (ROOM_VIEW_WIDTH) always fits; leftover width shows the side margins.
 * `chrome` is the space the cabinet frame and paddings take on each axis.
 */
export function stageDimensionsForLandscape(
  screenWidth: number,
  screenHeight: number,
  minSideColumn: number,
  chrome: number,
): StageDimensions {
  const availableWidth = Math.max(ROOM_VIEW_WIDTH, screenWidth - 2 * minSideColumn - chrome);
  const availableHeight = Math.max(STAGE_LOGICAL_HEIGHT, screenHeight - chrome);
  const fit = Math.min(availableWidth / ROOM_VIEW_WIDTH, availableHeight / STAGE_LOGICAL_HEIGHT);
  const height = Math.floor(STAGE_LOGICAL_HEIGHT * fit);
  const scale = height / STAGE_LOGICAL_HEIGHT;
  return {
    width: Math.min(Math.floor(availableWidth), Math.floor(STAGE_LOGICAL_WIDTH * scale)),
    height,
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
  return Math.round((pixelWidth - ROOM_VIEW_WIDTH * stageScale(pixelHeight)) / 2);
}

export function stageParallaxPx(pixelSize: number, playerX: number, maxLogicalOffset: number): number {
  const center = LOGICAL_SIZE / 2; // world units
  const travel = Math.max(-1, Math.min(1, (playerX - center) / center));
  return stagePx(pixelSize, travel * maxLogicalOffset);
}


/** Positions from `start` every `step` units across the whole spread room (repeating wall and floor details). */
export function acrossRoom(start: number, step: number): number[] {
  const positions: number[] = [];
  for (let x = start; x < ROOM_VIEW_WIDTH; x += step) positions.push(x);
  return positions;
}
