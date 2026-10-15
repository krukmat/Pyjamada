import { LOGICAL_SIZE } from '../core/World';

export const STAGE_LOGICAL_WIDTH = 168;
export const STAGE_LOGICAL_HEIGHT = LOGICAL_SIZE;
export const STAGE_SIDE_MARGIN = (STAGE_LOGICAL_WIDTH - LOGICAL_SIZE) / 2;

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
 * leaving `minSideColumn` on each side for the controls. The 128-unit room
 * always fits; leftover width shows the decorative side margins.
 * `chrome` is the space the cabinet frame and paddings take on each axis.
 */
export function stageDimensionsForLandscape(
  screenWidth: number,
  screenHeight: number,
  minSideColumn: number,
  chrome: number,
): StageDimensions {
  const availableWidth = Math.max(LOGICAL_SIZE, screenWidth - 2 * minSideColumn - chrome);
  const availableHeight = Math.max(STAGE_LOGICAL_HEIGHT, screenHeight - chrome);
  const fit = Math.min(availableWidth / LOGICAL_SIZE, availableHeight / STAGE_LOGICAL_HEIGHT);
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
  return Math.round((pixelWidth - LOGICAL_SIZE * stageScale(pixelHeight)) / 2);
}

export function stageParallaxPx(pixelSize: number, playerX: number, maxLogicalOffset: number): number {
  const center = LOGICAL_SIZE / 2;
  const travel = Math.max(-1, Math.min(1, (playerX - center) / center));
  return stagePx(pixelSize, travel * maxLogicalOffset);
}

