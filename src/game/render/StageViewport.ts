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

